"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDashboardPage } from "@/lib/hooks/useDashboard";
import { Input } from "@/components/ui/input";
import {
  Users,
  Receipt,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Loader2,
  DollarSign,
  Calendar,
  MessageSquare,
  Mail,
  Activity,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { localizeNumber } from "@/lib/utils";

/* ─── Stat Card ──────────────────────────────────────────── */
interface StatCardProps {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

function StatCard({ icon: Icon, label, value, color, trend }: StatCardProps) {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 [html[data-theme=light]_&]:bg-white relative overflow-hidden min-w-0">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-xl sm:text-2xl font-bold text-foreground overflow-hidden text-ellipsis whitespace-nowrap">{value}</span>
          {trend && (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
              trend.isPositive 
                ? "bg-success/15 text-success" 
                : "bg-destructive/15 text-destructive"
            }`}>
              {trend.isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {trend.value}
            </span>
          )}
        </div>
        <span className="text-[10px] sm:text-xs font-medium text-text-muted mt-0.5 leading-tight">{label}</span>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const {
    t, locale, d, user, isRtl,
    startDate, setStartDate, endDate, setEndDate, period, setPeriod,
    timelineEvents, page, hasMore, loadingMore, loadMoreEvents, handleScroll,
    data, isLoading,
    getEventConfig, getStatusConfig
  } = useDashboardPage();

  // Build translated stat cards dynamically with dynamic relative period trends
  const statsList = [
    {
      id: "revenue",
      label: d.stats?.totalRevenue || "Total Revenue",
      value: data?.stats ? localizeNumber(data.stats.totalRevenue.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US'), locale) : "-",
      icon: DollarSign,
      color: "bg-primary/10 text-primary border-primary/30",
      trend: data?.stats ? {
        value: `${data.stats.revenueDiffPercent >= 0 ? "+" : ""}${localizeNumber(data.stats.revenueDiffPercent, locale)}%`,
        isPositive: data.stats.revenueDiffPercent >= 0
      } : undefined
    },
    {
      id: "bookings",
      label: d.stats?.bookingsCount || "Bookings Period",
      value: data?.stats ? localizeNumber(data.stats.bookingsCount.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US'), locale) : "-",
      icon: Calendar,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      trend: data?.stats ? {
        value: `${data.stats.bookingsDiffPercent >= 0 ? "+" : ""}${localizeNumber(data.stats.bookingsDiffPercent, locale)}%`,
        isPositive: data.stats.bookingsDiffPercent >= 0
      } : undefined
    },
    {
      id: "newCustomers",
      label: d.stats?.newCustomers || "New Customers",
      value: data?.stats ? localizeNumber(data.stats.newCustomersCount.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US'), locale) : "-",
      icon: Users,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      trend: data?.stats ? {
        value: `${data.stats.newCustomersDiffPercent >= 0 ? "+" : ""}${localizeNumber(data.stats.newCustomersDiffPercent, locale)}%`,
        isPositive: data.stats.newCustomersDiffPercent >= 0
      } : undefined
    },
    {
      id: "totalCustomers",
      label: d.stats?.totalCustomers || "Total Customers",
      value: data?.stats ? localizeNumber(data.stats.totalCustomers.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US'), locale) : "-",
      icon: Users,
      color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
      trend: undefined
    },
    {
      id: "newComments",
      label: d.stats?.newComments || "New Comments",
      value: data?.stats ? localizeNumber(data.stats.newCommentsCount.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US'), locale) : "-",
      icon: MessageSquare,
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
      trend: data?.stats ? {
        value: `${data.stats.newCommentsDiffPercent >= 0 ? "+" : ""}${localizeNumber(data.stats.newCommentsDiffPercent, locale)}%`,
        isPositive: data.stats.newCommentsDiffPercent >= 0
      } : undefined
    },
    {
      id: "newMessages",
      label: d.stats?.newMessages || "New Messages",
      value: data?.stats ? localizeNumber(data.stats.newInboxMessagesCount.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US'), locale) : "-",
      icon: Mail,
      color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
      trend: data?.stats ? {
        value: `${data.stats.newInboxMessagesDiffPercent >= 0 ? "+" : ""}${localizeNumber(data.stats.newInboxMessagesDiffPercent, locale)}%`,
        isPositive: data.stats.newInboxMessagesDiffPercent >= 0
      } : undefined
    },
  ];

  return (
    <DashboardLayout pageTitle={d.pageTitle}>
      <div className="flex flex-col gap-6 w-full">

        {/* Welcome Banner & Date Filters */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 p-5 bg-surface-card border border-border-default rounded-xl [html[data-theme=light]_&]:bg-white">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground m-0 mb-1">
              {(() => {
                const hour = new Date().getHours();
                let greetingKey = "morning";
                if (hour >= 12 && hour < 17) greetingKey = "afternoon";
                else if (hour >= 17) greetingKey = "evening";
                
                const template = (d as any).greetings?.[greetingKey] || d.greeting || "Welcome, {name} 👋";
                return template.replace("{name}", user?.full_name || "");
              })()}
            </h2>
            <p className="text-sm text-text-muted m-0">
              {d.greetingDesc}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto min-w-0 overflow-hidden">
            {/* Quick Period Selector */}
            <div className="flex items-center bg-surface-subtle p-1 rounded-lg border border-border-subtle overflow-x-auto custom-scrollbar w-full sm:w-auto">
              <button
                onClick={() => setPeriod("day")}
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all border-none cursor-pointer outline-none whitespace-nowrap ${
                  period === "day"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:text-foreground bg-transparent"
                }`}
              >
                {d.filters?.day || "Day"}
              </button>
              <button
                onClick={() => setPeriod("week")}
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all border-none cursor-pointer outline-none whitespace-nowrap ${
                  period === "week"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:text-foreground bg-transparent"
                }`}
              >
                {d.filters?.week || "Week"}
              </button>
              <button
                onClick={() => setPeriod("month")}
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all border-none cursor-pointer outline-none whitespace-nowrap ${
                  period === "month"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:text-foreground bg-transparent"
                }`}
              >
                {d.filters?.month || "Month"}
              </button>
              <button
                onClick={() => setPeriod("custom")}
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all border-none cursor-pointer outline-none whitespace-nowrap ${
                  period === "custom"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:text-foreground bg-transparent"
                }`}
              >
                {d.filters?.custom || "Custom"}
              </button>
            </div>

            {/* Date Inputs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-surface-subtle p-1.5 rounded-lg border border-border-subtle w-full sm:w-auto min-w-0">
              <div className="flex items-center justify-between sm:justify-start gap-2 px-1 min-w-0">
                <span className="text-[11px] sm:text-xs font-semibold text-text-subtle whitespace-nowrap shrink-0">{d.filters?.startDate || "Start"}</span>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPeriod("custom");
                  }} 
                  className="h-8 text-xs bg-surface-card border border-border-default rounded-md px-2 py-1 w-full sm:w-[130px] min-w-0"
                />
              </div>
              <div className="w-px h-5 bg-border-default hidden sm:block shrink-0" />
              <div className="flex items-center justify-between sm:justify-start gap-2 px-1 min-w-0">
                <span className="text-[11px] sm:text-xs font-semibold text-text-subtle whitespace-nowrap shrink-0">{d.filters?.endDate || "End"}</span>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPeriod("custom");
                  }} 
                  className="h-8 text-xs bg-surface-card border border-border-default rounded-md px-2 py-1 w-full sm:w-[130px] min-w-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {statsList.map((s) => (
            <StatCard key={s.id} icon={s.icon} label={s.label} value={s.value} color={s.color} trend={s.trend} />
          ))}
        </div>

        {/* Bottom Row - Timeline */}
        <div className="grid grid-cols-1 gap-4">

          {/* Recent Activity */}
          <div 
            onScroll={handleScroll}
            className="bg-surface-card border border-border-default rounded-xl px-5 pb-5 pt-0 backdrop-blur-md [html[data-theme=light]_&]:bg-white max-h-[600px] overflow-y-auto custom-scrollbar w-full min-h-[400px]"
          >
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-surface-card [html[data-theme=light]_&]:bg-white z-10 pt-5 pb-4 border-b border-border-subtle">
              <h3 className="text-lg font-bold text-foreground m-0 flex items-center gap-2">
                <Activity size={20} className="text-primary" />
                {d.recentActivity.title}
                {(isLoading || loadingMore) && <Loader2 className="w-4 h-4 animate-spin text-primary ms-2" />}
              </h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {isLoading ? (
                <>
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-base border border-border-default animate-pulse">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-[10px] bg-surface-subtle shrink-0"></div>
                        <div className="flex flex-col gap-2 w-full">
                          <div className="w-32 h-4 bg-surface-subtle rounded"></div>
                          <div className="w-16 h-4 bg-surface-subtle rounded"></div>
                        </div>
                      </div>
                      <div className="w-20 h-6 bg-surface-subtle rounded shrink-0"></div>
                    </div>
                  ))}
                </>
              ) : timelineEvents && timelineEvents.length > 0 ? (
                <>
                  {timelineEvents.map((event) => {
                    const conf = getEventConfig(event.type);
                    const Icon = conf.icon;
                    const eventTime = new Date(event.timestamp).toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
                    const translatedTitle = d.activityTypes?.[event.type] || event.title;
                    
                    let eventLink = "";
                    if (event.type.startsWith("BOOKING") || event.type === "NEW_BOOKING") {
                      eventLink = `/bookings/${event.id}`;
                    } else if (event.type === "NEW_COMMENT") {
                      eventLink = `/comments`;
                    } else if (event.type === "NEW_INBOX_MESSAGE") {
                      eventLink = `/inbox`;
                    }

                    return (
                      <div key={`${event.id}-${event.type}-${event.timestamp}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-base border border-border-default">
                        {/* Icon and Details */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center bg-surface-card border border-border-default shadow-sm shrink-0" style={{ color: conf.color }}>
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <h4 className="text-xs sm:text-sm font-semibold text-foreground m-0 truncate" title={translatedTitle}>{translatedTitle}</h4>
                            {event.status && (
                              <div className="flex">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusConfig(event.status, d).classes}`}>
                                  {getStatusConfig(event.status, d).text}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Time & Action Button */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t border-border-subtle/40 pt-2 sm:pt-0 sm:border-none">
                          <span className="text-[11px] sm:text-xs font-medium text-text-subtle whitespace-nowrap bg-surface-card px-2 py-1 rounded border border-border-default shadow-sm">{eventTime}</span>
                          {eventLink && (
                            <a 
                              href={eventLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg flex items-center justify-center border border-border-default bg-surface-card text-text-muted hover:bg-surface-subtle hover:text-foreground transition-colors shadow-sm"
                              title={(t as any).actions?.openInNewWindow || "Open in new window"}
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {loadingMore && (
                    <>
                      {[...Array(3)].map((_, i) => (
                        <div key={`loading-more-${i}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-base border border-border-default animate-pulse">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-[10px] bg-surface-subtle shrink-0"></div>
                            <div className="flex flex-col gap-2 w-full">
                              <div className="w-32 h-4 bg-surface-subtle rounded"></div>
                              <div className="w-16 h-4 bg-surface-subtle rounded"></div>
                            </div>
                          </div>
                          <div className="w-20 h-6 bg-surface-subtle rounded shrink-0"></div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <div className="col-span-1 lg:col-span-2 xl:col-span-3 flex flex-col items-center justify-center text-center py-12 px-4 h-full">
                  <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4 text-text-subtle">
                    <Calendar size={32} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground m-0 mb-1">{d.recentActivity?.emptyState?.title || "No operations"}</h3>
                  <p className="text-sm text-text-muted m-0 max-w-[250px]">
                    {d.recentActivity?.emptyState?.description || "No activities have been recorded today yet."}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
