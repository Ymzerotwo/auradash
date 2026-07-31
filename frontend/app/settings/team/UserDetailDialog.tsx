"use client";


import {
  Mail, Briefcase, Calendar, Key, AlertTriangle, Clock
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { type TeamMember } from "@/lib/services/team.service";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { localizeNumber } from "@/lib/utils";

interface UserDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: TeamMember | null;
  isAdmin: boolean;
}

export function UserDetailDialog({ open, onOpenChange, user, isAdmin }: UserDetailDialogProps) {
  const { t, locale } = useTranslation();
  const dict = t.users;

  if (!user) return null;

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    const formatted = format(new Date(dateStr), "dd/MM/yyyy, hh:mm a", {
      locale: locale === "ar" ? ar : enUS
    });
    return localizeNumber(formatted, locale);
  };

  const getAccessiblePages = (): { name: string; isAll?: boolean; isNone?: boolean }[] => {
    if (user.role === "Admin") {
      return [{ name: dict.details.allPagesAccess, isAll: true }];
    }
    const perms = user.permissions;
    if (!perms) {
      return [{ name: dict.details.noPagesAccess, isNone: true }];
    }

    const pages: string[] = [];

    // Dashboard
    if (perms.dashboard) {
      pages.push(dict.wizard?.modules?.dashboard || "Dashboard");
    }
    // Inbox
    if (perms.inbox) {
      pages.push(dict.wizard?.modules?.inbox || "Inbox");
    }
    // Bookings
    if (perms.bookings) {
      pages.push(dict.wizard?.modules?.bookings || "Bookings");
    }
    // Customers
    if (perms.customers?.clients_directory) {
      pages.push(dict.wizard?.pages?.clients_directory || "Customers");
    }
    // CMS Services, Articles, Comments
    if (perms.cms?.services) {
      pages.push(dict.wizard?.pages?.services || "Services");
    }
    if (perms.cms?.articles) {
      pages.push(dict.wizard?.pages?.articles || "Articles");
    }
    if (perms.cms?.comments) {
      pages.push(dict.wizard?.pages?.comments || "Comments");
    }
    // Settings Workspace, Team, Media, API Key
    if (perms.settings?.workspace) {
      pages.push(dict.wizard?.pages?.workspace || "Workspace");
    }
    if (perms.settings?.team) {
      pages.push(dict.wizard?.pages?.team || "Team");
    }
    if (perms.settings?.media) {
      pages.push(dict.wizard?.pages?.media || "Media");
    }
    if (perms.settings?.api_key) {
      pages.push(dict.wizard?.pages?.api_key || "API Keys");
    }

    if (pages.length === 0) {
      return [{ name: dict.details.noPagesAccess, isNone: true }];
    }

    return pages.map(p => ({ name: p, isAll: false, isNone: false }));
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:w-full !max-w-[540px] p-0 overflow-hidden !rounded-2xl bg-surface-card"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

          <DialogClose
            render={
              <button className="dialog-close-btn">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            }
          />

          <DialogHeader className="gap-1.5 pe-8">
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
              {dict.details.title}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-text-muted leading-relaxed m-0">
              {dict.details.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="h-px bg-border-default" />

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-6">
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Header Avatar and Basic Details */}
            <div className="flex flex-col sm:flex-row gap-5 items-center bg-surface-subtle/30 p-4 rounded-xl border border-border-subtle">
              <Avatar size="lg" className="shrink-0 border border-border-default/80">
                {user.photo_url && <AvatarImage src={user.photo_url} alt={user.full_name} />}
                <AvatarFallback className="text-base font-semibold bg-surface-subtle text-foreground border border-border-default/40">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 w-full flex flex-col gap-1.5 justify-center text-center sm:text-start">
                <span className="text-sm font-semibold text-foreground">{user.full_name}</span>
                <span className={`text-xs font-mono text-text-muted text-center ${locale === "ar" ? "sm:text-right" : "sm:text-left"}`} dir="ltr">@{user.username}</span>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                    user.role === "Admin" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  }`}>
                    {dict.roles[user.role]}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                    user.is_banned === 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  }`}>
                    {dict.status[user.is_banned === 0 ? "active" : "banned"]}
                  </span>
                </div>
              </div>
            </div>

            {/* Basic Info Section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-primary rounded-full" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {dict.details.basicInfo}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div className="flex items-start gap-3 bg-surface-subtle/10 p-3 rounded-lg border border-border-default">
                  <Mail className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">{dict.form.email}</span>
                    <span className="text-xs font-medium text-foreground truncate mt-0.5">{user.email}</span>
                  </div>
                </div>

                {/* Job Title */}
                <div className="flex items-start gap-3 bg-surface-subtle/10 p-3 rounded-lg border border-border-default">
                  <Briefcase className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">{dict.form.jobTitle}</span>
                    <span className="text-xs font-medium text-foreground mt-0.5">{user.job_title || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Accessible Pages Section */}
            <div className="flex flex-col gap-4 pt-2 border-t border-border-subtle/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {dict.details.accessiblePages}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {getAccessiblePages().map((page, idx) => (
                  <Badge
                    key={idx}
                    variant={page.isAll ? "default" : page.isNone ? "secondary" : "outline"}
                    className={
                      page.isAll
                        ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 text-xs py-1 px-2.5"
                        : page.isNone
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs py-1 px-2.5"
                          : "bg-surface-subtle text-foreground border-border-default text-xs py-1 px-2.5"
                    }
                  >
                    {page.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Audit Log Section - Admin Only */}
            {isAdmin && (
              <div className="flex flex-col gap-4 pt-2 border-t border-border-subtle/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-4 bg-accent rounded-full" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {dict.details.auditLog}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Account Creation */}
                  <div className="flex items-start gap-3 bg-surface-subtle/15 p-3 rounded-lg border border-border-default">
                    <Calendar className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">
                        {dict.details.createdAt}
                      </span>
                      <span className="text-xs font-medium text-foreground mt-0.5">{formatDate(user.created_at)}</span>
                      {user.created_by && (
                        <span className="text-[10px] text-text-muted mt-1 font-mono truncate">
                          {dict.details.by} <span dir="ltr">{user.created_by}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Account Updates */}
                  {user.updated_at && (
                    <div className="flex items-start gap-3 bg-surface-subtle/15 p-3 rounded-lg border border-border-default">
                      <Clock className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-text-muted uppercase tracking-wider">
                          {dict.details.updatedAt}
                        </span>
                        <span className="text-xs font-medium text-foreground mt-0.5">{formatDate(user.updated_at)}</span>
                        {user.updated_by && (
                          <span className="text-[10px] text-text-muted mt-1 font-mono truncate">
                            {dict.details.by} <span dir="ltr">{user.updated_by}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Password Updates */}
                  {user.password_updated_at && (
                    <div className="flex items-start gap-3 bg-surface-subtle/15 p-3 rounded-lg border border-border-default">
                      <Key className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-text-muted uppercase tracking-wider">
                          {dict.details.passwordUpdatedAt}
                        </span>
                        <span className="text-xs font-medium text-foreground mt-0.5">{formatDate(user.password_updated_at)}</span>
                        {user.password_updated_by && (
                          <span className="text-[10px] text-text-muted mt-1 font-mono truncate">
                            {dict.details.by}
                            {user.password_updated_by === "self" ? (
                              dict.details.passwordUpdatedBySelf
                            ) : (
                              <span dir="ltr">{user.password_updated_by}</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Ban Tracking */}
                  {user.is_banned === 1 && user.banned_by && (
                    <div className="flex items-start gap-3 bg-red-500/5 p-3 rounded-lg border border-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-red-500 dark:text-red-400 uppercase tracking-wider">
                          {dict.details.suspendedBy}
                        </span>
                        <span className="text-xs font-mono text-foreground mt-0.5 truncate" dir="ltr">{user.banned_by}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
