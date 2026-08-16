"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, UserCheck, UserX, ShieldCheck, Search, Plus,
  Pencil, Ban, ShieldAlert, Trash2, LayoutGrid, TableProperties, ChevronLeft, ChevronRight,
  Mail, Briefcase, CalendarDays, Loader2
} from "lucide-react";
import { UserFormDialog } from "./UserFormDialog";
import { UserDetailDialog } from "./UserDetailDialog";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { type TeamMember } from "@/lib/services/team.service";
import { useTeamPageState } from "@/lib/hooks/useTeam";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { useAuthStore } from "@/lib/stores/auth.store";
import { PaginationControl } from "@/components/ui/PaginationControl";


// ─── Stat Card ──────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 min-w-0">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{value}</span>
        <span className="text-[10px] sm:text-xs font-medium text-text-muted mt-0.5 leading-tight" title={label}>{label}</span>
      </div>
    </div>
  );
}

// ─── Skeleton: Stat Cards ───────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
      <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0" />
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <Skeleton className="h-5 sm:h-6 w-12 rounded-md" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
    </div>
  );
}

// ─── Skeleton: Table Rows ───────────────────────────────────────────
function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-3 w-36 rounded" />
          </div>
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-4 w-20 rounded" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16 rounded" /></TableCell>
      <TableCell><Skeleton className="h-5 w-14 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-5 w-14 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
      <TableCell>
        <div className="flex items-center gap-1 justify-end">
          <Skeleton className="w-8 h-8 rounded-md" />
          <Skeleton className="w-8 h-8 rounded-md" />
          <Skeleton className="w-8 h-8 rounded-md" />
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Skeleton: Member Card ──────────────────────────────────────────
function MemberCardSkeleton({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3">
      {/* Top Section: Profile Header & Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="flex flex-col gap-1.5 min-w-0">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-36 rounded mt-0.5" />
          </div>
        </div>
        <Skeleton className="w-24 h-7 rounded-lg shrink-0" />
      </div>

      {/* Middle Section: Badges */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-14 rounded-md" />
      </div>
    </div>
  );
}

// ─── Role Badge Color ───────────────────────────────────────────────
function getRoleBadgeClasses(role: TeamMember['role']): string {
  switch (role) {
    case "Admin": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "User": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    default: return "bg-muted text-muted-foreground";
  }
}

// ─── Shared Actions Menu ────────────────────────────────────────
function UserActionsMenu({ user, dict, onEdit, onToggleStatus, onDelete, isToggling }: { user: TeamMember; dict: ReturnType<typeof useTranslation>["t"]["users"]; onEdit: () => void; onToggleStatus: (user: TeamMember) => void; onDelete: (user: TeamMember) => void; isToggling?: boolean; }) {
  const currentUser = useAuthStore((state) => state.user);

  // Rule: Workers (non-Admins) cannot edit their own account in the Team management page
  if (currentUser?.id === user.id && currentUser?.role !== 'Admin') {
    return (
      <div className="flex items-center justify-end h-8">
        <span className="text-[10px] font-medium text-text-subtle italic bg-surface-subtle px-2 py-1 rounded">
          {dict.roles[user.role]}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      {/* Edit */}
      <Tooltip>
        <TooltipTrigger render={
          <button onClick={onEdit} className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/30 transition-all duration-200 cursor-pointer">
            <Pencil size={13} />
          </button>
        } />
        <TooltipContent>{dict.actions.edit}</TooltipContent>
      </Tooltip>

      {/* Suspend/Unsuspend */}
      <Tooltip>
        <TooltipTrigger render={
          <button 
            onClick={() => !isToggling && onToggleStatus(user)} 
            disabled={isToggling}
            className={`inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 transition-all duration-200 cursor-pointer ${isToggling ? "opacity-50 cursor-not-allowed" : user.is_banned === 0 ? "text-text-subtle hover:text-orange-400 hover:bg-orange-500/15 hover:border-orange-500/30" : "text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30"}`}
          >
            {isToggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-text-subtle" />
            ) : user.is_banned === 0 ? (
              <Ban size={13} />
            ) : (
              <ShieldAlert size={13} />
            )}
          </button>
        } />
        <TooltipContent>{user.is_banned === 0 ? dict.actions.ban : dict.actions.unban}</TooltipContent>
      </Tooltip>

      {/* Delete */}
      <Tooltip>
        <TooltipTrigger render={
          <button onClick={() => onDelete(user)} className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 cursor-pointer">
            <Trash2 size={13} />
          </button>
        } />
        <TooltipContent>{dict.actions.delete}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function MemberCard({
  user,
  dict,
  getInitials,
  formatDate,
  onEdit,
  onToggleStatus,
  onDelete,
  isAdmin,
  onSelect,
  isToggling,
}: {
  user: TeamMember;
  dict: ReturnType<typeof useTranslation>["t"]["users"];
  getInitials: (name: string) => string;
  formatDate: (dateStr: string) => string;
  onEdit: () => void;
  onToggleStatus: (user: TeamMember) => void;
  onDelete: (user: TeamMember) => void;
  isAdmin: boolean;
  onSelect: () => void;
  isToggling?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-md hover:border-border-subtle group cursor-pointer"
    >
      {/* Top Section: Profile Header & Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0">
            <Avatar size="default" className="border border-border-default/80">
              {user.photo_url && <AvatarImage src={user.photo_url} alt={user.full_name} />}
              <AvatarFallback className="text-xs font-semibold bg-surface-subtle text-foreground border border-border-default/40">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-sm font-bold text-foreground truncate m-0 leading-tight text-start" dir="auto">
              {user.full_name}
            </h4>
            <span className="text-[11px] text-text-subtle/80 mt-0.5 truncate text-start" dir="ltr" style={{ unicodeBidi: "isolate" }}>
              @{user.username}
            </span>
            <span className="text-[11px] text-text-muted mt-0.5 truncate text-start" dir="ltr" style={{ unicodeBidi: "isolate" }}>
              {user.email}
            </span>
          </div>
        </div>

        {/* Actions Menu */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 shrink-0"
        >
          <UserActionsMenu user={user} dict={dict} onEdit={onEdit} onToggleStatus={onToggleStatus} onDelete={onDelete} isToggling={isToggling} />
        </div>
      </div>

      {/* Middle Section: Badges */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getRoleBadgeClasses(user.role)}`}>
          {dict.roles[user.role]}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${user.is_banned === 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"}`}>
          {dict.status[user.is_banned === 0 ? "active" : "banned"]}
        </span>
      </div>
    </div>
  );
}

// ─── View Mode Toggle ───────────────────────────────────────────────
type ViewMode = "table" | "cards";

// ─── Main Page ──────────────────────────────────────────────────────
export default function UsersPage() {
  const { t } = useTranslation();
  const dict = t.users;
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === "Admin";

  const state = useTeamPageState();
  const { getInitials, formatDate, filterTabs } = state;

  if (state.isForbidden) {
    return (
      <DashboardLayout pageTitle={dict.pageTitle}>
        <PermissionDenied />
      </DashboardLayout>
    );
  }

  return (
    <TooltipProvider delay={200}>
      <DashboardLayout pageTitle={dict.pageTitle}>
        <div className="flex flex-col gap-6 w-full">

          {/* ── Page Header ─────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground m-0 mb-1">{dict.pageTitle}</h2>
            </div>
            <Button size="sm" onClick={state.openAddDialog} className="w-full sm:w-auto self-start sm:self-auto">
              <Plus size={16} />
              {dict.actions.addUser}
            </Button>
          </div>

          {/* ── Stat Cards ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {state.isStatsLoading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard icon={Users} label={dict.stats.totalUsers} value={state.stats.total} color="bg-primary/10 text-primary" />
                <StatCard icon={UserCheck} label={dict.stats.activeUsers} value={state.stats.active} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
                <StatCard icon={UserX} label={dict.stats.bannedUsers} value={state.stats.banned} color="bg-red-500/10 text-red-600 dark:text-red-400" />
                <StatCard icon={ShieldCheck} label={dict.stats.adminUsers} value={state.stats.admins} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
              </>
            )}
          </div>

          {/* ── Search, Filter & View Toggle Bar ────────────────── */}
          <div className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3">
            {/* Search */}
            <div className="w-full">
              <Input
                id="users-search"
                name="users_search_field"
                icon={Search}
                value={state.searchQuery}
                onChange={(e) => { state.setSearchQuery(e.target.value); state.setCurrentPage(1); }}
                placeholder={dict.search.placeholder}
                className="h-10 rounded-lg text-sm w-full"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {/* Filters (Left) & View Toggle (Right) */}
            <div className="flex items-center justify-between gap-3 w-full">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-surface-subtle rounded-lg p-1 overflow-x-auto whitespace-nowrap scrollbar-hide max-w-full">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => { state.setStatusFilter(tab.value); state.setCurrentPage(1); }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${state.statusFilter === tab.value
                        ? "bg-primary text-white shadow-sm"
                        : "bg-transparent text-text-muted hover:text-foreground"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="hidden md:flex items-center gap-1 bg-surface-subtle rounded-lg p-1 shrink-0">
                <button
                  onClick={() => state.setViewMode("table")}
                  title={dict.search.viewTable}
                  className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${state.viewMode === "table"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-transparent text-text-muted hover:text-foreground"
                    }`}
                >
                  <TableProperties size={16} />
                </button>
                <button
                  onClick={() => state.setViewMode("cards")}
                  title={dict.search.viewCards}
                  className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${state.viewMode === "cards"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-transparent text-text-muted hover:text-foreground"
                    }`}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Content Area ─────────────────────────────────────── */}
          {state.isTeamLoading ? (
            <>
              {/* ── Skeleton: Table (Desktop) ── */}
              {state.viewMode === "table" && (
                <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                  <Table className="min-w-[1200px]" columnWidths={[24, 12, 12, 10, 8, 12, 12, 10]}>
                    <TableHeader>
                      <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-14" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                        <TableHead className="text-end"><Skeleton className="h-4 w-12 ms-auto" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* ── Skeleton: Cards ── */}
              <div className={state.viewMode === "cards" 
                ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
                : "grid grid-cols-1 sm:grid-cols-2 md:hidden gap-3"
              }>
                <MemberCardSkeleton isAdmin={isAdmin} />
                <MemberCardSkeleton isAdmin={isAdmin} />
                <MemberCardSkeleton isAdmin={isAdmin} />
                <MemberCardSkeleton isAdmin={isAdmin} />
                <MemberCardSkeleton isAdmin={isAdmin} />
                <MemberCardSkeleton isAdmin={isAdmin} />
              </div>
            </>
          ) : state.users.length === 0 ? (
            <div className="bg-surface-card border border-border-default rounded-xl flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
                <Search size={24} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted m-0">{dict.search.noResults}</p>
            </div>
          ) : (
            <>
              {/* ── Desktop Table View ── */}
              {state.viewMode === "table" && (
                <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                  <Table className="min-w-[1200px]" columnWidths={[24, 12, 12, 10, 8, 12, 12, 10]}>
                    <TableHeader>
                      <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                        <TableHead className="whitespace-nowrap">{dict.table.user}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table.username}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table.jobTitle}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table.role}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table.status}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table.createdAt}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table.createdBy}</TableHead>
                        <TableHead className="text-end whitespace-nowrap">{dict.table.actions}</TableHead>
                      </TableRow>
                      </TableHeader>
                    <TableBody>
                      {state.users.map((user) => (
                        <TableRow key={user.id} className="group cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => state.openDetailDialog(user)}>
                          <TableCell className="max-w-[240px] overflow-hidden">
                            <div className="flex items-center gap-3 min-w-0 w-full overflow-hidden">
                              <Avatar size="default" className="border border-border-default/80 shrink-0">
                                {user.photo_url && <AvatarImage src={user.photo_url} alt={user.full_name} />}
                                <AvatarFallback className="text-xs font-semibold bg-surface-subtle text-foreground border border-border-default/40">
                                  {getInitials(user.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0 w-full overflow-hidden">
                                <span className="text-sm font-semibold text-foreground truncate block w-full text-start" dir="auto" title={user.full_name}>{user.full_name}</span>
                                <span className="text-xs text-text-muted truncate block w-full text-start" dir="ltr" style={{ unicodeBidi: "isolate" }} title={user.email}>{user.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap max-w-[140px] overflow-hidden">
                            <span className="text-sm text-text-subtle font-mono truncate block w-full text-start" dir="ltr" style={{ unicodeBidi: "isolate" }} title={`@${user.username}`}>@{user.username}</span>
                          </TableCell>
                          <TableCell className="max-w-[150px] overflow-hidden">
                            {user.job_title ? (
                              <span className="text-sm font-medium text-text-subtle truncate block w-full text-start" dir="auto" title={user.job_title}>
                                {user.job_title}
                              </span>
                            ) : (
                              <span className="text-text-muted text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getRoleBadgeClasses(user.role)}`}>
                              {dict.roles[user.role]}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${user.is_banned === 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"}`}>
                              {dict.status[user.is_banned === 0 ? "active" : "banned"]}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="text-xs font-medium text-foreground whitespace-nowrap" dir="ltr" style={{ unicodeBidi: "isolate" }}>{user.created_at ? formatDate(user.created_at) : "-"}</span>
                          </TableCell>
                          <TableCell className="max-w-[130px] overflow-hidden">
                            <span className="text-xs font-medium text-foreground truncate block w-full text-start" dir="auto" title={user.created_by || "-"}>{user.created_by || "-"}</span>
                          </TableCell>
                          <TableCell className="text-end whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5 shrink-0 whitespace-nowrap">
                              <UserActionsMenu user={user} dict={dict} onEdit={() => state.openEditDialog(user)} onToggleStatus={state.handleToggleStatus} onDelete={state.handleDelete} isToggling={state.toggleStatusMutation.isPending && state.toggleStatusMutation.variables?.id === user.id} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* ── Desktop Cards View ── */}
              {state.viewMode === "cards" && (
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {state.users.map((user) => (
                    <MemberCard
                      key={user.id}
                      user={user}
                      dict={dict}
                      getInitials={getInitials}
                      formatDate={formatDate}
                      onEdit={() => state.openEditDialog(user)}
                      onToggleStatus={state.handleToggleStatus}
                      onDelete={state.handleDelete}
                      isAdmin={isAdmin}
                      onSelect={() => state.openDetailDialog(user)}
                      isToggling={state.toggleStatusMutation.isPending && state.toggleStatusMutation.variables?.id === user.id}
                    />
                  ))}
                </div>
              )}

              {/* ── Mobile Cards (always cards on mobile) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:hidden gap-3">
                {state.users.map((user) => (
                  <MemberCard
                    key={user.id}
                    user={user}
                    dict={dict}
                    getInitials={getInitials}
                    formatDate={formatDate}
                    onEdit={() => state.openEditDialog(user)}
                    onToggleStatus={state.handleToggleStatus}
                    onDelete={state.handleDelete}
                    isAdmin={isAdmin}
                    onSelect={() => state.openDetailDialog(user)}
                    isToggling={state.toggleStatusMutation.isPending && state.toggleStatusMutation.variables?.id === user.id}
                  />
                ))}
              </div>

              {/* ── Pagination ── */}
              {state.totalPages > 1 && (
                <PaginationControl
                  currentPage={state.currentPage}
                  totalPages={state.totalPages}
                  onPageChange={state.setCurrentPage}
                />
              )}
            </>
          )}
        </div>

        {/* ── Form Dialog ── */}
        <UserFormDialog open={state.isFormOpen} onOpenChange={state.setIsFormOpen} user={state.editingUser} dict={dict} />

        {/* ── Details Dialog ── */}
        <UserDetailDialog open={state.isDetailOpen} onOpenChange={state.setIsDetailOpen} user={state.detailUser} isAdmin={isAdmin} />

        <ConfirmationModal
          open={state.isDeleteModalOpen}
          onOpenChange={state.setIsDeleteModalOpen}
          title={dict.actions.deleteUser}
          description={dict.actions.confirmDelete}
          onConfirm={state.confirmDelete}
          confirmLabel={dict.actions.delete}
          cancelLabel={dict.actions.cancel}
          isLoading={state.deleteMutation.isPending}
          variant="danger"
        />
      </DashboardLayout>
    </TooltipProvider>
  );
}
