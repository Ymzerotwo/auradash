"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getNavigation } from "@/lib/navigation";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useAuthStore } from "@/lib/stores/auth.store";
import { ShieldAlert } from "lucide-react";

export function PermissionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const userRole = useAuthStore((state) => state.user?.role);
  const userPermissions = useAuthStore((state) => state.user?.permissions);
  const isHydrated = useAuthStore((state) => state.hydrated);

  const hasAccess = useMemo(() => {
    if (!isHydrated) return true;
    if (userRole === 'Admin') return true;

    const rawNav = getNavigation(t.sidebar);
    
    let requiredPermission: string | undefined = undefined;

    for (const item of rawNav) {
      if (item.href && (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))) {
        requiredPermission = item.permission;
        break;
      }
      if (item.children) {
        for (const child of item.children) {
          if (child.href && (pathname === child.href || (child.href !== "/" && pathname.startsWith(child.href)))) {
            requiredPermission = child.permission;
            break;
          }
        }
      }
      if (requiredPermission) break;
    }

    if (!requiredPermission) return true;

    const parts = requiredPermission.split('.');
    let current: any = userPermissions;
    for (const part of parts) {
      if (current === undefined || current === null) return false;
      current = current[part];
    }
    
    return current === true;
  }, [pathname, t.sidebar, userRole, userPermissions, isHydrated]);


  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">{t.common.page_state?.access_denied_title || "Access Denied"}</h2>
        <p className="text-text-muted max-w-md">
          {t.common.page_state?.access_denied_desc || "You don't have the necessary permissions to view this page. If you believe this is a mistake, please contact your administrator."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
