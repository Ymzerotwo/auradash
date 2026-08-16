"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, UserCheck, ShieldAlert, Search, Plus,
  Pencil, Ban, Trash2, LayoutGrid, TableProperties, Loader2,
} from "lucide-react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type Customer } from "@/lib/services/customer.service";
import { useCustomersPage } from "@/lib/hooks/useCustomers";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { useAuthStore } from "@/lib/stores/auth.store";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { localizeNumber } from "@/lib/utils";

// ─── Stat Card ──────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition-all duration-200 hover:shadow-md hover:border-border-subtle min-w-0">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{value}</span>
        <span className="text-[10px] sm:text-xs font-medium text-text-muted mt-0.5 leading-tight">{label}</span>
      </div>
    </div>
  );
}

// ─── Skeleton: Stat Cards ───────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-5 flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-3 w-24 rounded-md" />
      </div>
    </div>
  );
}

const columnWidths = [22, 13, 13, 13, 13, 13, 13];

// ─── Skeleton: Table Rows ───────────────────────────────────────────
function CustomerTableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-28 rounded bg-surface-subtle" />
          <Skeleton className="h-3 w-36 rounded bg-surface-subtle" />
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-4 w-24 rounded bg-surface-subtle" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16 rounded bg-surface-subtle" /></TableCell>
      <TableCell><Skeleton className="h-5 w-14 rounded bg-surface-subtle" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20 rounded bg-surface-subtle" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20 rounded bg-surface-subtle" /></TableCell>
      <TableCell className="text-end">
        <div className="flex items-center gap-1 justify-end">
          <Skeleton className="w-8 h-8 rounded-md bg-surface-subtle" />
          <Skeleton className="w-8 h-8 rounded-md bg-surface-subtle" />
          <Skeleton className="w-8 h-8 rounded-md bg-surface-subtle" />
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Skeleton: Customer Card ──────────────────────────────────────────
function CustomerCardSkeleton() {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-5 w-3/4 rounded-md bg-surface-subtle" />
          <Skeleton className="h-4 w-1/2 rounded-md bg-surface-subtle" />
          <Skeleton className="h-3 w-1/3 rounded-md bg-surface-subtle" />
        </div>
        <Skeleton className="h-5 w-16 rounded-md bg-surface-subtle shrink-0" />
      </div>
      <div className="mt-auto pt-2.5 border-t border-border-subtle flex items-center justify-between">
        <Skeleton className="h-3.5 w-24 rounded-md bg-surface-subtle" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-7 rounded-md bg-surface-subtle" />
          <Skeleton className="h-7 w-7 rounded-md bg-surface-subtle" />
          <Skeleton className="h-7 w-7 rounded-md bg-surface-subtle" />
        </div>
      </div>
    </div>
  );
}

// ─── Shared Actions Menu ────────────────────────────────────────
function CustomerActionsMenu({ customer, dict, onEdit, onToggleStatus, onDelete }: { customer: Customer; dict: ReturnType<typeof useTranslation>["t"]["customers"]; onEdit: () => void; onToggleStatus: (c: Customer) => void; onDelete: (c: Customer) => void; }) {
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === 'Admin';

  return (
    <div className="flex items-center gap-1.5 justify-end">
      {/* Edit */}
      <Tooltip>
        <TooltipTrigger onClick={onEdit} className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/30 transition-all duration-200 cursor-pointer">
          <Pencil size={13} />
        </TooltipTrigger>
        <TooltipContent>{dict.actions.edit}</TooltipContent>
      </Tooltip>

      {/* Suspend/Unsuspend */}
      {(!customer.spam || isAdmin) && (
        <Tooltip>
          <TooltipTrigger 
            onClick={() => onToggleStatus(customer)} 
            className={`inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 transition-all duration-200 cursor-pointer ${!customer.spam ? "text-text-subtle hover:text-orange-400 hover:bg-orange-500/15 hover:border-orange-500/30" : "text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30"}`}
          >
            {!customer.spam ? <Ban size={13} /> : <ShieldAlert size={13} />}
          </TooltipTrigger>
          <TooltipContent>{!customer.spam ? dict.actions.spam : dict.actions.unspam}</TooltipContent>
        </Tooltip>
      )}

      {/* Delete (Admin only) */}
      {isAdmin && (
        <Tooltip>
          <TooltipTrigger onClick={() => onDelete(customer)} className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 cursor-pointer">
            <Trash2 size={13} />
          </TooltipTrigger>
          <TooltipContent>{dict.actions.delete}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// ─── Member Card ────────────────────────────────────────────────────
function MemberCard({
  customer,
  dict,
  formatDate,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  customer: Customer;
  dict: ReturnType<typeof useTranslation>["t"]["customers"];
  formatDate: (dateStr: string) => string;
  onEdit: () => void;
  onToggleStatus: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}) {
  const router = useRouter();
  const { locale } = useTranslation();
  return (
    <div 
      onClick={() => router.push(`/customers/${customer.id}`)}
      className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-2.5 transition-all duration-200 hover:shadow-md hover:border-border-subtle group cursor-pointer"
    >
      {/* Top: Customer Details + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="text-base font-bold text-foreground line-clamp-1 m-0 text-start" dir="auto" title={customer.full_name}>
            {customer.full_name}
          </h3>
          <p className="text-xs text-text-muted font-mono truncate m-0 text-start" dir="ltr" style={{ unicodeBidi: "isolate" }}>
            {customer.email || "—"}
          </p>
          <span className="text-xs font-mono text-foreground font-medium text-start" dir="ltr" style={{ unicodeBidi: "isolate" }}>{localizeNumber(customer.phone || "—", locale)}</span>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${!customer.spam ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"} shadow-sm`}>
          {dict.status[!customer.spam ? "active" : "spammed"]}
        </span>
      </div>

      {/* Footer: Created By + Actions */}
      <div className="mt-auto pt-2.5 border-t border-border-subtle flex items-center justify-between min-h-[28px]">
        <div className="text-[11px] text-text-muted truncate max-w-[150px]" title={customer.created_by_name || "inbox"}>
          <span><span className="font-semibold text-foreground">{dict.table?.createdBy || "Created by"}:</span> <span dir="auto">{customer.created_by_name || "inbox"}</span></span>
        </div>
        <div className="actions-menu" onClick={(e) => e.stopPropagation()}>
          <CustomerActionsMenu customer={customer} dict={dict} onEdit={onEdit} onToggleStatus={onToggleStatus} onDelete={onDelete} />
        </div>
      </div>
    </div>
  );
}

// ─── View Mode Toggle ───────────────────────────────────────────────
type ViewMode = "table" | "cards";

// ─── Main Page ──────────────────────────────────────────────────────
export default function CustomersPage() {
  const {
    dict, router, locale,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    customers, stats, isCustomerLoading, isStatsLoading, isInitialLoading, isForbidden,
    viewMode, setViewMode, filterTabs,
    isDeleteModalOpen, setIsDeleteModalOpen, customerToDelete, setCustomerToDelete,
    isSpamModalOpen, setIsSpamModalOpen, customerToSpam, setCustomerToSpam, spamReason, setSpamReason,
    isFormDialogOpen, setIsFormDialogOpen, customerToEdit, setCustomerToEdit,
    handleToggleStatus, confirmSpam, handleDelete, confirmDelete, openAddDialog, openEditDialog, formatDate,
    spamMutation, deleteMutation
  } = useCustomersPage();

  if (isForbidden) {
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
            <Button size="sm" onClick={openAddDialog} className="w-full sm:w-auto self-start sm:self-auto">
              <Plus size={16} />
              {dict.actions.addCustomer}
            </Button>
          </div>

          {/* ── Stat Cards ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {isStatsLoading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard icon={Users} label={dict.stats.total} value={localizeNumber(stats.total, locale)} color="bg-primary/10 text-primary" />
                <StatCard icon={UserCheck} label={dict.stats.active} value={localizeNumber(stats.active, locale)} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
                <StatCard icon={ShieldAlert} label={dict.stats.spammed} value={localizeNumber(stats.spammed, locale)} color="bg-red-500/10 text-red-600 dark:text-red-400" />
              </>
            )}
          </div>

          {/* ── Search, Filter & View Toggle Bar ────────────────── */}
          <div className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3">
            {/* Search */}
            <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="w-full">
              <Input
                id="customers-search-box"
                name="search_query_ignore"
                icon={Search}
                autoComplete="new-password"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={dict.search.placeholder}
                className="h-10 rounded-lg text-sm w-full"
              />
            </form>

            {/* Filters (Left) & View Toggle (Right) */}
            <div className="flex items-center justify-between gap-3 w-full">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-surface-subtle rounded-lg p-1 overflow-x-auto whitespace-nowrap scrollbar-hide max-w-full">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${statusFilter === tab.value
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
                  onClick={() => setViewMode("table")}
                  title={dict.search.viewTable}
                  className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${viewMode === "table"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-transparent text-text-muted hover:text-foreground"
                    }`}
                >
                  <TableProperties size={16} />
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  title={dict.search.viewCards}
                  className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${viewMode === "cards"
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
          {isCustomerLoading ? (
            viewMode === "table" ? (
              <>
                {/* ── Skeleton: Table (Desktop) ── */}
                <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                  <Table className="min-w-[1200px]" columnWidths={columnWidths}>
                    <TableHeader>
                      <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50 border-border-default">
                        <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                        <TableHead className="text-end"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <CustomerTableRowSkeleton key={i} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* ── Skeleton: Mobile Cards ── */}
                <div className="flex flex-col md:hidden gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <CustomerCardSkeleton key={i} />
                  ))}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CustomerCardSkeleton key={i} />
                ))}
              </div>
            )
          ) : customers.length === 0 ? (
            <div className="bg-surface-card border border-border-default rounded-xl flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
                <Search size={24} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted m-0">{dict.search.noResults}</p>
            </div>
          ) : (
            <>
              {/* ── Desktop Table View ── */}
              {viewMode === "table" && (
                <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                  <Table className="min-w-[1200px]" columnWidths={columnWidths}>
                    <TableHeader>
                      <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                        <TableHead className="whitespace-nowrap">{dict.table.customer}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table.phone}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table.source}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table.status}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table.createdBy || "Created By"}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table.created || "Created At"}</TableHead>
                        <TableHead className="text-end whitespace-nowrap">{dict.table.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow 
                          key={customer.id} 
                          className="group cursor-pointer hover:bg-surface-subtle/50 transition-colors"
                          onClick={() => router.push(`/customers/${customer.id}`)}
                        >
                          <TableCell className="max-w-[220px] overflow-hidden">
                            <div className="flex items-center gap-3 min-w-0 w-full overflow-hidden">
                              <div className="flex flex-col min-w-0 w-full overflow-hidden">
                                <span className="text-sm font-semibold text-foreground truncate w-full block text-start" dir="auto" title={customer.full_name}>{customer.full_name}</span>
                                <span className="text-xs text-text-muted truncate w-full block text-start" dir="ltr" style={{ unicodeBidi: "isolate" }} title={customer.email || "—"}>{customer.email || "—"}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="text-xs font-medium text-foreground font-mono inline-block text-start" dir="ltr" style={{ unicodeBidi: "isolate" }}>{localizeNumber(customer.phone || "", locale)}</span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="text-xs font-medium text-foreground capitalize text-start" dir="auto">{customer.acquisition_source || "—"}</span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${!customer.spam ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"}`}>
                              {dict.status[!customer.spam ? "active" : "spammed"]}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[150px] overflow-hidden">
                            <span className="text-xs font-medium text-foreground truncate block w-full text-start" dir="auto" title={customer.created_by_name || "inbox"}>{customer.created_by_name || "inbox"}</span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="text-xs font-medium text-foreground whitespace-nowrap">{formatDate(customer.created_at)}</span>
                          </TableCell>
                          <TableCell className="text-end whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <CustomerActionsMenu customer={customer} dict={dict} onEdit={() => openEditDialog(customer)} onToggleStatus={handleToggleStatus} onDelete={handleDelete} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* ── Desktop Cards View ── */}
              {viewMode === "cards" && (
                <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {customers.map((customer) => (
                    <MemberCard
                      key={customer.id}
                      customer={customer}
                      dict={dict}
                      formatDate={formatDate}
                      onEdit={() => openEditDialog(customer)}
                      onToggleStatus={handleToggleStatus}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}

              {/* ── Mobile Cards (always cards on mobile) ── */}
              <div className="flex flex-col md:hidden gap-3">
                {customers.map((customer) => (
                  <MemberCard
                    key={customer.id}
                    customer={customer}
                    dict={dict}
                    formatDate={formatDate}
                    onEdit={() => openEditDialog(customer)}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Form Dialog ── */}
        <CustomerFormDialog
          open={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          customer={customerToEdit}
        />

        {/* ── Delete Modal ── */}
        <ConfirmationModal
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          title={dict.actions.deleteCustomer}
          description={dict.actions.confirmDelete}
          onConfirm={confirmDelete}
          confirmLabel={dict.actions.delete}
          cancelLabel={dict.actions.cancel}
          isLoading={deleteMutation.isPending}
          variant="danger"
        />

        {/* ── Spam Modal ── */}
        <Dialog open={isSpamModalOpen} onOpenChange={setIsSpamModalOpen}>
          <DialogContent 
            className="w-[calc(100vw-2rem)] sm:w-full !max-w-[330px] p-0 overflow-hidden !rounded-2xl bg-surface-card border border-border-default/60 shadow-2xl"
            showCloseButton={false}
          >
            <div className="relative px-5 pt-5 pb-1 flex flex-col items-center text-center">
              <div className="absolute inset-x-0 top-0 h-[2px] opacity-80 bg-gradient-to-r from-transparent via-danger to-transparent" />
              
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 shadow-sm transition-transform duration-300 bg-danger/10 text-danger">
                <Ban size={18} />
              </div>
              
              <DialogHeader className="flex flex-col items-center gap-1">
                <DialogTitle className="text-[15px] font-bold text-foreground tracking-tight leading-snug">
                  {dict.actions.spamCustomer}
                </DialogTitle>
                <DialogDescription className="text-[13px] text-text-muted leading-relaxed max-w-[270px]">
                  {dict.actions.spamDescription}
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <div className="px-5 py-2">
              <Textarea
                value={spamReason}
                onChange={(e) => setSpamReason(e.target.value)}
                placeholder="..."
                className="resize-none h-20 text-[13px] rounded-xl"
              />
            </div>

            <div className="px-5 pb-5 pt-3 grid grid-cols-2 gap-2.5">
              <Button 
                variant="outline" 
                onClick={() => setIsSpamModalOpen(false)}
                className="w-full h-9 text-[13px] font-medium border-border-default/60 bg-surface-subtle/30 hover:bg-surface-subtle text-foreground transition-all cursor-pointer truncate"
              >
                {dict.actions.cancel}
              </Button>
              <Button 
                onClick={confirmSpam} 
                disabled={spamReason.trim().length < 3 || spamMutation.isPending}
                className="w-full h-9 text-[13px] font-semibold shadow-md transition-all gap-1.5 cursor-pointer bg-danger hover:bg-danger/90 shadow-danger/20 text-white truncate"
              >
                {spamMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span className="truncate">{dict.actions.confirmSpam}</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
      </DashboardLayout>
    </TooltipProvider>
  );
}
