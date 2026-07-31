"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCustomerDetailView } from "@/lib/hooks/useCustomers";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign, 
  MessageSquare, 
  Clock, 
  ShieldAlert, 
  FileText, 
  Tags, 
  ExternalLink,
  Award,
  TableProperties,
  LayoutGrid,
  Reply
} from "lucide-react";

const getBookingStatusStyles = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "pending":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "in_progress":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "cancelled":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    default:
      return "bg-surface-subtle text-text-muted border-border-default";
  }
};

const getPaymentStatusStyles = (status: string) => {
  const s = status?.toLowerCase().replace('partially_paid', 'partial').replace('partially paid', 'partial');
  switch (s) {
    case "paid": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "partial": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    default: return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  }
};

const getCommentStatusStyles = (status: string) => {
  switch (status?.toLowerCase()) {
    case "approved":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "pending":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "spam":
    case "rejected":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    default:
      return "bg-surface-subtle text-text-muted border-border-default";
  }
};

function BookingCardSkeleton() {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="w-10 h-10 rounded-lg bg-surface-subtle" />
        <Skeleton className="h-5 w-16 rounded-md bg-surface-subtle" />
      </div>
      <div className="flex flex-col mb-3">
        <Skeleton className="h-5 w-24 bg-surface-subtle rounded animate-pulse" />
        <Skeleton className="h-3.5 w-36 bg-surface-subtle rounded mt-1 animate-pulse" />
      </div>
      <div className="bg-surface-subtle/50 rounded-xl p-3 border border-border-subtle/40 flex flex-col gap-2 mb-4 animate-pulse">
        <div className="flex justify-between items-center">
          <Skeleton className="h-3.5 w-20 bg-surface-subtle rounded" />
          <Skeleton className="h-3.5 w-10 bg-surface-subtle rounded" />
        </div>
      </div>
      <div className="mt-auto pt-3 border-t border-border-subtle flex flex-col gap-2.5">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24 bg-surface-subtle rounded" />
          <Skeleton className="h-4 w-20 bg-surface-subtle rounded" />
        </div>
        <Skeleton className="h-8 w-full bg-surface-subtle rounded-xl" />
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const {
    dict, locale, router, activeTab, setActiveTab, viewMode, setViewMode,
    customer, isLoading, error, t
  } = useCustomerDetailView(id);

  const isRtl = locale === "ar";
  const dateLocale = isRtl ? ar : enUS;

  const [viewComment, setViewComment] = useState<{ id: string; content: string; author: string } | null>(null);
  const [activeViewComment, setActiveViewComment] = useState<typeof viewComment>(null);

  useEffect(() => {
    if (viewComment) {
      setActiveViewComment(viewComment);
    }
  }, [viewComment]);

  const localizeNumber = (str: string | number) => {
    if (!isRtl) return String(str);
    const arabicNumbers = ['\u0660', '\u0661', '\u0662', '\u0663', '\u0664', '\u0665', '\u0666', '\u0667', '\u0668', '\u0669'];
    return String(str).replace(/\d/g, d => arabicNumbers[parseInt(d, 10)]);
  };

  const formatDate = (dateStr: string) => {
    try {
      return localizeNumber(format(new Date(dateStr), "dd/MM/yyyy", { locale: dateLocale }));
    } catch {
      return "—";
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return localizeNumber(format(new Date(dateStr), "dd/MM/yyyy, hh:mm a", { locale: dateLocale }));
    } catch {
      return "—";
    }
  };

  // Helper to format date range
  const formatDateRange = (startString: string | null, endString: string | null) => {
    if (!startString || !endString) return dict.profile?.notScheduled;
    try {
      const start = new Date(startString);
      const end = new Date(endString);
      
      const isSameDay = 
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate();
        
      if (isRtl) {
        if (isSameDay) {
          const datePart = format(start, "dd/MM/yyyy", { locale: dateLocale });
          const startTime = format(start, "hh:mm a", { locale: dateLocale });
          const endTime = format(end, "hh:mm a", { locale: dateLocale });
          return `${localizeNumber(datePart)}, ${localizeNumber(startTime)} ← ${localizeNumber(endTime)}`;
        } else {
          const startFormatted = format(start, "dd/MM/yyyy, hh:mm a", { locale: dateLocale });
          const endFormatted = format(end, "dd/MM/yyyy, hh:mm a", { locale: dateLocale });
          return `${localizeNumber(startFormatted)} ← ${localizeNumber(endFormatted)}`;
        }
      } else {
        if (isSameDay) {
          const datePart = format(start, "dd/MM/yyyy", { locale: dateLocale });
          const startTime = format(start, "hh:mm a", { locale: dateLocale });
          const endTime = format(end, "hh:mm a", { locale: dateLocale });
          return `${datePart}, ${startTime} → ${endTime}`;
        } else {
          const startFormatted = format(start, "dd/MM/yyyy, hh:mm a", { locale: dateLocale });
          const endFormatted = format(end, "dd/MM/yyyy, hh:mm a", { locale: dateLocale });
          return `${startFormatted} → ${endFormatted}`;
        }
      }
    } catch {
      return "—";
    }
  };

  const getStatusBadgeVariant = (status: string): any => {
    switch (status) {
      case "pending": return "secondary";
      case "in_progress": return "default";
      case "completed": return "success";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout pageTitle={dict.profile?.customerProfile || "Customer Profile"}>
        <div className="flex flex-col gap-6 w-full">
          {/* Back link skeleton */}
          <Skeleton className="h-8 w-36 rounded-lg" />

          {/* Content Layout skeleton */}
          <div className="flex flex-col lg:flex-row gap-6 w-full">
            
            {/* Left Side: Services provided Table/Card skeleton */}
            <div className="flex-1 flex flex-col gap-6 order-2 lg:order-1">
              {/* Tabs & View Toggle Header skeleton */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2">
                {/* Tabs Skeleton (Static) */}
                <div className="flex bg-surface-subtle p-1 rounded-xl">
                  <div className="px-4 py-1.5 text-xs font-bold rounded-lg bg-surface-card/60 text-transparent select-none">
                    {dict.profile?.servicesProvided || "Services Provided"} (0)
                  </div>
                  <div className="px-4 py-1.5 text-xs font-bold rounded-lg bg-transparent text-transparent select-none">
                    {dict.profile?.blogComments || "Blog Comments"} (0)
                  </div>
                </div>
                
                {/* View Toggle skeleton (Static) */}
                <div className="flex bg-surface-subtle p-1 rounded-xl gap-0.5 self-end sm:self-auto opacity-40">
                  <div className="p-1.5 rounded-md bg-transparent text-transparent">
                    <TableProperties size={15} />
                  </div>
                  <div className="p-1.5 rounded-md bg-transparent text-transparent">
                    <LayoutGrid size={15} />
                  </div>
                </div>
              </div>

              {viewMode === "table" ? (
                /* Table Skeleton */
                <>
                  <div className="hidden md:block bg-surface-card border border-border-default rounded-xl overflow-x-auto">
                    <Table className="min-w-[700px]">
                      <TableHeader>
                        <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50 border-border-default">
                          <TableHead className="w-[15%]"><Skeleton className="h-4 w-16" /></TableHead>
                          <TableHead className="w-[30%]"><Skeleton className="h-4 w-28" /></TableHead>
                          <TableHead className="w-[15%]"><Skeleton className="h-4 w-20" /></TableHead>
                          <TableHead className="w-[12%]"><Skeleton className="h-4 w-12" /></TableHead>
                          <TableHead className="w-[13%]"><Skeleton className="h-4 w-16" /></TableHead>
                          <TableHead className="w-[10%]"><Skeleton className="h-4 w-16" /></TableHead>
                          <TableHead className="w-[5%] text-end"><Skeleton className="h-4 w-12 ml-auto" /></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 4 }).map((_, idx) => (
                          <TableRow key={idx} className="border-border-subtle/50 last:border-0">
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Skeleton className="h-3.5 w-24" />
                              </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-14 rounded-md" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-14 rounded-md" /></TableCell>
                            <TableCell className="text-end">
                              <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile Card Skeleton */}
                  <div className="flex flex-col md:hidden gap-4">
                    {Array.from({ length: 2 }).map((_, idx) => (
                      <BookingCardSkeleton key={idx} />
                    ))}
                  </div>
                </>
              ) : (
                /* Card Skeleton Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <BookingCardSkeleton key={idx} />
                  ))}
                </div>
              )}
            </div>

            {/* Right Side: Customer Details Card skeleton */}
            <div className="w-full lg:w-[320px] flex flex-col gap-6 order-1 lg:order-2">
              <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 bg-surface-subtle/30 border-b border-border-default flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="p-5 flex flex-col gap-5">
                  <div className="flex flex-col gap-4">
                    {/* Name skeleton */}
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-2.5 w-16" />
                      <Skeleton className="h-4 w-44 rounded-md" />
                    </div>
                    {/* Fields skeletons */}
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={idx} className="flex flex-col gap-1.5">
                        <Skeleton className="h-2.5 w-20" />
                        <Skeleton className="h-3.5 w-36 rounded-md" />
                      </div>
                    ))}
                  </div>
                  
                  {/* Tags skeleton */}
                  <div className="border-t border-border-default/60 pt-4 flex flex-col gap-2">
                    <Skeleton className="h-3 w-28" />
                    <div className="flex gap-1.5 flex-wrap">
                      <Skeleton className="h-5 w-12 rounded-md" />
                      <Skeleton className="h-5 w-16 rounded-md" />
                      <Skeleton className="h-5 w-14 rounded-md" />
                    </div>
                  </div>

                  {/* Metadata skeletons */}
                  <div className="border-t border-border-default/60 pt-4 flex flex-col gap-3">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <Skeleton className="h-2 w-24" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !customer) {
    return (
      <DashboardLayout pageTitle={dict.profile?.customerProfile || "Customer Profile"}>
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 text-destructive">
            <ShieldAlert size={30} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            {dict.profile?.customerNotFound || "Customer Not Found"}
          </h3>
          <p className="text-sm text-text-muted mb-6">
            {dict.profile?.customerNotFoundDesc || "Sorry, we couldn't find the requested customer in the system."}
          </p>
          <Button onClick={() => router.push("/customers")} className="bg-primary hover:bg-primary-600 text-white rounded-xl">
            {dict.profile?.backToCustomers || "Back to Customers"}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const cust = customer as any;
  const bookings = cust.bookings || [];
  const comments = cust.comments || [];



  return (
    <DashboardLayout pageTitle={dict.profile?.customerProfile || "Customer Profile"}>
      <div className="flex flex-col gap-6 w-full">
        
        {/* Back Link */}
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push("/customers")} 
            className="h-8 gap-1.5 text-text-subtle hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {dict.profile?.backToCustomers || "Back to Customers"}
          </Button>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6 w-full">
          
          {/* Left Side: Services provided & Blog Comments */}
          <div className="flex-1 flex flex-col gap-6 order-2 lg:order-1">
            
            {/* Tabs & View Toggle Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2">
              <div className="flex bg-surface-subtle p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab("services")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer outline-none border-none ${
                    activeTab === "services"
                      ? "bg-surface-card text-foreground shadow-sm"
                      : "bg-transparent text-text-muted hover:text-foreground"
                  }`}
                >
                  {dict.profile?.servicesProvided || "Services Provided"} ({localizeNumber(bookings.length)})
                </button>
                <button
                  onClick={() => setActiveTab("comments")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer outline-none border-none ${
                    activeTab === "comments"
                      ? "bg-surface-card text-foreground shadow-sm"
                      : "bg-transparent text-text-muted hover:text-foreground"
                  }`}
                >
                  {dict.profile?.blogComments || "Blog Comments"} ({localizeNumber(comments.length)})
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="hidden md:flex items-center gap-1 bg-surface-subtle rounded-lg p-1 mb-2">
                <Tooltip>
                  <TooltipTrigger render={
                    <button
                      onClick={() => setViewMode("table")}
                      className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${
                        viewMode === "table"
                          ? "bg-primary text-white shadow-sm"
                          : "bg-transparent text-text-muted hover:text-foreground hover:bg-surface-card"
                      }`}
                    >
                      <TableProperties size={15} />
                    </button>
                  } />
                  <TooltipContent>{t.customers?.search?.viewTable || "Table View"}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger render={
                    <button
                      onClick={() => setViewMode("cards")}
                      className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${
                        viewMode === "cards"
                          ? "bg-primary text-white shadow-sm"
                          : "bg-transparent text-text-muted hover:text-foreground hover:bg-surface-card"
                      }`}
                    >
                      <LayoutGrid size={15} />
                    </button>
                  } />
                  <TooltipContent>{t.customers?.search?.viewCards || "Cards View"}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Tab content */}
            {activeTab === "services" ? (
              <div className="flex flex-col gap-4">
                {bookings.length === 0 ? (
                  <div className="bg-surface-card border border-border-default rounded-xl p-12 text-center flex flex-col items-center justify-center">
                    <Calendar size={32} className="text-text-muted mb-3" />
                    <p className="text-sm text-text-muted m-0">
                      {dict.profile?.noServices || "No services provided to this customer yet."}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    {viewMode === "table" && (
                      <div className="hidden md:block bg-surface-card border border-border-default rounded-xl overflow-x-auto">
                        <Table className="min-w-[1000px]">
                          <TableHeader>
                            <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                              <TableHead className="w-[15%]">{t.bookings?.table?.bookingNumber || "Booking No"}</TableHead>
                              <TableHead className="w-[30%]">{t.bookings?.table?.dates || "Scheduled Dates"}</TableHead>
                              <TableHead className="w-[15%]">{dict.profile?.servicesProvided}</TableHead>
                              <TableHead className="w-[12%]">{t.bookings?.table?.financials}</TableHead>
                              <TableHead className="w-[13%]">{t.bookings?.table?.payment}</TableHead>
                              <TableHead className="w-[10%]">{t.bookings?.table?.status}</TableHead>
                              <TableHead className="w-[5%] text-end">{dict.table?.actions}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bookings.map((booking: any) => (
                              <TableRow key={booking.id} className="hover:bg-surface-subtle/10 group">
                                <TableCell className="font-mono font-bold text-foreground">
                                  #{booking.booking_number || booking.id}
                                </TableCell>
                                <TableCell className="text-sm font-medium text-foreground">
                                  {formatDateRange(booking.scheduled_from, booking.scheduled_to)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  <div className="flex flex-col gap-0.5">
                                    {booking.services_data.map((srv: any, idx: number) => (
                                      <span key={idx} className="font-semibold text-foreground">{srv.name}</span>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm font-bold text-foreground">
                                  ${localizeNumber(booking.total_paid?.toFixed(2) || "0.00")}
                                </TableCell>
                                <TableCell>
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${getPaymentStatusStyles(booking.paid_status)}`}>
                                    {(t.bookings as any)?.payment?.[(booking.paid_status?.toLowerCase().replace('partially_paid', 'partial').replace('partially paid', 'partial')) as string] || booking.paid_status}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${getBookingStatusStyles(booking.status)}`}>
                                    {(t.bookings as any)?.status?.[booking.status as string] || booking.status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-end">
                                  <Tooltip>
                                    <TooltipTrigger render={
                                      <button 
                                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); router.push(`/bookings/${booking.id}`); }} 
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-text-subtle hover:text-blue-500 hover:bg-blue-500/10 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent"
                                      >
                                        <ExternalLink size={14} />
                                      </button>
                                    } />
                                    <TooltipContent>{dict.profile?.viewBooking || "View Booking"}</TooltipContent>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Cards View (Mobile + Desktop toggled) */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${viewMode === "table" ? "md:hidden" : ""}`}>
                      {bookings.map((booking: any) => (
                        <div 
                          key={booking.id} 
                          className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col transition-all duration-200 hover:shadow-md hover:border-border-subtle group"
                        >
                          {/* Header: Booking Number + Status */}
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <span className="text-sm font-mono font-extrabold text-foreground truncate" dir="ltr" style={{ unicodeBidi: "isolate" }} title={booking.booking_number || booking.id}>
                              #{booking.booking_number || (booking.id ? `BK-${booking.id.substring(0, 6).toUpperCase()}` : "")}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${getBookingStatusStyles(booking.status)}`}>
                              {(t.bookings as any)?.status?.[booking.status] || booking.status}
                            </span>
                          </div>

                          {/* Date Range */}
                          <div className="flex flex-col mb-3">
                            <span className="text-[11px] text-text-muted leading-normal font-medium">
                              {formatDateRange(booking.scheduled_from, booking.scheduled_to)}
                            </span>
                          </div>

                          {/* Services list */}
                          <div className="bg-surface-subtle/50 rounded-xl p-3 border border-border-subtle/40 flex flex-col gap-2 mb-4">
                            {booking.services_data.map((srv: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-foreground">{srv.name}</span>
                                <span className="font-bold text-text-subtle">${localizeNumber(srv.price?.toFixed(2) || "0.00")}</span>
                              </div>
                            ))}
                          </div>

                          {/* Footer: Cost, Payment & View Link */}
                          <div className="mt-auto pt-3 border-t border-border-subtle flex flex-col gap-2.5">
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <div className="flex items-center gap-1 text-text-muted">
                                <DollarSign size={13} className="text-success" />
                                <span>{dict.profile?.totalCost || "Total Cost:"}</span>
                                <span className="font-bold text-foreground">${localizeNumber(booking.total_paid?.toFixed(2) || "0.00")}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-text-muted">{dict.profile?.paymentStatus || "Payment:"}</span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getPaymentStatusStyles(booking.paid_status)}`}>
                                  {(t.bookings as any)?.payment?.[(booking.paid_status?.toLowerCase().replace('partially_paid', 'partial').replace('partially paid', 'partial')) as string] || booking.paid_status}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex justify-end pt-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => router.push(`/bookings/${booking.id}`)}
                                className="h-8 gap-1.5 text-xs font-bold text-text-subtle hover:text-foreground hover:bg-surface-subtle border border-border-default rounded-xl w-full justify-center flex items-center"
                              >
                                {dict.profile?.viewBooking || "View Booking"}
                                <ExternalLink size={12} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {comments.length === 0 ? (
                  <div className="bg-surface-card border border-border-default rounded-xl p-12 text-center flex flex-col items-center justify-center">
                    <MessageSquare size={32} className="text-text-muted mb-3" />
                    <p className="text-sm text-text-muted m-0">
                      {dict.profile?.noComments || "No comments recorded for this customer in the blog."}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    {viewMode === "table" && (
                      <div className="hidden md:block bg-surface-card border border-border-default rounded-xl overflow-x-auto">
                        <Table className="min-w-[700px]">
                          <TableHeader>
                            <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                              <TableHead className="text-sm font-bold text-foreground">{t.comments?.table?.article}</TableHead>
                              <TableHead className="text-sm font-bold text-foreground">{t.comments?.table?.comment}</TableHead>
                              <TableHead className="text-sm font-bold text-foreground">{t.comments?.table?.date}</TableHead>
                              <TableHead className="text-sm font-bold text-foreground">{t.comments?.table?.status}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {comments.map((comment: any) => (
                              <TableRow key={comment.id} className="hover:bg-surface-subtle/10">
                                <TableCell className="text-sm font-bold text-foreground">
                                  <span className="truncate block max-w-[220px]" title={comment.article_title}>
                                    {comment.article_title}
                                  </span>
                                </TableCell>
                                <TableCell className="max-w-[300px]">
                                  {comment.parent_id && (
                                    <div className="flex items-center gap-1 text-[11px] text-text-subtle font-medium mb-1">
                                      <Reply className="h-3 w-3 shrink-0 scale-x-[-1] text-text-subtle/80" />
                                      <span>{t.comments?.actions?.replyTo}: {comment.parent_user_name}</span>
                                    </div>
                                  )}
                                  <p 
                                    className="text-sm text-text-muted line-clamp-2 cursor-pointer hover:text-foreground transition-colors m-0" 
                                    onClick={() => setViewComment({ id: comment.id, content: comment.content, author: cust.full_name })}
                                    title={comment.content}
                                  >
                                    {comment.content}
                                  </p>
                                </TableCell>
                                <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">
                                  {formatDateTime(comment.created_at)}
                                </TableCell>
                                <TableCell>
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${getCommentStatusStyles(comment.status)}`}>
                                    {(t.comments as any)?.status?.[comment.status] || comment.status}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Cards View (Mobile + Desktop toggled) */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${viewMode === "table" ? "md:hidden" : ""}`}>
                      {comments.map((comment: any) => (
                        <div 
                          key={comment.id} 
                          className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col transition-all duration-200 hover:shadow-md hover:border-border-subtle group"
                        >
                          {/* Header: Icon + Status */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <MessageSquare size={20} />
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getCommentStatusStyles(comment.status)}`}>
                              {(t.comments as any)?.status?.[comment.status] || comment.status}
                            </span>
                          </div>

                          {/* Middle: Article Title */}
                          <div className="flex flex-col mb-3">
                            <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-0.5">
                              {dict.profile?.commentOn || "Comment on:"}
                            </span>
                            <span className="text-xs font-extrabold text-foreground truncate" title={comment.article_title}>
                              {comment.article_title}
                            </span>
                          </div>

                          {/* Comment Content Box */}
                          <div 
                            onClick={() => setViewComment({ id: comment.id, content: comment.content, author: cust.full_name })}
                            className="text-xs text-text-muted bg-surface-subtle/50 p-3 rounded-xl border border-border-subtle/40 leading-relaxed font-medium mb-3 cursor-pointer hover:border-border-default hover:text-foreground transition-all line-clamp-3"
                            title={comment.content}
                          >
                            {comment.parent_id && (
                              <div className="flex items-center gap-1 text-[11px] text-text-subtle font-medium mb-1">
                                <Reply className="h-3 w-3 shrink-0 scale-x-[-1] text-text-subtle/80" />
                                <span>{t.comments?.actions?.replyTo}: {comment.parent_user_name}</span>
                              </div>
                            )}
                            {comment.content}
                          </div>

                          {/* Footer: Date */}
                          <div className="mt-auto pt-3 border-t border-border-subtle flex items-center justify-between text-[10px] text-text-muted">
                            <span>{formatDateTime(comment.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Side: Profile Details */}
          <div className="w-full lg:w-[320px] flex flex-col gap-6 order-1 lg:order-2">
            
            {/* Customer Details Card */}
            <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-5 py-4 bg-surface-subtle/30 border-b border-border-default">
                <User size={16} className="text-primary" />
                <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  {dict.profile?.customerDetails || "Customer Details"}
                </span>
              </div>
              <div className="p-5 flex flex-col gap-5">
                <div className="flex flex-col gap-4">
                  {/* Name */}
                  {cust.full_name && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                        {dict.form?.fields?.fullName || "Full Name"}
                      </span>
                      <span className="text-xs text-foreground font-semibold">
                        {cust.full_name}
                      </span>
                    </div>
                  )}

                  {/* Phone */}
                  {cust.phone && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                        {dict.form?.fields?.phone || "Phone"}
                      </span>
                      <a href={`tel:${cust.phone}`} dir="ltr" style={{ unicodeBidi: "isolate" }} className="text-xs font-semibold text-foreground hover:text-primary flex items-center gap-1.5 w-fit">
                        <Phone size={12} className="text-text-muted" />
                        {localizeNumber(cust.phone || "")}
                      </a>
                    </div>
                  )}

                  {/* Email */}
                  {cust.email && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                        {dict.form?.fields?.email || "Email"}
                      </span>
                      <a href={`mailto:${cust.email}`} className="text-xs font-semibold text-foreground hover:text-primary flex items-center gap-1.5 truncate w-fit max-w-full">
                        <Mail size={12} className="text-text-muted" />
                        <span className="truncate">{cust.email}</span>
                      </a>
                    </div>
                  )}

                  {/* Gender */}
                  {cust.gender && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                        {dict.form?.fields?.gender || "Gender"}
                      </span>
                      <span className="text-xs text-foreground font-semibold">
                        {cust.gender === "male" 
                          ? (dict.form?.fields?.genderMale || "Male") 
                          : (dict.form?.fields?.genderFemale || "Female")}
                      </span>
                    </div>
                  )}

                  {/* Date of Birth */}
                  {cust.date_of_birth && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                        {dict.form?.fields?.dateOfBirth || "Date of Birth"}
                      </span>
                      <span className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                        <Calendar size={12} className="text-text-muted" />
                        {formatDate(cust.date_of_birth)}
                      </span>
                    </div>
                  )}

                  {/* City */}
                  {cust.city && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                        {dict.form?.fields?.city || "City/Region"}
                      </span>
                      <span className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                        <MapPin size={12} className="text-text-muted" />
                        {cust.city}
                      </span>
                    </div>
                  )}

                  {/* Acquisition Source */}
                  {cust.acquisition_source && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                        {dict.form?.fields?.acquisitionSource || "Acquisition Source"}
                      </span>
                      <span className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                        <Award size={12} className="text-text-muted" />
                        {cust.acquisition_source}
                      </span>
                    </div>
                  )}

                  {/* Last Visit */}
                  {cust.last_visit_at && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                        {dict.profile?.lastVisit}
                      </span>
                      <span className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                        <Clock size={12} className="text-text-muted" />
                        {formatDateTime(cust.last_visit_at)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {cust.tags && cust.tags.length > 0 && (
                  <div className="border-t border-border-default/60 pt-4 flex flex-col gap-2">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold flex items-center gap-1">
                      <Tags size={11} />
                      {dict.profile?.tagsAndInterests}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {cust.tags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-[9px] font-bold px-2 py-0.5 bg-surface-subtle text-foreground border-border-default/80">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {cust.notes && (
                  <div className="border-t border-border-default/60 pt-4 flex flex-col gap-2">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                      {dict.profile?.staffNotes || "Staff Notes"}
                    </span>
                    <p className="text-xs text-text-subtle m-0 leading-relaxed bg-surface-subtle/30 p-3 rounded-xl border border-border-subtle/30 font-medium whitespace-pre-wrap">
                      {localizeNumber(cust.notes || "")}
                    </p>
                  </div>
                )}

                {/* Spam Reason (Admins only) */}
                {cust.spam && (cust.spam_reason || cust.add_spam_at || cust.add_spam_by_name) && (
                  <div className="border-t border-border-default/60 pt-4 flex flex-col gap-2">
                    <span className="text-[10px] text-destructive uppercase tracking-wider font-bold">
                      {dict.profile?.banReason || "Ban Reason"}
                    </span>
                    {cust.spam_reason && (
                      <p className="text-xs text-destructive bg-destructive/5 p-3 rounded-xl border border-destructive/10 font-semibold leading-relaxed">
                        {cust.spam_reason}
                      </p>
                    )}
                    <div className="flex flex-col gap-1 text-[10px] text-text-muted">
                      {cust.add_spam_at && (
                        <span>
                          {dict.profile?.bannedAt} {formatDateTime(cust.add_spam_at)}
                        </span>
                      )}
                      {cust.add_spam_by_name && (
                        <span>
                          {dict.profile?.by || "By:"} {cust.add_spam_by_name}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Meta details (Creation/Update) */}
                <div className="border-t border-border-default/60 pt-4 flex flex-col gap-3 text-[11px] text-text-muted">
                  {cust.created_at && (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-text-muted uppercase tracking-wider text-[9px]">
                        {dict.profile?.createdAt}
                      </span>
                      <span className="text-foreground font-medium">
                        {formatDateTime(cust.created_at)}
                      </span>
                    </div>
                  )}
                  {cust.created_by_name && (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-text-muted uppercase tracking-wider text-[9px]">
                        {dict.profile?.createdBy}
                      </span>
                      <span className="text-foreground font-medium">
                        {cust.created_by_name}
                      </span>
                    </div>
                  )}
                  {cust.updated_at && (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-text-muted uppercase tracking-wider text-[9px]">
                        {dict.profile?.updatedAt}
                      </span>
                      <span className="text-foreground font-medium">
                        {formatDateTime(cust.updated_at)}
                      </span>
                    </div>
                  )}
                  {cust.updated_by_name && (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-text-muted uppercase tracking-wider text-[9px]">
                        {"Updated By"}
                      </span>
                      <span className="text-foreground font-medium">
                        {cust.updated_by_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Read Full Comment Modal */}
        <Dialog open={!!viewComment} onOpenChange={(open) => !open && setViewComment(null)}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden !rounded-2xl border border-border-default shadow-2xl bg-surface-card">
            <DialogHeader className="p-5 pb-4 border-b border-border-subtle flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold text-foreground">
                  {(t.comments as any)?.actions?.expand || "Read full comment"}
                </DialogTitle>
              </div>
              <DialogDescription className="hidden">Full comment details</DialogDescription>
              
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-muted">{(t.comments as any)?.table?.author || "Author"}:</span>
                <span className="text-xs font-bold text-foreground">
                  {activeViewComment?.author}
                </span>
              </div>
            </DialogHeader>

            <div className="px-5 pb-5 pt-2">
              <Textarea 
                readOnly
                dir="auto"
                value={activeViewComment?.content || ""}
                style={(() => {
                  const len = activeViewComment?.content?.length || 0;
                  if (len <= 150) return { height: "90px", overflowY: "auto" as const };
                  if (len <= 400) return { height: "180px", overflowY: "auto" as const };
                  return { height: "280px", overflowY: "auto" as const };
                })()}
                className="w-full resize-none bg-surface-subtle/50 !border-border-subtle text-[15px] text-foreground/90 p-4 rounded-xl leading-relaxed !ring-0 !outline-none select-none cursor-default hover:!border-border-subtle focus:!border-border-subtle focus-visible:!border-border-subtle focus-visible:!shadow-none"
                onFocus={(e) => e.target.blur()}
                tabIndex={-1}
              />
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
