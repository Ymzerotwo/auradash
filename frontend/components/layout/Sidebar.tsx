"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import logoImg from "@/app/icon.png";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavigation, type NavItem } from "@/lib/navigation";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuthStore } from "@/lib/stores/auth.store";
import { Skeleton } from "@/components/ui/skeleton";
import { useStateStore } from "@/lib/stores/state.store";

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  /** When true, CSS width transition is suppressed (used during initial hydration). */
  suppressTransition?: boolean;
}

function NavSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="flex items-center gap-3 px-2 h-[38px]">
          <Skeleton className="w-[18px] h-[18px] rounded-md shrink-0 bg-surface-overlay" />
          {!collapsed && <Skeleton className="h-[14px] flex-1 rounded-md bg-surface-overlay" />}
        </div>
      ))}
    </div>
  );
}

function isItemActive(item: NavItem, pathname: string): boolean {
  if (
    item.href &&
    (pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href)))
  ) {
    return true;
  }
  if (item.children) {
    return item.children.some(
      (c) =>
        pathname === c.href ||
        (c.href && c.href !== "/" && pathname.startsWith(c.href))
    );
  }
  return false;
}

function isChildActive(href: string | undefined, pathname: string): boolean {
  if (!href) return false;
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center min-w-0 flex-1 gap-2.5">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
        <Image
          src={logoImg}
          alt="AuraDash Logo"
          width={36}
          height={36}
          priority
          loading="eager"
          className="w-full h-full object-cover rtl:-scale-x-100 -translate-y-0.5 "
        />
      </div>
      <div
        className="flex flex-col justify-center whitespace-nowrap"
        style={{
          overflow: "hidden",
          maxWidth: collapsed ? 0 : "200px",
          opacity: collapsed ? 0 : 1,
          lineHeight: 1.2,
          transition:
            "max-width 300ms cubic-bezier(0.4,0,0.2,1), opacity 200ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <span className="text-[15px] font-bold text-foreground tracking-[-0.025em] leading-[1.15]">AuraDash</span>
        <span className="text-[10px] font-medium text-text-subtle uppercase tracking-[0.08em] leading-[1.2]">{t.topbar.enterprise}</span>
      </div>
    </div>
  );
}

function NavBadge({ count }: { count: string | number }) {
  return <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0 ms-auto">{count}</span>;
}

function NavChildItem({
  label,
  href,
  badge,
  active,
}: {
  label: string;
  href: string;
  badge?: string | number;
  active: boolean;
}) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2 px-2 h-[34px] rounded-md text-text-muted text-[13px] font-normal no-underline transition-colors duration-150 hover:bg-surface-subtle hover:text-foreground", active && "text-foreground font-medium")}>
      <span className={cn("w-[5px] h-[5px] rounded-full bg-text-subtle shrink-0 transition-all duration-150 group-hover:bg-text-muted", active && "!bg-primary w-1.5 h-1.5")} />
      <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
      {badge !== undefined && <NavBadge count={badge} />}
    </Link>
  );
}

function NavParentItem({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
}) {
  const active = isItemActive(item, pathname);
  const [isOpen, setIsOpen] = useState<boolean>(active);

  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) {
      setIsOpen(true);
    }
  }

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const Icon = item.icon;

  const buttonContent = (
    <>
      <span className="flex items-center justify-center w-5 h-5 shrink-0">
        <Icon size={18} />
      </span>
      <span
        className="flex-1 min-w-0 overflow-hidden text-ellipsis"
        style={{
          maxWidth: collapsed ? 0 : "200px",
          opacity: collapsed ? 0 : 1,
          transition: "max-width 300ms cubic-bezier(0.4,0,0.2,1), opacity 200ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {item.label}
      </span>
      {!collapsed && item.badge !== undefined && <NavBadge count={item.badge} />}
      {!collapsed && (
        <ChevronRight
          size={14}
          className={cn("shrink-0 text-text-subtle transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] ms-auto rtl:rotate-180", isOpen && "rotate-90 rtl:rotate-90")}
        />
      )}
    </>
  );

  return (
    <div>
      {collapsed ? (
        <Popover>
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger
                  className={cn("group flex items-center gap-3 px-2 h-[38px] rounded-md text-text-muted text-[13.5px] font-medium no-underline bg-transparent border-none w-full cursor-pointer relative transition-colors duration-150 whitespace-nowrap text-start hover:bg-surface-subtle hover:text-foreground", active && "bg-surface-subtle text-foreground hover:bg-surface-overlay before:content-[''] before:absolute before:start-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:rounded-e-full before:bg-primary")}
                  aria-label={item.label}
                />
              }
            >
              {buttonContent}
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="rtl:rotate-0">
              {item.label}
            </TooltipContent>
          </Tooltip>
          <PopoverContent side="right" sideOffset={12} align="start" className="w-48 p-2 overflow-hidden bg-surface-card border border-border-default shadow-lg z-50 rounded-xl">
            <div className="px-2 py-1 mb-1 text-xs font-bold text-text-muted border-b border-border-subtle uppercase tracking-wider">
              {item.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {item.children!.map((child) => (
                <NavChildItem
                  key={child.href}
                  label={child.label}
                  href={child.href!}
                  badge={child.badge}
                  active={isChildActive(child.href, pathname)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <button
          onClick={toggleOpen}
          className={cn("group flex items-center gap-3 px-2 h-[38px] rounded-md text-text-muted text-[13.5px] font-medium no-underline bg-transparent border-none w-full cursor-pointer relative transition-colors duration-150 whitespace-nowrap text-start hover:bg-surface-subtle hover:text-foreground", active && "bg-surface-subtle text-foreground hover:bg-surface-overlay before:content-[''] before:absolute before:start-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:rounded-e-full before:bg-primary")}
          aria-expanded={isOpen}
        >
          {buttonContent}
        </button>
      )}

      {!collapsed && (
        <div
          className="grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-auto"
          style={{
            gridTemplateRows: isOpen ? "1fr" : "0fr",
            opacity: isOpen ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-[2px] py-1 ps-[calc(var(--space-3)+20px)] relative before:content-[''] before:absolute before:start-[calc(var(--space-3)+9px)] before:top-1.5 before:bottom-1.5 before:w-px before:bg-border-default before:rounded-full">
              {item.children!.map((child) => (
                <NavChildItem
                  key={child.href}
                  label={child.label}
                  href={child.href!}
                  badge={child.badge}
                  active={isChildActive(child.href, pathname)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavLeafItem({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
}) {
  const active = isItemActive(item, pathname);
  const Icon = item.icon;

  const linkContent = (
    <>
      <span className="flex items-center justify-center w-5 h-5 shrink-0">
        <Icon size={18} />
      </span>
      <span
        className="flex-1 min-w-0 overflow-hidden text-ellipsis"
        style={{
          maxWidth: collapsed ? 0 : "200px",
          opacity: collapsed ? 0 : 1,
          transition: "max-width 300ms cubic-bezier(0.4,0,0.2,1), opacity 200ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {item.label}
      </span>
      {!collapsed && item.badge !== undefined && <NavBadge count={item.badge} />}
    </>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={item.href!}
              className={cn("group flex items-center gap-3 px-2 h-[38px] rounded-md text-text-muted text-[13.5px] font-medium no-underline bg-transparent border-none w-full cursor-pointer relative transition-colors duration-150 whitespace-nowrap text-start hover:bg-surface-subtle hover:text-foreground", active && "bg-surface-subtle text-foreground hover:bg-surface-overlay before:content-[''] before:absolute before:start-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:rounded-e-full before:bg-primary")}
              aria-label={item.label}
            />
          }
        >
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {item.label}
          {item.badge !== undefined && ` (${item.badge})`}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn("group flex items-center gap-3 px-2 h-[38px] rounded-md text-text-muted text-[13.5px] font-medium no-underline bg-transparent border-none w-full cursor-pointer relative transition-colors duration-150 whitespace-nowrap hover:bg-surface-subtle hover:text-foreground", active && "bg-surface-subtle text-foreground hover:bg-surface-overlay before:content-[''] before:absolute before:start-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:rounded-e-full before:bg-primary")}
    >
      {linkContent}
    </Link>
  );
}

export function Sidebar({ collapsed, onCollapsedChange, suppressTransition }: SidebarProps) {
  const pathname = usePathname();
  const { t, dir } = useTranslation();
  const userRole = useAuthStore((state) => state.user?.role);
  const userPermissions = useAuthStore((state) => state.user?.permissions);
  const isHydrated = useAuthStore((state) => state.hydrated);
  
  const checkPerm = useCallback((key: string) => {
    if (!userRole) return false;
    if (userRole === 'Admin') return true;
    if (!userPermissions) return false;
    
    const parts = key.split('.');
    let current: any = userPermissions;
    for (const part of parts) {
      if (current === undefined || current === null) return false;
      current = current[part];
    }
    return current === true;
  }, [userRole, userPermissions]);

  const hasInboxPermission = isHydrated ? checkPerm('cms.inbox') : false;
  const inboxUnreadCount = useStateStore((s) => s.counters.inbox);

  const navigation = useMemo(() => {
    if (!isHydrated) return [];

    const rawNav = getNavigation(t.sidebar);

    return rawNav
      .map(item => {
        if (item.children) {
          const filteredChildren = item.children.filter(child =>
            !child.permission || checkPerm(child.permission)
          ).map(child => {
            if (child.href === '/inbox' && inboxUnreadCount > 0) {
              return { ...child, badge: inboxUnreadCount };
            }
            return child;
          });

          if (filteredChildren.length === 0 && !item.href) return null;

          return { ...item, children: filteredChildren };
        }

        if (item.permission && !checkPerm(item.permission)) {
          return null;
        }

        if (item.href === '/inbox' && inboxUnreadCount > 0) {
          return { ...item, badge: inboxUnreadCount };
        }

        return item;
      })
      .filter((item): item is NavItem => item !== null);
  }, [t.sidebar, checkPerm, isHydrated, inboxUnreadCount]);

  const toggleCollapse = useCallback(() => {
    onCollapsedChange(!collapsed);
  }, [collapsed, onCollapsedChange]);

  return (
    <aside
      className="h-screen flex flex-col bg-surface-raised border-e border-border-default overflow-hidden relative [html[data-theme=light]_&]:bg-white"
      style={{
        width: collapsed
          ? "var(--sidebar-width-collapsed)"
          : "var(--sidebar-width)",
        transition: suppressTransition ? "none" : "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        scrollbarWidth: "none" as any,
        msOverflowStyle: "none" as any,
      }}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between h-[var(--topbar-height)] border-b border-border-subtle shrink-0 gap-2 px-3">
        <SidebarLogo collapsed={collapsed} />
        <button
          onClick={toggleCollapse}
          className="w-7 h-7 rounded-md border border-border-default bg-transparent text-text-muted flex items-center justify-center cursor-pointer shrink-0 transition-all duration-300 hover:bg-surface-overlay hover:text-foreground hover:border-border-strong rtl:scale-x-[-1]"
          aria-label={collapsed ? t.topbar.expandSidebar : t.topbar.collapseSidebar}
          title={collapsed ? t.topbar.expandSidebar : t.topbar.collapseSidebar}
          style={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 28,
            overflow: "hidden",
            padding: collapsed ? 0 : undefined,
            border: collapsed ? "none" : undefined,
            transition: "opacity 200ms, width 300ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-none" dir={dir} style={{ scrollbarWidth: "none" as any, msOverflowStyle: "none" as any }}>
        {!isHydrated ? (
          <NavSkeleton collapsed={collapsed} />
        ) : (
          <div className="flex flex-col gap-[2px] px-3">
            {navigation.map((item) =>
              item.children ? (
                <NavParentItem
                  key={item.label}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                />
              ) : (
                <NavLeafItem
                  key={item.label}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                />
              )
            )}
          </div>
        )}
      </nav>

      <div
        className="border-t border-border-subtle flex justify-center transition-all duration-300"
        style={{
          maxHeight: collapsed ? 60 : 0,
          opacity: collapsed ? 1 : 0,
          padding: collapsed ? 12 : 0,
          overflow: "hidden",
          transition: "max-height 300ms cubic-bezier(0.4,0,0.2,1), opacity 250ms, padding 300ms",
        }}
      >
        <button
          onClick={toggleCollapse}
          className="w-9 h-9 rounded-md border border-border-default bg-transparent text-text-muted flex items-center justify-center cursor-pointer shrink-0 transition-all duration-200 hover:bg-surface-overlay hover:text-foreground hover:border-border-strong rtl:scale-x-[-1]"
          aria-label={t.topbar.expandSidebar}
          title={t.topbar.expandSidebar}
          tabIndex={collapsed ? 0 : -1}
        >
          <PanelLeftOpen size={18} />
        </button>
      </div>
    </aside>
  );
}
