"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PermissionGuard } from "@/components/layout/PermissionGuard";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, LayoutGrid, TableProperties, Plus, Calendar, Trash2, Pencil, Check, Loader2, X } from "lucide-react";
import { useBookingsPage } from "@/lib/hooks/useBookings";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingFormDialog } from "./BookingFormDialog";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import React from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { localizeNumber } from "@/lib/utils";

export default function BookingsPage() {
  const {
    router, dict, user, hasPermission, locale,
    viewMode, setViewMode,
    filterStatus, setFilterStatus,
    searchQuery, setSearchQuery,
    page, setPage,
    isCreateOpen, setIsCreateOpen,
    editingBookingId, setEditingBookingId,
    isLoading, filteredBookings,
    getStatusBadgeVariant, getPaymentBadgeVariant,
    formatDate, formatDateRange,
    deleteMutation, isDeleteModalOpen, setIsDeleteModalOpen,
    bookingToDelete, setBookingToDelete,
    handleCreateBooking, handleEditBooking, handleDeleteBooking, confirmDelete,
    changeStatusMutation, handleConfirmBooking, handleCompleteBooking, handleCancelBooking
  } = useBookingsPage();

  if (user && !hasPermission("bookings") && !hasPermission("bookings.view") && user.role !== "Admin") {
    return (
      <DashboardLayout pageTitle={dict?.pageTitle || "Bookings Management"}>
        <PermissionDenied />
      </DashboardLayout>
    );
  }

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "pending": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "in_progress": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "cancelled": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default: return "bg-surface-subtle text-text-subtle border-border-default";
    }
  };

  const getPaymentBadgeClasses = (status: string) => {
    switch (status) {
      case "paid": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "partial": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "unpaid": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default: return "bg-surface-subtle text-text-subtle border-border-default/40";
    }
  };

  return (
    <PermissionGuard>
      <TooltipProvider delay={200}>
        <DashboardLayout pageTitle={dict?.pageTitle || "Bookings Management"}>
          <div className="flex flex-col gap-6 w-full">
            
            {/* ── Page Header ─────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground m-0 mb-1">{dict?.pageTitle || "Bookings Management"}</h2>
              </div>
              <Button onClick={handleCreateBooking} size="sm" className="w-full sm:w-auto shadow-sm">
                <Plus size={16} className="me-2" />
                {dict?.createBooking}
              </Button>
            </div>

        {/* ── Search, Filter & View Toggle Bar ────────────────── */}
        <div className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3">
          {/* Search */}
          <div className="w-full">
            <Input
              icon={Search}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder={dict?.searchPlaceholder || "Search by customer name or phone..."}
              className="h-10 rounded-lg text-sm w-full"
            />
          </div>

          {/* Filters (Left) & View Toggle (Right) */}
          <div className="flex items-center justify-between gap-3 w-full">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-surface-subtle rounded-lg p-1 overflow-x-auto whitespace-nowrap scrollbar-hide max-w-full">
              {[
                { id: "all", label: dict?.filterAll || "All" },
                { id: "pending", label: dict?.filterPending || "Pending" },
                { id: "in_progress", label: dict?.filterInProgress || "In Progress" },
                { id: "completed", label: dict?.filterCompleted || "Completed" },
                { id: "cancelled", label: dict?.filterCancelled || "Cancelled" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setFilterStatus(tab.id); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${filterStatus === tab.id
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
                title="Table view"
                className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${viewMode === "table"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-transparent text-text-muted hover:text-foreground"
                  }`}
              >
                <TableProperties size={16} />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                title="Cards view"
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
        {isLoading ? (
          <BookingsSkeleton viewMode={viewMode} dict={dict} />
        ) : filteredBookings.length === 0 ? (
          <div className="bg-surface-card border border-border-default rounded-xl flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
              <Calendar size={24} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-muted m-0">
              {searchQuery ? (dict?.noResults || "No bookings found matching filters.") : (dict?.emptyState || "No bookings available at the moment.")}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            {viewMode === "table" && (
              <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                <Table className="min-w-[1400px]" columnWidths={[9, 13, 21, 10, 9, 9, 9, 12, 8]}>
                  <TableHeader>
                    <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                      <TableHead className="font-semibold whitespace-nowrap">{dict?.table?.bookingNumber}</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">{dict?.table?.customer}</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">{dict?.table?.dates}</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">{dict?.table?.financials}</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">{dict?.table?.status}</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">{dict?.table?.payment}</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">{dict?.table?.createdBy}</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">{dict?.table?.createdAt}</TableHead>
                      <TableHead className="text-end font-semibold whitespace-nowrap">{dict?.table?.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {filteredBookings.map((b) => (
                      <TableRow 
                        key={b.id} 
                        onClick={() => router.push(`/bookings/${b.id}`)}
                        className="group cursor-pointer hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="whitespace-nowrap">
                          <span className="text-sm font-mono font-bold text-foreground" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                            {b.booking_number ? (b.booking_number.startsWith('#') ? b.booking_number : `#${b.booking_number}`) : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] overflow-hidden">
                          <div className="flex flex-col min-w-0 w-full items-start overflow-hidden">
                            <span className="text-sm font-semibold text-foreground truncate w-full block text-start" dir="auto" title={b.customer_name || "Unknown"}>{b.customer_name || "Unknown"}</span>
                            <span className="text-xs text-text-muted truncate w-full block text-start" dir="ltr" style={{ unicodeBidi: "isolate" }}>{localizeNumber(b.customer_phone || "", locale)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[240px] overflow-hidden whitespace-nowrap">
                          <div className="flex flex-col min-w-0 w-full overflow-hidden">
                            <span className="text-sm font-semibold text-foreground truncate block text-start" dir="auto" title={formatDateRange(b.scheduled_from, b.scheduled_to)}>
                              {formatDateRange(b.scheduled_from, b.scheduled_to)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-foreground" dir="ltr" style={{ unicodeBidi: "isolate" }}>${localizeNumber(b.total_paid?.toFixed(2) || "0.00", locale)}</span>
                            <span className="text-xs text-text-muted">{dict?.payment?.paid || "Paid"}: <span dir="ltr" style={{ unicodeBidi: "isolate" }}>${localizeNumber(b.paid_amount?.toFixed(2) || "0.00", locale)}</span></span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getStatusBadgeClasses(b.status)}`}>
                            {dict?.status?.[b.status as keyof typeof dict.status] || b.status}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getPaymentBadgeClasses(b.paid_status)}`}>
                            {dict?.payment?.[b.paid_status as keyof typeof dict.payment] || b.paid_status}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[150px] overflow-hidden">
                          <span className="text-sm font-medium text-foreground truncate block w-full text-start" dir="auto" title={b.created_by_name || "System"}>
                            {b.created_by_name || "System"}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="text-xs font-medium text-foreground whitespace-nowrap" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                            {formatDate(b.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-end whitespace-nowrap" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 shrink-0 whitespace-nowrap" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                            {b.status === "pending" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); handleConfirmBooking(b.id); }}
                                    onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                                    disabled={changeStatusMutation.isPending}
                                    className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer"
                                  >
                                    {changeStatusMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{dict?.confirmBooking || "Confirm Booking"}</TooltipContent>
                              </Tooltip>
                            )}

                            {b.status === "in_progress" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); handleCompleteBooking(b.id); }}
                                    onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                                    disabled={changeStatusMutation.isPending}
                                    className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer"
                                  >
                                    {changeStatusMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{dict?.completeBooking || "Complete Booking"}</TooltipContent>
                              </Tooltip>
                            )}

                            {(b.status === "pending" || b.status === "in_progress") && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); handleCancelBooking(b.id); }}
                                    onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                                    disabled={changeStatusMutation.isPending}
                                    className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-orange-400 hover:bg-orange-500/15 hover:border-orange-500/30 transition-all duration-200 cursor-pointer"
                                  >
                                    <X size={13} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{dict?.cancelBooking || "Cancel Booking"}</TooltipContent>
                              </Tooltip>
                            )}

                            {b.status === "pending" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); handleEditBooking(b.id); }} 
                                    onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                                    className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/30 transition-all duration-200 cursor-pointer"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{dict?.editBooking || "Edit Booking"}</TooltipContent>
                              </Tooltip>
                            )}

                            {b.status === "cancelled" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); handleDeleteBooking(b.id); }} 
                                    onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                                    className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{dict?.deleteBooking || "Delete Booking"}</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Cards View (Desktop & Mobile) */}
            <div className={`grid gap-4 ${viewMode === "cards" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:hidden"}`}>
                {filteredBookings.map((b) => (
                  <div 
                    key={b.id} 
                    onClick={() => router.push(`/bookings/${b.id}`)}
                    className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col transition-all duration-200 hover:shadow-md hover:border-border-subtle group cursor-pointer"
                  >
                    {/* Header: Customer Details + Status & Booking Number */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-extrabold text-foreground truncate text-start" dir="auto">{b.customer_name || "Unknown"}</span>
                        <span className="text-xs text-text-muted font-medium text-start" dir="ltr" style={{ unicodeBidi: "isolate" }}>{localizeNumber(b.customer_phone || "No phone", locale)}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {b.booking_number && (
                          <span className="text-[10px] font-mono font-bold text-text-muted bg-surface-subtle border border-border-default px-2 py-0.5 rounded shrink-0" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                            #{b.booking_number}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getStatusBadgeClasses(b.status)}`}>
                          {dict?.status?.[b.status as keyof typeof dict.status] || b.status}
                        </span>
                      </div>
                    </div>

                    {/* Bottom: Created By, Action Buttons, Dates & Financials */}
                    <div className="mt-1 pt-2 border-t border-border-default/60 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                        <span className="font-semibold text-foreground shrink-0">{dict?.table?.createdBy || "Created by"}:</span>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-text-muted truncate text-start" dir="auto" title={b.created_by_name || ""}>{b.created_by_name || "—"}</span>
                        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                          {b.status === "pending" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); handleConfirmBooking(b.id); }}
                                  onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                                  disabled={changeStatusMutation.isPending}
                                  className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-md text-text-subtle hover:text-emerald-500 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent"
                                >
                                  {changeStatusMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{dict?.confirmBooking || "Confirm Booking"}</TooltipContent>
                            </Tooltip>
                          )}

                          {b.status === "in_progress" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); handleCompleteBooking(b.id); }}
                                  onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                                  disabled={changeStatusMutation.isPending}
                                  className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-md text-text-subtle hover:text-emerald-500 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent"
                                >
                                  {changeStatusMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{dict?.completeBooking || "Complete Booking"}</TooltipContent>
                            </Tooltip>
                          )}

                          {(b.status === "pending" || b.status === "in_progress") && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); handleCancelBooking(b.id); }}
                                  onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                                  disabled={changeStatusMutation.isPending}
                                  className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-md text-text-subtle hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent"
                                >
                                  <X size={13} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{dict?.cancelBooking || "Cancel Booking"}</TooltipContent>
                            </Tooltip>
                          )}

                          {b.status === "pending" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); handleEditBooking(b.id); }} 
                                  onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                                  className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-md text-text-subtle hover:text-amber-400 hover:bg-amber-500/15 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent"
                                >
                                  <Pencil size={13} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{dict?.editBooking || "Edit Booking"}</TooltipContent>
                            </Tooltip>
                          )}

                          {b.status === "cancelled" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); handleDeleteBooking(b.id); }} 
                                  onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                                  className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-md text-text-subtle hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{dict?.deleteBooking || "Delete Booking"}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>

                      <div className="flex justify-between items-center text-xs gap-2 min-w-0">
                        <span className="font-semibold text-foreground shrink-0">{dict?.table?.dates}:</span>
                        <span className="text-text-muted truncate" title={formatDateRange(b.scheduled_from, b.scheduled_to)}>{formatDateRange(b.scheduled_from, b.scheduled_to)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs gap-2 min-w-0">
                        <span className="font-semibold text-foreground shrink-0">{dict?.table?.financials}:</span>
                        <div className="flex items-center gap-1 shrink-0" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                          <span className="font-medium text-text-muted">${localizeNumber(b.total_paid?.toFixed(2) || "0.00", locale)}</span>
                          <span className="text-text-muted/80 text-[10px]">({dict?.payment?.paid || "Paid"}: ${localizeNumber(b.paid_amount?.toFixed(2) || "0.00", locale)})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          </>
        )}
      </div>
      <BookingFormDialog 
        open={isCreateOpen || !!editingBookingId} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingBookingId(null);
          }
        }} 
        bookingId={editingBookingId || undefined}
      />
      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title={dict?.deleteBooking || "Delete Booking"}
        description={dict?.confirmDelete || "Are you sure you want to delete this booking permanently? This action cannot be undone."}
        onConfirm={confirmDelete}
        confirmLabel={dict?.delete || "Delete"}
        cancelLabel={dict?.wizard?.cancel || "Cancel"}
        isLoading={deleteMutation.isPending}
      />
      </DashboardLayout>
      </TooltipProvider>
    </PermissionGuard>
  );
}

function BookingsSkeleton({ viewMode, dict }: { viewMode: "table" | "cards"; dict: any }) {
  return (
    <>
      {/* Desktop Table Skeleton */}
      {viewMode === "table" && (
        <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block animate-pulse">
          <Table className="min-w-[1400px]" columnWidths={[9, 13, 21, 10, 9, 9, 9, 12, 8]}>
            <TableHeader>
              <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50 border-border-default">
                <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-14" /></TableHead>
                <TableHead><Skeleton className="h-4 w-14" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="text-end"><Skeleton className="h-4 w-12 ml-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i} className="border-border-subtle hover:bg-transparent">
                  <TableCell className="align-middle py-4"><Skeleton className="h-4 w-20 bg-surface-subtle rounded-md" /></TableCell>
                  <TableCell className="align-middle py-4">
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-28 bg-surface-subtle rounded-md" />
                      <Skeleton className="h-3 w-20 bg-surface-subtle rounded-md" />
                    </div>
                  </TableCell>
                  <TableCell className="align-middle py-4"><Skeleton className="h-4 w-44 bg-surface-subtle rounded-md" /></TableCell>
                  <TableCell className="align-middle py-4">
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-16 bg-surface-subtle rounded-md" />
                      <Skeleton className="h-3.5 w-24 bg-surface-subtle rounded-md" />
                    </div>
                  </TableCell>
                  <TableCell className="align-middle py-4"><Skeleton className="h-6 w-20 rounded-full bg-surface-subtle" /></TableCell>
                  <TableCell className="align-middle py-4"><Skeleton className="h-6 w-16 rounded-full bg-surface-subtle" /></TableCell>
                  <TableCell className="align-middle py-4"><Skeleton className="h-4 w-28 bg-surface-subtle rounded-md" /></TableCell>
                  <TableCell className="align-middle py-4"><Skeleton className="h-4 w-24 bg-surface-subtle rounded-md" /></TableCell>
                  <TableCell className="align-middle py-4 text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Skeleton className="h-8 w-8 rounded-md bg-surface-subtle" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Cards Skeleton (Desktop & Mobile) */}
      <div className={`grid gap-4 ${viewMode === "cards" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:hidden"} animate-pulse`}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-4 w-28 bg-surface-subtle rounded-md" />
                  <Skeleton className="h-4.5 w-16 bg-surface-subtle rounded shrink-0" />
                </div>
                <Skeleton className="h-3 w-20 bg-surface-subtle rounded-md" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full bg-surface-subtle shrink-0" />
            </div>

            <div className="bg-surface-subtle rounded-lg p-3 border border-border-subtle flex-1 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16 bg-surface-card rounded-md" />
                <Skeleton className="h-3 w-28 bg-surface-card rounded-md" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16 bg-surface-card rounded-md" />
                <Skeleton className="h-3 w-28 bg-surface-card rounded-md" />
              </div>
              <div className="h-px bg-border-subtle/50 my-0.5" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-16 bg-surface-card rounded-md" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-4.5 w-12 bg-surface-card rounded-md" />
                  <Skeleton className="h-4.5 w-10 rounded-full bg-surface-card" />
                </div>
              </div>
              <div className="h-px bg-border-subtle/50 my-0.5" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16 bg-surface-card rounded-md" />
                <Skeleton className="h-3 w-24 bg-surface-card rounded-md" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16 bg-surface-card rounded-md" />
                <Skeleton className="h-3.5 w-28 bg-surface-card rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
