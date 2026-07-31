import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardService, type DashboardData, type DashboardStats, type TimelineEvent } from '../services/dashboard.service';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuthStore } from '../stores/auth.store';
import { Calendar, CheckCircle2, Receipt, AlertCircle, MessageSquare, Mail, MoreHorizontal } from 'lucide-react';

export const useDashboardStats = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['dashboard', startDate, endDate],
    queryFn: () => DashboardService.getDashboardData(startDate, endDate),
    staleTime: 60 * 1000, // Cache for 1 minute
  });
};

const getEventConfig = (type: string) => {
  switch (type) {
    case 'NEW_BOOKING': return { icon: Calendar, color: "var(--color-info)" };
    case 'BOOKING_CONFIRMED': return { icon: CheckCircle2, color: "var(--color-success)" };
    case 'BOOKING_COMPLETED': return { icon: Receipt, color: "var(--color-primary)" };
    case 'BOOKING_CANCELLED': return { icon: AlertCircle, color: "var(--color-danger)" };
    case 'NEW_COMMENT': return { icon: MessageSquare, color: "var(--color-accent)" };
    case 'NEW_INBOX_MESSAGE': return { icon: Mail, color: "var(--color-warning)" };
    default: return { icon: MoreHorizontal, color: "var(--color-text-muted)" };
  }
};

const getStatusConfig = (status: string, d: any) => {
  switch (status) {
    case 'pending': 
      return { text: d.status?.pending || "Pending", classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
    case 'in_progress': 
      return { text: d.status?.in_progress || "Confirmed", classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
    case 'completed': 
      return { text: d.status?.completed || "Completed", classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
    case 'cancelled': 
      return { text: d.status?.cancelled || "Cancelled", classes: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" };
    case 'approved': 
      return { text: d.status?.approved || "Approved", classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
    case 'rejected': 
      return { text: d.status?.rejected || "Rejected", classes: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" };
    case 'unread': 
      return { text: d.status?.unread || "Unread", classes: "bg-primary/10 text-primary border-primary/20" };
    case 'read': 
      return { text: d.status?.read || "Read", classes: "bg-surface-subtle text-text-subtle border-border-default/40" };
    case 'spam': 
      return { text: d.status?.spam || "Spam", classes: "bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/20" };
    case 'converted':
      return { text: d.status?.converted || "Converted", classes: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
    case 'profile_created':
      return { text: d.status?.profile_created || "Profile Created", classes: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" };
    default: 
      return { text: d.status?.[status] || status, classes: "bg-surface-subtle text-text-muted border-border-subtle" };
  }
};

export function useDashboardPage() {
  const { t, locale } = useTranslation();
  const d = t.dashboard || {};
  const user = useAuthStore((state) => state.user);
  const isRtl = locale === "ar";

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [period, setPeriod] = useState<"day" | "week" | "month" | "custom">("day");
  
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sync date range based on quick period selection
  useEffect(() => {
    if (period === "custom") return;
    
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    
    if (period === "day") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (period === "week") {
      const prevWeek = new Date();
      prevWeek.setDate(today.getDate() - 6);
      setStartDate(prevWeek.toISOString().substring(0, 10));
      setEndDate(todayStr);
    } else if (period === "month") {
      const prevMonth = new Date();
      prevMonth.setDate(today.getDate() - 29);
      setStartDate(prevMonth.toISOString().substring(0, 10));
      setEndDate(todayStr);
    }
  }, [period]);

  const { data, isLoading } = useDashboardStats(startDate, endDate);

  // Sync React Query data to local state for infinite scroll
  useEffect(() => {
    if (data) {
      setTimelineEvents(data.timeline || []);
      setHasMore(data.hasMore || false);
      setPage(1);
    }
  }, [data]);

  const loadMoreEvents = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await DashboardService.getDashboardData(startDate, endDate, nextPage, 20);
      const newEvents = response.timeline || [];
      
      setTimelineEvents(prev => {
        const existingIds = new Set(prev.map(e => `${e.id}-${e.type}-${e.timestamp}`));
        const filteredNew = newEvents.filter(e => !existingIds.has(`${e.id}-${e.type}-${e.timestamp}`));
        return [...prev, ...filteredNew];
      });
      
      setHasMore(response.hasMore || false);
      setPage(nextPage);
    } catch (err) {
      console.error("Failed to load more timeline events", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, startDate, endDate]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isNearBottom) {
      loadMoreEvents();
    }
  }, [loadMoreEvents]);

  return {
    t, locale, d, user, isRtl,
    startDate, setStartDate, endDate, setEndDate, period, setPeriod,
    timelineEvents, page, hasMore, loadingMore, loadMoreEvents, handleScroll,
    data, isLoading,
    getEventConfig, getStatusConfig
  };
}
