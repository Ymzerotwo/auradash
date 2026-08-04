"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { PermissionGuard } from "./PermissionGuard";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/stores/app.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { StatePolling } from "./StatePolling";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useLayoutContext } from "@/app/components/LayoutProvider";

/** Shared cubic-bezier used by both sidebar width and content margin. */
const SIDEBAR_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
const SIDEBAR_DURATION = "300ms";

interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function DashboardLayout({ children, pageTitle }: DashboardLayoutProps) {
  const { dir } = useTranslation();
  const { initialSidebarCollapsed } = useLayoutContext();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.setSidebarCollapsed);
  const hydrate = useAuthStore((s) => s.hydrate);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [isTransitionReady, setIsTransitionReady] = useState(false);

  /**
   * Track whether the Zustand store has finished async rehydration from localStorage.
   * Until then, we use the synchronous `initialSidebarCollapsed` value from SSR (via cookie).
   */
  const isStoreReady = useRef(false);

  // Detect when Zustand has rehydrated by subscribing to the persist onRehydrateStorage.
  // As a simple heuristic: after the first effect runs, the store is ready.
  useEffect(() => {
    void hydrate();
    // Mark store as ready after one frame (Zustand persist resolves synchronously
    // from localStorage, but applies state in a microtask).
    requestAnimationFrame(() => {
      isStoreReady.current = true;
      // Enable transitions one frame later so the initial snap is invisible.
      requestAnimationFrame(() => {
        setIsTransitionReady(true);
      });
    });
  }, [hydrate]);

  const handleCollapsedChange = useCallback((val: boolean) => {
    toggleSidebar(val);
    // Keep the cookie in sync so the NEXT SSR request matches the current state
    if (typeof document !== "undefined") {
      document.cookie = `NEXT_SIDEBAR_COLLAPSED=${val}; path=/; max-age=31536000`;
    }
  }, [toggleSidebar]);

  const toggleMobile = useCallback(() => {
    setMobileOpen((p) => !p);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) setMobileOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Use the SSR cookie value until the store is ready, then use live Zustand value.
  const effectiveCollapsed = isStoreReady.current ? collapsed : initialSidebarCollapsed;

  const transitionValue = isTransitionReady
    ? `margin-inline-start ${SIDEBAR_DURATION} ${SIDEBAR_EASING}`
    : "none";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-surface-base relative">
      <StatePolling />
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[39] backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          "fixed top-0 start-0 h-[100dvh] z-40 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] !transform",
          "-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:translate-x-0",
          mobileOpen && "!translate-x-0"
        )}
      >
        <Sidebar 
          collapsed={effectiveCollapsed} 
          onCollapsedChange={handleCollapsedChange}
          suppressTransition={!isTransitionReady}
        />
      </div>

      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden",
          effectiveCollapsed ? "lg:ms-[var(--sidebar-width-collapsed)]" : "lg:ms-[var(--sidebar-width)]"
        )}
        style={{
          transition: transitionValue,
        }}
      >
        <Topbar onMobileMenuToggle={toggleMobile} pageTitle={pageTitle} />

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto" dir={dir} style={{ direction: dir }}>
          <PermissionGuard>
            {children}
          </PermissionGuard>
        </main>
      </div>
    </div>
  );
}

