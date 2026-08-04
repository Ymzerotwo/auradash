"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Globe, LogOut, Menu, Bell } from "lucide-react";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { useTheme } from "@/app/components/ThemeProvider";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth.store";
import { toast } from "sonner";
import { useLogout } from "@/lib/hooks/useAuth";
import { ProfileFormDialog } from "./ProfileFormDialog";
import { RefreshCw, CheckCircle, Settings } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { useStateStore } from "@/lib/stores/state.store";
import { useNotificationsInfinite, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from "@/lib/hooks/useNotifications";

function useMounted() {
  return useSyncExternalStore(
    () => () => {}, 
    () => true, 
    () => false
  );
}

function useIsMobile(breakpoint = 1023) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(`(max-width: ${breakpoint}px)`).matches,
    () => false
  );
}

function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();
  const tb = t.topbar;
  const mounted = useMounted();
  if (!mounted) return <div className="w-9 h-9" />; // Placeholder to avoid layout shift

  const toggle = () => setLocale(locale === "en" ? "ar" : "en");

  return (
    <button
      id="topbar-language-btn"
      type="button"
      onClick={toggle}
      aria-label={tb.toggleLanguage}
      title={locale === "en" ? tb.switchToArabic : tb.switchToEnglish}
      className="w-9 h-9 rounded-md border border-border-default bg-transparent text-text-muted flex items-center justify-center cursor-pointer transition-all duration-150 shrink-0 hover:bg-surface-overlay hover:text-foreground hover:border-border-strong"
    >
      <span className="text-[11px] font-bold leading-none">{locale === "en" ? "AR" : "EN"}</span>
    </button>
  );
}

function InlineThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const tb = t.topbar;
  const mounted = useMounted();
  const isDark = theme === "dark";

  if (!mounted) return null;

  return (
    <button
      id="dropdown-theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={tb.toggleTheme}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-muted hover:bg-surface-overlay hover:text-foreground transition-all duration-150 cursor-pointer"
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 text-yellow-400">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 text-[#a7b1ff]">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      <span>{isDark ? tb.lightMode : tb.darkMode}</span>
    </button>
  );
}

function InlineLanguageToggle() {
  const { locale, setLocale, t } = useTranslation();
  const tb = t.topbar;
  const toggle = () => setLocale(locale === "en" ? "ar" : "en");

  return (
    <button
      id="dropdown-language-toggle"
      type="button"
      onClick={toggle}
      aria-label={tb.toggleLanguage}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-muted hover:bg-surface-overlay hover:text-foreground transition-all duration-150 cursor-pointer"
    >
      <Globe size={16} className="shrink-0" />
      <span>{tb.language}: <strong>{locale === "en" ? "AR" : "EN"}</strong></span>
    </button>
  );
}

interface AvatarDropdownProps {
  isMobile: boolean;
}

function AvatarDropdown({ isMobile }: AvatarDropdownProps) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clear);
  const { t } = useTranslation();
  const tb = t.topbar;

  const isHydrated = useAuthStore((state) => state.hydrated);

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const logoutMutation = useLogout();

  const handleLogout = () => {
    setOpen(false);
    logoutMutation.mutate();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        id="topbar-avatar-btn"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={!isHydrated}
        className={cn(
          "w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white cursor-pointer border-2 border-transparent transition-all duration-150 shrink-0 hover:border-primary hover:scale-105 active:scale-95",
          !isHydrated ? "bg-surface-overlay animate-pulse cursor-default" : "bg-gradient-to-br from-primary-400 to-accent-400",
          open && "border-primary ring-2 ring-primary/20"
        )}
      >
        {!isHydrated ? (
          <span className="w-full h-full rounded-full" />
        ) : user?.photo_url ? (
          <Image 
            src={user.photo_url} 
            alt={user.full_name || "User"} 
            width={36} 
            height={36} 
            className="w-full h-full object-cover rounded-full"
            unoptimized
          />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      {open && (
        <div
          className="absolute end-0 top-[calc(100%+8px)] w-52 rounded-xl border border-border-default bg-surface-raised shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          role="menu"
        >
          <div className="px-3 pt-3 pb-2 border-b border-border-default">
            <p className="text-sm font-semibold text-foreground truncate">{user?.full_name || tb.guestUser}</p>
            <p className="text-[11px] text-text-subtle truncate">{user?.email || tb.guestEmail}</p>
          </div>

          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setProfileOpen(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-muted hover:bg-surface-overlay hover:text-foreground transition-all duration-150 cursor-pointer"
            >
              <Settings size={16} className="shrink-0" />
              <span>{tb.editProfile}</span>
            </button>
          </div>

          <div className="py-1">
            <button
              id="topbar-logout-btn"
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors duration-150 cursor-pointer"
            >
              <LogOut size={16} className="shrink-0" />
              <span>{tb.signOut}</span>
            </button>
          </div>
        </div>
      )}

      <ProfileFormDialog 
        open={profileOpen} 
        onOpenChange={setProfileOpen} 
      />
    </div>
  );
}

interface Notification {
  id: string;
  type: string;
  titleKey: string;
  message_title: string;
  message_body: any;
  url: string | null;
  is_read: number;
  created_at: string;
}

function NotificationsDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t, locale } = useTranslation();
  const tb = t.topbar as any; 
  
  const unreadCount = useStateStore((s) => s.counters.notifications);
  const setCounters = useStateStore((s) => s.setCounters);
  const isHydrated = useAuthStore((s) => s.hydrated);

  // Use the new React Query hooks
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isFetching, 
    refetch 
  } = useNotificationsInfinite();

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  // Flatten the pages into a single array
  const notifications = data?.pages.flatMap((page) => page.notifications) || [];

  const prevCount = useRef(unreadCount);

  useEffect(() => {
    if (unreadCount > prevCount.current) {
      // The invalidation in StatePolling already triggers a refetch, but we can call it here too to be safe
      refetch();
      
      toast(tb.newNotification || "New Notification", {
        description: tb.checkNotifications || "You have a new unread notification",
        position: 'top-center',
        action: {
          label: tb.view || "View",
          onClick: () => setOpen(true),
        },
      });

      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
          
          gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        }
      } catch (e) {
        console.error("Audio play failed:", e);
      }
    }
    prevCount.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    if (open && notifications.length === 0 && hasNextPage) {
      fetchNextPage();
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const markAllAsRead = async () => {
    markAllAsReadMutation.mutate();
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      markAsReadMutation.mutate(n.id);
    }
    if (n.url) {
      let finalUrl = n.url;
      if (finalUrl === '/inbox') {
        finalUrl = '/inbox';
      }
      router.push(finalUrl);
      setOpen(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    refetch();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        id="topbar-notifications-btn"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={!isHydrated}
        className={cn(
          "relative w-9 h-9 rounded-md border flex items-center justify-center transition-all duration-150 shrink-0",
          !isHydrated 
            ? "border-transparent bg-surface-overlay animate-pulse cursor-default" 
            : "border-border-default bg-transparent text-text-muted cursor-pointer hover:bg-surface-overlay hover:text-foreground hover:border-border-strong",
          open && "bg-surface-overlay text-foreground border-border-strong"
        )}
      >
        {!isHydrated ? (
          <span className="w-full h-full rounded-md" />
        ) : (
          <>
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full shadow-sm ring-2 ring-surface-raised">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute -end-12 sm:end-0 top-[calc(100%+8px)] w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border-strong bg-surface-overlay shadow-2xl ring-1 ring-black/5 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col backdrop-blur-xl"
          role="menu"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-subtle/50 shrink-0">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              {tb.notifications || "Notifications"}
              <button onClick={handleRefresh} className={cn("text-text-muted hover:text-foreground transition-all cursor-pointer", isFetching && "animate-spin text-primary")}>
                <RefreshCw size={14} />
              </button>
            </h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-indigo-500/10"
              >
                <CheckCircle size={13} className="text-indigo-400" /> {tb.markAllRead || "Mark all as read"}
              </button>
            )}
          </div>
          
          <div 
            className="max-h-[320px] overflow-y-auto" 
            onScroll={handleScroll}
            ref={scrollRef}
          >
            {notifications.length > 0 ? (
              <div className="flex flex-col">
                {notifications.map((n) => {
                  const notificationText = tb.events?.[n.message_title === 'New message in Inbox' ? 'NEW_INBOX_MESSAGE' : n.message_title]?.body
                    ? tb.events[n.message_title === 'New message in Inbox' ? 'NEW_INBOX_MESSAGE' : n.message_title].body
                        .replace('{{articleTitle}}', n.message_body?.articleTitle || '')
                        .replace('{{userName}}', n.message_body?.userName || n.message_body?.message?.split('from ')[1] || '')
                    : (n.message_body?.message || n.message_body?.text || (typeof n.message_body === 'string' ? n.message_body : JSON.stringify(n.message_body)));

                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      title={notificationText}
                      className={cn(
                        "flex gap-2.5 px-3 py-2.5 border-b border-border-subtle last:border-0 hover:bg-surface-overlay transition-colors text-start cursor-pointer w-full bg-transparent",
                        !n.is_read ? "bg-surface-subtle/30" : "opacity-80"
                      )}
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0 mt-1.5",
                        !n.is_read ? "bg-indigo-400" : "bg-transparent"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <p className={cn("text-[13px] font-semibold truncate", !n.is_read ? "text-foreground" : "text-text-muted")}>
                            {tb.events?.[n.message_title === 'New message in Inbox' ? 'NEW_INBOX_MESSAGE' : n.message_title]?.title || n.message_title}
                          </p>
                          <span className="text-[10px] text-text-subtle shrink-0 mt-0.5">
                            {new Date(n.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted line-clamp-1 leading-snug">
                          {notificationText}
                        </p>
                      </div>
                    </button>
                  );
                })}
                {isFetchingNextPage && (
                  <div className="py-3 flex justify-center">
                    <RefreshCw size={16} className="animate-spin text-text-muted" />
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-surface-overlay flex items-center justify-center mx-auto mb-3 text-text-muted">
                  <Bell size={20} className="opacity-50" />
                </div>
                <p className="text-sm text-text-subtle">{tb.noNotifications || "No new notifications"}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TopbarProps {
  onMobileMenuToggle: () => void;
  pageTitle?: string;
}

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const isMobile = useIsMobile();

  return (
    <header className="h-[var(--topbar-height)] flex items-center justify-between px-6 bg-surface-raised border-b border-border-default sticky top-0 z-30 gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          id="mobile-menu-toggle"
          type="button"
          className="lg:hidden w-9 h-9 rounded-md border border-border-default bg-transparent text-text-muted flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-surface-overlay hover:text-foreground hover:border-border-strong"
          onClick={onMobileMenuToggle}
        >
          <Menu size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex">
          <LanguageToggle />
        </div>

        <div className="flex">
          <ThemeToggle />
        </div>

        <NotificationsDropdown />
        <AvatarDropdown isMobile={isMobile} />
      </div>
    </header>
  );
}
