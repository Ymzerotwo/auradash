"use client";

import React from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BookingFormDialog } from "../BookingFormDialog";
import { useBookingDetailView } from "@/lib/hooks/useBookings";
import { localizeNumber } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Loader2, 
  ShieldAlert,
  History,
  CheckCircle2,
  XCircle,
  Plus,
  Check,
  X,
  Pencil
} from "lucide-react";

export default function BookingDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const {
    router, dict, wizardDict, isAdmin, booking, isLoading, isError,
    changeStatusMutation, deleteMutation, recordPaymentMutation,
    isEditOpen, setIsEditOpen,
    isDeleteModalOpen, setIsDeleteModalOpen,
    isCancelDialogOpen, setIsCancelDialogOpen,
    cancellationReason, setCancellationReason,
    isPaymentDialogOpen, setIsPaymentDialogOpen,
    paymentAmount, setPaymentAmount,
    paymentNotes, setPaymentNotes,
    isRtl, dateLocale,
    handleRecordPayment, handleConfirmBooking, handleCompleteBooking, handleConfirmCancel, confirmDelete,
    getStatusBadgeVariant, getPaymentBadgeVariant, formatDate, durationMinutes, formatDuration, locale
  } = useBookingDetailView(id);

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
    const s = status?.toLowerCase().replace('partially_paid', 'partial').replace('partially paid', 'partial');
    switch (s) {
      case "paid": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "partial": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "unpaid": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default: return "bg-surface-subtle text-text-subtle border-border-default/40";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout pageTitle={dict.bookingDetails || "Booking Details"}>
        <div className="flex flex-col gap-6 w-full max-w-[1000px] mx-auto animate-pulse">
          {/* Back Link Skeleton */}
          <div className="flex items-center">
            <Skeleton className="h-8 w-32 rounded-md bg-surface-subtle" />
          </div>

          {/* Page Header Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-default pb-6">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-64 rounded-md bg-surface-subtle" />
              <Skeleton className="h-3 w-40 rounded-md bg-surface-subtle" />
            </div>
          </div>

          {/* Content Layout Skeleton */}
          <div className="flex flex-col gap-6 w-full">
            {/* Booking Overview Card Skeleton */}
            <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 bg-surface-subtle/30 border-b border-border-default">
                <Skeleton className="h-5 w-40 rounded-md bg-surface-subtle" />
                <div className="flex items-center gap-3 sm:ms-auto">
                  <Skeleton className="h-5 w-20 rounded-md bg-surface-subtle" />
                  <Skeleton className="h-5 w-20 rounded-md bg-surface-subtle" />
                  <div className="hidden xs:block w-px h-4 bg-border-default mx-1" />
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-8 w-8 rounded-md bg-surface-subtle" />
                    <Skeleton className="h-8 w-8 rounded-md bg-surface-subtle" />
                    <Skeleton className="h-8 w-8 rounded-md bg-surface-subtle" />
                  </div>
                </div>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x md:divide-border-default/60">
                  <div className="flex flex-col gap-4">
                    <Skeleton className="h-3 w-32 rounded-md bg-surface-subtle" />
                    <div className="flex flex-col gap-4 mt-1">
                      <Skeleton className="h-9 w-[70%] rounded-md bg-surface-subtle" />
                      <Skeleton className="h-9 w-[60%] rounded-md bg-surface-subtle" />
                      <Skeleton className="h-9 w-[80%] rounded-md bg-surface-subtle" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 pt-4 md:pt-0 md:ps-6">
                    <Skeleton className="h-3 w-32 rounded-md bg-surface-subtle" />
                    <div className="flex flex-col gap-4 mt-1">
                      <Skeleton className="h-9 w-[65%] rounded-md bg-surface-subtle" />
                      <Skeleton className="h-9 w-[65%] rounded-md bg-surface-subtle" />
                      <Skeleton className="h-9 w-[50%] rounded-md bg-surface-subtle" />
                    </div>
                  </div>
                </div>
                <div className="border-t border-border-default/60 pt-4">
                  <Skeleton className="h-20 w-full rounded-xl bg-surface-subtle/50" />
                </div>
                <div className="border-t border-border-default/60 pt-4">
                  <Skeleton className="h-20 w-full rounded-xl bg-surface-subtle/50" />
                </div>
              </div>
            </div>

            {/* Services & Billing Card Skeleton */}
            <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 bg-surface-subtle/30 border-b border-border-default">
                <Skeleton className="h-5 w-40 rounded-md bg-surface-subtle" />
                <Skeleton className="h-8 w-32 rounded-xl bg-surface-subtle" />
              </div>
              <div className="p-6 flex flex-col gap-6">
                <Skeleton className="h-4 w-32 rounded-md bg-surface-subtle" />
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center pb-3">
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-40 rounded-md bg-surface-subtle" />
                      <Skeleton className="h-3 w-20 rounded-md bg-surface-subtle" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-md bg-surface-subtle" />
                  </div>
                </div>
                <div className="border-t border-border-default/60 pt-5 flex flex-col gap-4 bg-surface-subtle/20 -mx-6 px-6 py-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-3 w-20 rounded-md bg-surface-subtle" />
                      <Skeleton className="h-6 w-24 rounded-md bg-surface-subtle" />
                    </div>
                    <div className="flex flex-col gap-1 sm:items-center">
                      <Skeleton className="h-3 w-20 rounded-md bg-surface-subtle" />
                      <Skeleton className="h-6 w-24 rounded-md bg-surface-subtle" />
                    </div>
                    <div className="flex flex-col gap-1 sm:items-end">
                      <Skeleton className="h-3 w-24 rounded-md bg-surface-subtle" />
                      <Skeleton className="h-6 w-24 rounded-md bg-surface-subtle" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !booking) {
    return (
      <DashboardLayout pageTitle={dict.bookingDetails || "Booking Details"}>
        <div className="flex flex-col items-center justify-center py-20 gap-4 max-w-md mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 text-danger flex items-center justify-center shadow-sm">
            <ShieldAlert size={28} />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {dict.bookingNotFound}
          </h3>
          <p className="text-sm text-text-muted">
            {dict.bookingNotFoundDesc}
          </p>
          <Button onClick={() => router.push("/bookings")} variant="outline" className="mt-2">
            <ArrowLeft className="me-2 h-4 w-4" />
            {dict.backToBookings || "Back to Bookings"}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle={dict.bookingDetails || "Booking Details"}>
      <TooltipProvider delay={200}>
        <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-[1000px] mx-auto">
        
        {/* Back Link */}
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push("/bookings")} 
            className="-ms-2.5 h-8 gap-1.5 text-text-subtle hover:text-foreground hover:bg-surface-subtle"
          >
            <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
            {dict.backToBookings || "Back to Bookings"}
          </Button>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 border-b border-border-default pb-4 sm:pb-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight m-0">
              {dict.bookingNumberLabel} <span className="text-text-subtle text-sm sm:text-base font-normal font-mono" dir="ltr" style={{ unicodeBidi: "isolate" }}>#{booking.booking_number ? (booking.booking_number.startsWith('#') ? booking.booking_number.replace('#','') : booking.booking_number) : booking.id}</span>
            </h2>
            <span className="text-xs text-text-muted">
              {dict.createdOn} {formatDate(booking.created_at)}
            </span>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col gap-4 sm:gap-6 w-full">
          
          {/* Main Info & Services & Notes */}
          <div className="flex flex-col gap-4 sm:gap-6 w-full">
            
            {/* Booking Overview Card */}
            <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6 sm:py-4 bg-surface-subtle/30 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-primary shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
                    {dict.bookingOverview || "Booking Overview"}
                  </span>
                </div>
                
                {/* Status & Actions merged */}
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:ms-auto w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getStatusBadgeClasses(booking.status)}`}>
                      {dict.status?.[booking.status] || booking.status}
                    </span>
                    
                    {/* Payment Status Badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getPaymentBadgeClasses(booking.paid_status)}`}>
                      {dict.payment?.[(booking.paid_status?.toLowerCase().replace('partially_paid', 'partial').replace('partially paid', 'partial')) as keyof typeof dict.payment] || booking.paid_status}
                    </span>
                  </div>

                  {/* Actions Icons */}
                  <div className="flex items-center gap-1.5 shrink-0 ms-auto sm:ms-0">
                    {booking.status === "pending" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={handleConfirmBooking}
                            disabled={changeStatusMutation.isPending}
                            className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer"
                          >
                            {changeStatusMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{dict.confirmBooking || "Confirm Booking"}</TooltipContent>
                      </Tooltip>
                    )}

                    {booking.status === "in_progress" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={handleCompleteBooking}
                            disabled={changeStatusMutation.isPending}
                            className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer"
                          >
                            {changeStatusMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{dict.completeBooking || "Complete Booking"}</TooltipContent>
                      </Tooltip>
                    )}

                    {(booking.status === "pending" || booking.status === "in_progress") && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={() => setIsCancelDialogOpen(true)}
                            disabled={changeStatusMutation.isPending}
                            className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-orange-400 hover:bg-orange-500/15 hover:border-orange-500/30 transition-all duration-200 cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{dict.cancelBooking || "Cancel Booking"}</TooltipContent>
                      </Tooltip>
                    )}

                    {booking.status === "pending" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={() => setIsEditOpen(true)}
                            className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/30 transition-all duration-200 cursor-pointer"
                          >
                            <Pencil size={13} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{dict.editBooking || "Edit Booking"}</TooltipContent>
                      </Tooltip>
                    )}

                    {booking.status === "cancelled" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{dict.delete || "Delete"}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-6 flex flex-col gap-6 sm:gap-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                  {/* Customer Details */}
                  <div className="flex flex-col gap-4">
                    <span className="text-xs sm:text-sm font-bold text-text-subtle uppercase tracking-wider">
                      {dict.customerInfo || "Customer Information"}
                    </span>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-foreground font-bold uppercase tracking-wider">{dict.table?.customer || "Customer"}</span>
                        <span className="text-sm sm:text-base font-medium text-text-subtle">{booking.customer_name}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-foreground font-bold uppercase tracking-wider">{dict.phone || "Phone"}</span>
                        <a href={`tel:${booking.customer_phone}`} className="text-sm font-medium text-text-subtle hover:text-foreground flex items-center gap-2 w-fit" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                          <Phone size={14} className="text-text-subtle shrink-0" />
                          {localizeNumber(booking.customer_phone || "", locale)}
                        </a>
                      </div>
                      {booking.customer_email && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] text-foreground font-bold uppercase tracking-wider">{dict.email || "Email"}</span>
                          <a href={`mailto:${booking.customer_email}`} className="text-sm font-medium text-text-subtle hover:text-foreground flex items-center gap-2 truncate max-w-full">
                            <Mail size={14} className="text-text-subtle shrink-0" />
                            <span className="truncate">{booking.customer_email}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Schedule Details */}
                  <div className="flex flex-col gap-4 pt-4 md:pt-0 border-t md:border-t-0 md:border-s border-border-default/60 md:ps-6">
                    <span className="text-xs sm:text-sm font-bold text-text-subtle uppercase tracking-wider">
                      {dict.scheduleInfo || "Schedule Details"}
                    </span>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-foreground font-bold uppercase tracking-wider">{dict.startDate}</span>
                        <div className="text-sm font-medium text-text-subtle flex items-center gap-2">
                          <Calendar size={14} className="text-text-subtle shrink-0" />
                          {formatDate(booking.scheduled_from)}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-foreground font-bold uppercase tracking-wider">{dict.endDate}</span>
                        <div className="text-sm font-medium text-text-subtle flex items-center gap-2">
                          <Calendar size={14} className="text-text-subtle shrink-0" />
                          {formatDate(booking.scheduled_to)}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-foreground font-bold uppercase tracking-wider">{dict.duration}</span>
                        <div className="text-sm font-medium text-text-subtle flex items-center gap-2">
                          <Clock size={14} className="text-text-subtle shrink-0" />
                          {formatDuration(durationMinutes)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="border-t border-border-default/60 pt-5 flex flex-col gap-3">
                  <span className="text-xs sm:text-sm font-bold text-text-subtle uppercase tracking-wider flex items-center gap-2">
                    <FileText size={14} className="text-text-subtle shrink-0" />
                    {wizardDict.notes || "Additional Notes"}
                  </span>
                  {booking.notes ? (
                    <p className="text-sm text-text-subtle m-0 leading-relaxed whitespace-pre-wrap bg-surface-subtle/30 p-4 rounded-xl border border-border-subtle/30 font-medium">
                      {localizeNumber(booking.notes || "", locale)}
                    </p>
                  ) : (
                    <span className="text-xs text-text-muted italic">
                      {dict.noNotes || "No notes provided for this booking."}
                    </span>
                  )}
                </div>

                {/* Audit Log / History details */}
                <div className="border-t border-border-default/60 pt-5 flex flex-col gap-4">
                  <span className="text-xs sm:text-sm font-bold text-text-subtle uppercase tracking-wider flex items-center gap-2">
                    <History size={14} className="text-text-subtle shrink-0" />
                    {dict.auditLog || "Audit Details"}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 text-sm">
                    {/* Created By */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-foreground uppercase tracking-wider font-bold">{dict.logCreated || "Created By"}</span>
                      <span className="font-medium text-text-subtle">
                        {booking.created_by_name || "System"} <span className="text-text-muted font-normal text-xs">({formatDate(booking.created_at)})</span>
                      </span>
                    </div>

                    {/* Last Updated By */}
                    {booking.updated_at && booking.updated_at !== booking.created_at && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-foreground uppercase tracking-wider font-bold">{dict.logUpdated || "Last Updated By"}</span>
                        <span className="font-medium text-text-subtle">
                          {booking.updated_by_name || "System"} <span className="text-text-muted font-normal text-xs">({formatDate(booking.updated_at)})</span>
                        </span>
                      </div>
                    )}

                    {/* Completed By */}
                    {booking.completed_at && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-foreground uppercase tracking-wider font-bold">{dict.logCompleted || "Completed By"}</span>
                        <span className="font-medium text-text-subtle">
                          {booking.completed_by_name || "System"} <span className="text-text-muted font-normal text-xs">({formatDate(booking.completed_at)})</span>
                        </span>
                      </div>
                    )}

                    {/* Cancelled By */}
                    {booking.cancelled_at && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-foreground uppercase tracking-wider font-bold">{dict.logCancelled || "Cancelled By"}</span>
                        <span className="font-medium text-text-subtle">
                          {booking.cancelled_by_name || "System"} <span className="text-text-muted font-normal text-xs">({formatDate(booking.cancelled_at)})</span>
                        </span>
                      </div>
                    )}

                    {/* Cancellation Reason */}
                    {booking.cancellation_reason && (
                      <div className="flex flex-col gap-1 sm:col-span-2 md:col-span-3">
                        <span className="text-[11px] text-foreground uppercase tracking-wider font-bold">{dict.cancellationReason || "Cancellation Reason"}</span>
                        <span className="font-medium text-danger italic">
                          {booking.cancellation_reason}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Services & Billing Card */}
            <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between gap-3 p-4 sm:px-6 sm:py-4 bg-surface-subtle/30 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-success shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
                    {dict.paymentBilling || "Payment & Billing"}
                  </span>
                </div>

                {/* Record Payment Button moved here */}
                {booking.paid_status !== "paid" && booking.total_paid - booking.paid_amount > 0 && booking.status !== "cancelled" && (
                  <Button
                    onClick={() => setIsPaymentDialogOpen(true)}
                    className="h-7 sm:h-8 gap-1 bg-primary hover:bg-primary-600 text-white rounded-xl text-[10px] sm:text-[11px] font-bold shadow-sm transition-all px-3 sm:px-4 shrink-0"
                  >
                    <Plus size={12} />
                    {dict.recordPayment || "Record Payment"}
                  </Button>
                )}
              </div>
              <div className="p-5 sm:p-6 flex flex-col gap-6 sm:gap-8">
                <div className="flex flex-col gap-4">
                  <span className="text-xs sm:text-sm font-bold text-text-subtle uppercase tracking-wider block mb-1">
                    {wizardDict.reviewService || "Services Details"}
                  </span>
                  {booking.services_data.map((srv, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm sm:text-base border-b border-border-subtle/50 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex flex-col gap-1 min-w-0 me-2">
                        <span className="font-bold text-foreground truncate">{srv.name}</span>
                        <span className="text-[11px] text-text-muted">
                          {srv.service_id 
                            ? (wizardDict.serviceExistingLabel || 'Existing') 
                            : (wizardDict.serviceCustomLabel || 'Custom')}
                        </span>
                      </div>
                      <span className="font-black text-foreground shrink-0">${localizeNumber(srv.price?.toFixed(2) || "0.00", locale)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border-default/60 pt-5 sm:pt-6 flex flex-col gap-4 bg-surface-subtle/20 -mx-5 px-5 sm:-mx-6 sm:px-6 py-5 sm:py-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] sm:text-[11px] text-foreground uppercase tracking-wider font-bold truncate">{wizardDict.totalCost || "Total Cost"}</span>
                      <span className="text-sm sm:text-base font-bold text-text-subtle">${localizeNumber(booking.total_paid?.toFixed(2) || "0.00", locale)}</span>
                    </div>
                    <div className="flex flex-col gap-1 sm:items-center">
                      <span className="text-[10px] sm:text-[11px] text-foreground uppercase tracking-wider font-bold truncate">{dict.amountPaid || "Amount Paid"}</span>
                      <span className="text-sm sm:text-base font-bold text-success">${localizeNumber(booking.paid_amount?.toFixed(2) || "0.00", locale)}</span>
                    </div>
                    <div className="flex flex-col gap-1 sm:items-end">
                      <span className="text-[10px] sm:text-[11px] text-foreground uppercase tracking-wider font-bold truncate">{dict.remainingBalance || "Remaining"}</span>
                      <span className={`text-sm sm:text-base font-bold ${booking.total_paid - booking.paid_amount > 0 ? 'text-amber-500' : 'text-text-subtle'}`}>
                        ${localizeNumber((booking.total_paid - booking.paid_amount).toFixed(2), locale)}
                      </span>
                    </div>
                  </div>
                </div>

                {booking.payment_history && booking.payment_history.length > 0 && (
                  <div className="border-t border-border-default/60 pt-5">
                    <span className="text-xs sm:text-sm font-bold text-text-subtle uppercase tracking-wider block mb-3">
                      {dict.paymentHistory || "Payment History"}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                      {booking.payment_history.map((pay: any, idx: number) => (
                        <div key={idx} className="flex flex-col gap-2 bg-surface-subtle/40 p-4 rounded-xl border border-border-subtle/30 text-sm">
                          <div className="flex justify-between items-center font-bold text-foreground">
                            <span className="text-sm sm:text-base font-black text-success">${localizeNumber(pay.amount?.toFixed(2) || "0.00", locale)}</span>
                            <span className="text-text-muted font-normal text-[11px]">{formatDate(pay.date)}</span>
                          </div>
                          <div className="text-text-subtle font-semibold text-xs">
                            {dict.by || "By:"} {pay.added_by_name || "System"}
                          </div>
                          {pay.notes && (
                            <div className="text-text-muted italic mt-1 font-medium text-xs bg-surface-card p-2 rounded-lg border border-border-subtle/30">
                              "{pay.notes}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      <BookingFormDialog 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
        bookingId={booking.id}
      />

      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title={dict.deleteBooking || "Delete Booking"}
        description={dict.confirmDelete || "Are you sure you want to delete this booking permanently? This action cannot be undone."}
        onConfirm={confirmDelete}
        confirmLabel={dict.delete || "Delete"}
        cancelLabel={wizardDict.cancel || "Cancel"}
        isLoading={deleteMutation.isPending}
      />

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent 
          className="w-[calc(100vw-2rem)] sm:w-full !max-w-[330px] p-0 overflow-hidden !rounded-2xl bg-surface-card border border-border-default/60 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          showCloseButton={false}
        >
          <div className="relative px-5 pt-5 pb-1 flex flex-col items-center text-center">
            <div className="absolute inset-x-0 top-0 h-[2px] opacity-80 bg-gradient-to-r from-transparent via-danger to-transparent" />
            
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 shadow-sm transition-transform duration-300 bg-danger/10 text-danger">
              <ShieldAlert size={18} />
            </div>
            
            <DialogHeader className="flex flex-col items-center gap-1">
              <DialogTitle className="text-[15px] font-bold text-foreground tracking-tight leading-snug">
                {dict.cancelBooking || "Cancel Booking"}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-text-muted leading-relaxed max-w-[270px]">
                {dict.cancellationDescription || "Please enter the reason for cancelling this booking to record it in the system."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-5 py-2">
            <Textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder={dict.cancellationReasonPlaceholder || "Reason for cancellation..."}
              className="min-h-[75px] text-[13px] rounded-xl"
            />
          </div>

          <div className="px-5 pb-5 pt-3 grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={changeStatusMutation.isPending}
              className="w-full h-9 text-[13px] font-medium border-border-default/60 bg-surface-subtle/30 hover:bg-surface-subtle text-foreground transition-all cursor-pointer truncate"
            >
              {wizardDict.cancel || "Cancel"}
            </Button>
            <Button
              onClick={handleConfirmCancel}
              disabled={changeStatusMutation.isPending || !cancellationReason.trim()}
              className="w-full h-9 text-[13px] font-semibold shadow-md transition-all gap-1.5 cursor-pointer bg-danger hover:bg-danger/90 shadow-danger/20 text-white truncate"
            >
              {changeStatusMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
              <span className="truncate">{dict.confirmCancellation || "Confirm Cancellation"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent 
          className="w-[calc(100vw-2rem)] sm:w-full !max-w-[340px] p-0 overflow-hidden !rounded-2xl bg-surface-card border border-border-default/60 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          showCloseButton={false}
        >
          <div className="relative px-5 pt-5 pb-1 flex flex-col items-center text-center">
            <div className="absolute inset-x-0 top-0 h-[2px] opacity-80 bg-gradient-to-r from-transparent via-primary to-transparent" />
            
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 shadow-sm transition-transform duration-300 bg-primary/10 text-primary">
              <DollarSign size={18} />
            </div>
            
            <DialogHeader className="flex flex-col items-center gap-1">
              <DialogTitle className="text-[15px] font-bold text-foreground tracking-tight leading-snug">
                {dict.recordPayment || "Record Payment"}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-text-muted leading-relaxed max-w-[280px]">
                {dict.recordPaymentDescription || "Record a new payment for this booking."} {dict.remainingBalance ? `${dict.remainingBalance}:` : "Remaining:"} ${booking ? (booking.total_paid - booking.paid_amount).toFixed(2) : "0.00"}
              </DialogDescription>
            </DialogHeader>
          </div>

          {booking && (
            <div className="px-5 py-2 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-text-muted font-semibold">{dict.amountToPay || "Amount to Pay"}</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={(booking.total_paid - booking.paid_amount).toString()}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-9 text-[13px] rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-text-muted font-semibold">{dict.notes || "Notes"}</span>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder={dict.notes || "Notes..."}
                  className="min-h-[55px] text-[13px] rounded-xl"
                />
              </div>
            </div>
          )}

          <div className="px-5 pb-5 pt-3 grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
              disabled={recordPaymentMutation.isPending}
              className="w-full h-9 text-[13px] font-medium border-border-default/60 bg-surface-subtle/30 hover:bg-surface-subtle text-foreground transition-all cursor-pointer truncate"
            >
              {wizardDict.cancel || "Cancel"}
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={recordPaymentMutation.isPending || !paymentAmount}
              className="w-full h-9 text-[13px] font-semibold shadow-md transition-all gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 shadow-primary/20 text-white truncate"
            >
              {recordPaymentMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
              <span className="truncate">{dict.recordPayment || "Record Payment"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </TooltipProvider>
    </DashboardLayout>
  );
}
