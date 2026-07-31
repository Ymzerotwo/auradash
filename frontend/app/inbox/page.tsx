"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useAuthStore } from "@/lib/stores/auth.store";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, LayoutGrid, TableProperties, Check, Trash2, Mail, MailOpen, UserPlus, Ban, Tag, ShieldCheck } from "lucide-react";
import { useInboxPage } from "@/lib/hooks/useInbox";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
// Removed useSearchParams import
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControl } from "@/components/ui/PaginationControl";
import { Textarea } from "@/components/ui/textarea";
import { localizeNumber } from "@/lib/utils";

export default function InboxPage() {
  const { t, locale } = useTranslation();
  const dict = t.inbox;
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const { state, setters, handlers } = useInboxPage();
  const { viewMode, filterStatus, searchQuery, debouncedSearchQuery, page, limit, actionMessageId, isDeleteOpen, isSpamOpen, spamReason, viewMessage, highlightedId, isLoading, isDeleting, messages, filteredMessages, data } = state;
  const { setViewMode, setFilterStatus, setSearchQuery, setPage, setActionMessageId, setIsDeleteOpen, setIsSpamOpen, setSpamReason, setViewMessage } = setters;
  const { handleUpdateStatus, handleSpamConfirm, handleDeleteConfirm } = handlers;

  const [activeViewMessage, setActiveViewMessage] = useState<typeof viewMessage>(null);

  useEffect(() => {
    if (viewMessage) {
      setActiveViewMessage(viewMessage);
    }
  }, [viewMessage]);

  if (user && !hasPermission("cms.inbox") && user.role !== "Admin") {
    return (
      <DashboardLayout pageTitle={dict?.pageTitle || "Inbox"}>
        <PermissionDenied />
      </DashboardLayout>
    );
  }

  const getStatusBadgeClasses = (status: string) => {
    const base = "inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold border shadow-sm shrink-0 transition-all duration-200";
    switch(status) {
      case "unread": 
        return `${base} bg-indigo-500/10 text-indigo-400 border-indigo-500/30`;
      case "read": 
        return `${base} bg-zinc-500/10 text-zinc-400 border-zinc-500/30`;
      case "converted": 
        return `${base} bg-emerald-500/10 text-emerald-400 border-emerald-500/30`;
      case "profile_created": 
        return `${base} bg-purple-500/10 text-purple-400 border-purple-500/30`;
      case "spam": 
        return `${base} bg-rose-500/10 text-rose-400 border-rose-500/30`;
      default: 
        return `${base} bg-surface-subtle text-text-subtle border-border-default/40`;
    }
  };

  const getStatusText = (status: string) => {
    if (!dict || !dict.status) return status;
    return dict.status[status as keyof typeof dict.status] || status;
  };

  const getInquiryTypeText = (type: string) => {
    if (!dict || !dict.inquiryTypes) return type;
    return dict.inquiryTypes[type as keyof typeof dict.inquiryTypes] || type;
  };

  const filterTabs = [
    { label: dict?.search?.filterAll || "All", value: "all" },
    { label: dict?.search?.filterUnread || "Unread", value: "unread" },
    { label: dict?.search?.filterRead || "Read", value: "read" },
    { label: dict?.search?.filterConverted || "Converted", value: "converted" },
    { label: dict?.search?.filterProfileCreated || "Profile", value: "profile_created" },
    { label: dict?.search?.filterSpam || "Spam", value: "spam" },
  ];

  return (
    <TooltipProvider delay={200}>
      <DashboardLayout pageTitle={dict?.pageTitle || "Inbox"}>
        <div className="flex flex-col gap-6 w-full">
          
          {/* ── Page Header ─────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground m-0 mb-1">{dict?.pageTitle || "Inbox"}</h2>
            </div>
          </div>

          {/* ── Search, Filter & View Toggle Bar ────────────────── */}
          <div className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="flex-1">
              <Input
                icon={Search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={dict?.search?.placeholder || "Search messages..."}
                className="h-10 rounded-lg text-sm w-full"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-surface-subtle rounded-lg p-1 overflow-x-auto whitespace-nowrap scrollbar-hide self-start sm:self-auto max-w-full">
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => { setFilterStatus(tab.value); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${filterStatus === tab.value
                      ? "bg-primary text-white shadow-sm"
                      : "bg-transparent text-text-muted hover:text-foreground"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="hidden md:flex items-center gap-1 bg-surface-subtle rounded-lg p-1">
              <button
                onClick={() => setViewMode("table")}
                title={dict?.search?.viewTable || "Table view"}
                className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${viewMode === "table"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-transparent text-text-muted hover:text-foreground"
                  }`}
              >
                <TableProperties size={16} />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                title={dict?.search?.viewCards || "Cards view"}
                className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${viewMode === "cards"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-transparent text-text-muted hover:text-foreground"
                  }`}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {/* ── Content Area ─────────────────────────────────────── */}
          {isLoading ? (
            <>
              {/* Desktop Table Skeleton */}
              {viewMode === "table" && (
                <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                  <Table className="min-w-[1200px]" columnWidths={["11%", "14%", "10%", "23%", "9%", "13%", "8%", "12%"]}>
                    <TableHeader>
                      <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50 border-border-default">
                        <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-48" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        {(!user || user?.role === "Admin") && (
                          <TableHead><Skeleton className="h-4 w-28" /></TableHead>
                        )}
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead className="text-end"><Skeleton className="h-4 w-16 ms-auto" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-4 w-[100px]" />
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-[120px]" />
                              <Skeleton className="h-3 w-[150px]" />
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-4 w-4 shrink-0" />
                              <Skeleton className="h-4 w-[100px]" />
                            </div>
                          </TableCell>
                          <TableCell className="py-4"><Skeleton className="h-4 w-[250px]" /></TableCell>
                          <TableCell className="py-4"><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                          {(!user || user?.role === "Admin") && (
                            <TableCell className="py-4"><Skeleton className="h-4 w-24" /></TableCell>
                          )}
                          <TableCell className="py-4"><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell className="py-4">
                            <div className="flex justify-end gap-2">
                              <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Cards Skeleton (Shown on mobile always, or on desktop if viewMode is cards) */}
              <div className={`grid gap-4 ${viewMode === "cards" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 md:hidden"}`}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <Skeleton className="h-4 w-[120px]" />
                          <Skeleton className="h-3 w-[100px]" />
                          <Skeleton className="h-3 w-[140px]" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full shrink-0" />
                    </div>
                    <div className="bg-surface-subtle rounded-lg px-3 py-2.5 border border-border-subtle flex flex-col">
                      <Skeleton className="h-3 w-full mb-2 mt-1" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-2/3 mb-1" />
                    </div>
                    <div className="flex justify-between items-center mt-auto pt-3 border-t border-border-subtle">
                      <Skeleton className="h-3 w-[100px]" />
                      <div className="flex gap-1 justify-end">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : filteredMessages.length === 0 ? (
            <div className="bg-surface-card border border-border-default rounded-xl flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
                <MailOpen size={24} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted m-0">{dict?.search?.noResults || "No messages found"}</p>
            </div>
          ) : (
            <>
              {/* ── Desktop Table View ── */}
              {viewMode === "table" && (
                <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                  <Table className="min-w-[1200px]" columnWidths={user?.role === "Admin" ? ["11%", "14%", "10%", "23%", "9%", "13%", "8%", "12%"] : ["13%", "16%", "11%", "31%", "10%", "9%", "10%"]}>
                    <TableHeader>
                      <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                        <TableHead>{dict?.table?.sender || "Sender"}</TableHead>
                        <TableHead>{dict?.table?.contact || "Contact"}</TableHead>
                        <TableHead>{dict?.table?.inquiryType || "Type"}</TableHead>
                        <TableHead>{dict?.table?.message || "Message"}</TableHead>
                        <TableHead>{dict?.table?.status || "Status"}</TableHead>
                        {user?.role === "Admin" && (
                          <TableHead className="whitespace-nowrap min-w-[130px]">{dict?.audit?.actionBy}</TableHead>
                        )}
                        <TableHead>{dict?.table?.date || "Date"}</TableHead>
                        <TableHead className="text-end">{dict?.table?.actions || "Actions"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMessages.map((msg) => {
                        const isSpam = msg.status === 'spam';
                        const metadata = msg.metadata ? (typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata) : null;
                        
                        return (
                        <TableRow 
                          key={msg.id} 
                          id={`message-${msg.id}`}
                          className={`group transition-colors hover:bg-surface-subtle/40 ${highlightedId === msg.id ? "!bg-accent/10 hover:!bg-accent/15" : ""}`}
                        >
                          <TableCell className="align-top pt-4 max-w-[150px] truncate" title={msg.full_name}>
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col min-w-0">
                                <span className={`text-sm truncate text-foreground ${msg.status === 'unread' ? "font-bold" : "font-semibold"}`}>{msg.full_name}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="align-top pt-4 max-w-[250px]">
                            <div className="flex flex-col items-start min-w-0">
                              <span className="text-sm font-medium text-foreground truncate" dir="ltr" style={{ unicodeBidi: "isolate" }} title={msg.phone || ""}>{localizeNumber(msg.phone || "", locale)}</span>
                              <span className="text-xs text-text-muted truncate" title={msg.email || ""}>{msg.email || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="align-top pt-4">
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                              <Tag className="h-3.5 w-3.5 shrink-0" />
                              <span className="whitespace-nowrap">{getInquiryTypeText(msg.inquiry_type)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="align-top pt-4 max-w-[300px]">
                            <p 
                              className="text-sm text-text-muted truncate cursor-pointer hover:text-foreground transition-colors m-0 font-normal" 
                              onClick={() => setViewMessage({
                                id: msg.id,
                                content: msg.message || "",
                                author: msg.full_name,
                                inquiry_type: msg.inquiry_type,
                                metadata,
                                read_at: (msg as any).read_at,
                                read_by: (msg as any).read_by,
                                read_by_name: (msg as any).read_by_name,
                                converted_at: (msg as any).converted_at,
                                converted_by: (msg as any).converted_by,
                                converted_by_name: (msg as any).converted_by_name,
                                profile_created_at: (msg as any).profile_created_at,
                                profile_created_by: (msg as any).profile_created_by,
                                profile_created_by_name: (msg as any).profile_created_by_name,
                                add_to_spam_at: (msg as any).add_to_spam_at,
                                add_to_spam_by: (msg as any).add_to_spam_by,
                                add_to_spam_by_name: (msg as any).add_to_spam_by_name,
                                spam_reason: (msg as any).spam_reason
                              })}
                              title={msg.message || (dict?.actions?.clickToRead || "Click to read full message")}
                            >
                              {msg.message || "-"}
                            </p>
                          </TableCell>
                          <TableCell className="align-top pt-4">
                            <span className={getStatusBadgeClasses(msg.status)}>
                              {getStatusText(msg.status)}
                            </span>
                          </TableCell>
                          {user?.role === "Admin" && (
                            <TableCell className="align-top pt-4 max-w-[160px]">
                              {(() => {
                                if (msg.status === 'spam' && (msg as any).add_to_spam_at) {
                                  return (
                                    <div className="flex flex-col gap-0.5 text-[11px]">
                                      <span className="text-xs font-semibold text-danger truncate" title={(msg as any).add_to_spam_by_name || dict?.audit?.system || 'System'}>
                                        {(msg as any).add_to_spam_by_name || dict?.audit?.system || 'System'}
                                      </span>
                                      <span className="text-[10px] text-text-muted">
                                        {new Date((msg as any).add_to_spam_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')} {new Date((msg as any).add_to_spam_at).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                    </div>
                                  );
                                }
                                if (msg.status === 'converted' && (msg as any).converted_at) {
                                  return (
                                    <div className="flex flex-col gap-0.5 text-[11px]">
                                      <span className="text-xs font-semibold text-foreground truncate" title={(msg as any).converted_by_name || dict?.audit?.system || 'System'}>
                                        {(msg as any).converted_by_name || dict?.audit?.system || 'System'} (Booking)
                                      </span>
                                      <span className="text-[10px] text-text-muted">
                                        {new Date((msg as any).converted_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')} {new Date((msg as any).converted_at).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                    </div>
                                  );
                                }
                                if (msg.status === 'profile_created' && (msg as any).profile_created_at) {
                                  return (
                                    <div className="flex flex-col gap-0.5 text-[11px]">
                                      <span className="text-xs font-semibold text-foreground truncate" title={(msg as any).profile_created_by_name || dict?.audit?.system || 'System'}>
                                        {(msg as any).profile_created_by_name || dict?.audit?.system || 'System'} (Profile)
                                      </span>
                                      <span className="text-[10px] text-text-muted">
                                        {new Date((msg as any).profile_created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')} {new Date((msg as any).profile_created_at).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                    </div>
                                  );
                                }
                                if (((msg.status as string) === 'read' || (msg.status as string) === 'in_progress') && (msg as any).read_at) {
                                  return (
                                    <div className="flex flex-col gap-0.5 text-[11px]">
                                      <span className="text-xs font-semibold text-foreground truncate" title={(msg as any).read_by_name || dict?.audit?.system || 'System'}>
                                        {(msg as any).read_by_name || dict?.audit?.system || 'System'}
                                      </span>
                                      <span className="text-[10px] text-text-muted">
                                        {new Date((msg as any).read_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')} {new Date((msg as any).read_at).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                    </div>
                                  );
                                }
                                return (
                                  <span className="text-xs font-semibold text-text-subtle">—</span>
                                );
                              })()}
                            </TableCell>
                          )}
                          <TableCell className="align-top pt-4">
                            <span className="text-sm font-medium text-foreground whitespace-nowrap">
                              {new Date(msg.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                            </span>
                          </TableCell>
                          <TableCell className="align-top pt-4 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              {msg.status === 'unread' && (
                                <Tooltip><TooltipTrigger asChild>
                                  <button onClick={() => handleUpdateStatus(msg.id, 'read')} className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer">
                                    <Check size={13} />
                                  </button>
                                </TooltipTrigger><TooltipContent>{dict?.actions?.markRead}</TooltipContent></Tooltip>
                              )}
                              
                              {msg.status !== 'converted' && msg.status !== 'profile_created' && msg.status !== 'spam' && msg.inquiry_type === 'general' && (
                                <Tooltip><TooltipTrigger asChild>
                                  <button onClick={() => handleUpdateStatus(msg.id, 'profile_created')} className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer">
                                    <UserPlus size={13} />
                                  </button>
                                </TooltipTrigger><TooltipContent>{dict?.actions?.createProfile || "Create Profile"}</TooltipContent></Tooltip>
                              )}
                              {msg.status !== 'converted' && msg.status !== 'profile_created' && msg.status !== 'spam' && msg.inquiry_type !== 'general' && (
                                <Tooltip><TooltipTrigger asChild>
                                  <button onClick={() => handleUpdateStatus(msg.id, 'converted')} className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer">
                                    <UserPlus size={13} />
                                  </button>
                                </TooltipTrigger><TooltipContent>{dict?.actions?.convert}</TooltipContent></Tooltip>
                              )}
                              
                              {msg.status === 'spam' && (
                                <Tooltip><TooltipTrigger asChild>
                                  <button onClick={() => handleUpdateStatus(msg.id, 'unread')} className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-primary hover:bg-primary/10 hover:border-primary/30 transition-all duration-200 cursor-pointer">
                                    <ShieldCheck size={13} />
                                  </button>
                                </TooltipTrigger><TooltipContent>{dict?.actions?.unspam || "Remove from Spam"}</TooltipContent></Tooltip>
                              )}
                              
                              {msg.status !== 'spam' && msg.status !== 'converted' && msg.status !== 'profile_created' && (
                                <Tooltip><TooltipTrigger asChild>
                                  <button onClick={() => {setActionMessageId(msg.id); setIsSpamOpen(true);}} className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all duration-200 cursor-pointer">
                                    <Ban size={13} />
                                  </button>
                                </TooltipTrigger><TooltipContent>{dict?.actions?.markSpam}</TooltipContent></Tooltip>
                              )}

                              {(user?.role === "Admin" || hasPermission("admin")) && (
                                <Tooltip><TooltipTrigger asChild>
                                  <button onClick={() => {setActionMessageId(msg.id); setIsDeleteOpen(true);}} className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 cursor-pointer">
                                    <Trash2 size={13} />
                                  </button>
                                </TooltipTrigger><TooltipContent>{dict?.actions?.delete}</TooltipContent></Tooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )})}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* ── Cards View (Desktop & Mobile) ── */}
                <div className={`grid gap-4 ${viewMode === "cards" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 md:hidden"}`}>
                  {filteredMessages.map((msg) => {
                    const isSpam = msg.status === 'spam';
                    const metadata = msg.metadata ? (typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata) : null;
                    return (
                    <div 
                      key={msg.id} 
                      id={`message-${msg.id}`} 
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('.actions-menu')) return;
                        setViewMessage({
                          id: msg.id,
                          content: msg.message || "",
                          author: msg.full_name,
                          inquiry_type: msg.inquiry_type,
                          metadata,
                          read_at: (msg as any).read_at,
                          read_by: (msg as any).read_by,
                          read_by_name: (msg as any).read_by_name,
                          converted_at: (msg as any).converted_at,
                          converted_by: (msg as any).converted_by,
                          converted_by_name: (msg as any).converted_by_name,
                          profile_created_at: (msg as any).profile_created_at,
                          profile_created_by: (msg as any).profile_created_by,
                          profile_created_by_name: (msg as any).profile_created_by_name,
                          add_to_spam_at: (msg as any).add_to_spam_at,
                          add_to_spam_by: (msg as any).add_to_spam_by,
                          add_to_spam_by_name: (msg as any).add_to_spam_by_name,
                          spam_reason: (msg as any).spam_reason
                        });
                      }}
                      className={`bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:border-border-subtle group ${highlightedId === msg.id ? "ring-2 ring-primary" : ""}`}
                    >
                      
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col min-w-0">
                            <span className="text-base font-bold text-foreground truncate">{msg.full_name}</span>
                            <span className="text-xs font-mono text-foreground font-medium truncate" dir="ltr" style={{ unicodeBidi: "isolate" }}>{localizeNumber(msg.phone || "", locale)}</span>
                            {msg.email && <span className="text-xs font-mono text-text-subtle truncate">{msg.email}</span>}
                          </div>
                        </div>
                        <span className={getStatusBadgeClasses(msg.status)}>
                          {getStatusText(msg.status)}
                        </span>
                      </div>

                      <div className="bg-surface-subtle/80 rounded-lg px-3 py-2 border border-border-subtle/50 my-0.5 transition-colors">
                        <p className="text-xs font-normal text-text-muted truncate m-0 group-hover:text-foreground transition-colors" title={msg.message || ""}>
                          {msg.message || "-"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border-subtle mt-auto min-h-[28px]">
                        <div className="text-[11px] text-text-muted truncate max-w-[150px]">
                          {((msg as any).converted_by_name || (msg as any).profile_created_by_name) && (
                            <span title={(msg as any).converted_by_name || (msg as any).profile_created_by_name}>
                              <span className="font-semibold text-foreground">{dict?.audit?.convertedBy || "Converted By"}:</span> {(msg as any).converted_by_name || (msg as any).profile_created_by_name}
                            </span>
                          )}
                        </div>
                        <div className="actions-menu flex items-center gap-0.5 justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
                          {msg.status === 'unread' && (
                            <Tooltip><TooltipTrigger asChild>
                              <button onClick={() => handleUpdateStatus(msg.id, 'read')} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-text-subtle hover:text-foreground hover:bg-surface-subtle transition-all duration-200 cursor-pointer border-none outline-none bg-transparent">
                                <Check size={13} />
                              </button>
                            </TooltipTrigger><TooltipContent>{dict?.actions?.markRead}</TooltipContent></Tooltip>
                          )}
                          
                          {msg.status !== 'converted' && msg.status !== 'profile_created' && msg.status !== 'spam' && msg.inquiry_type === 'general' && (
                            <Tooltip><TooltipTrigger asChild>
                              <button onClick={() => handleUpdateStatus(msg.id, 'profile_created')} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent">
                                <UserPlus size={13} />
                              </button>
                            </TooltipTrigger><TooltipContent>{dict?.actions?.createProfile || "Create Profile"}</TooltipContent></Tooltip>
                          )}
                          {msg.status !== 'converted' && msg.status !== 'profile_created' && msg.status !== 'spam' && msg.inquiry_type !== 'general' && (
                            <Tooltip><TooltipTrigger asChild>
                              <button onClick={() => handleUpdateStatus(msg.id, 'converted')} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent">
                                <UserPlus size={13} />
                              </button>
                            </TooltipTrigger><TooltipContent>{dict?.actions?.convert}</TooltipContent></Tooltip>
                          )}
                          
                          {msg.status === 'spam' && (
                            <Tooltip><TooltipTrigger asChild>
                              <button onClick={() => handleUpdateStatus(msg.id, 'unread')} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-primary hover:bg-primary/10 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent">
                                <ShieldCheck size={13} />
                              </button>
                            </TooltipTrigger><TooltipContent>{dict?.actions?.unspam || "Remove from Spam"}</TooltipContent></Tooltip>
                          )}
                          
                          {msg.status !== 'spam' && msg.status !== 'converted' && msg.status !== 'profile_created' && (
                            <Tooltip><TooltipTrigger asChild>
                              <button onClick={() => {setActionMessageId(msg.id); setIsSpamOpen(true);}} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-amber-500 hover:bg-amber-500/10 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent">
                                <Ban size={13} />
                              </button>
                            </TooltipTrigger><TooltipContent>{dict?.actions?.markSpam}</TooltipContent></Tooltip>
                          )}

                          {(user?.role === "Admin" || hasPermission("admin")) && (
                            <Tooltip><TooltipTrigger asChild>
                              <button onClick={() => {setActionMessageId(msg.id); setIsDeleteOpen(true);}} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-text-subtle hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent">
                                <Trash2 size={13} />
                              </button>
                            </TooltipTrigger><TooltipContent>{dict?.actions?.delete}</TooltipContent></Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              
              {/* Pagination */}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <PaginationControl
                  currentPage={page}
                  totalPages={data.pagination.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}

        </div>

        {/* ── Modals ── */}
        
        {/* Spam Reason Modal */}
        <Dialog open={isSpamOpen} onOpenChange={setIsSpamOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:w-full !max-w-[330px] p-0 overflow-hidden !rounded-2xl bg-surface-card border border-border-default/60 shadow-2xl" showCloseButton={false}>
            <div className="relative px-5 pt-5 pb-1 flex flex-col items-center text-center">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-danger to-transparent opacity-80" />
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 shadow-sm transition-transform duration-300 bg-danger/10 text-danger">
                <Ban size={18} />
              </div>
              <DialogHeader className="flex flex-col items-center gap-1">
                <DialogTitle className="text-[15px] font-bold text-foreground tracking-tight leading-snug">
                  {dict?.actions?.markSpam || "Mark as Spam"}
                </DialogTitle>
                <DialogDescription className="text-[13px] text-text-muted leading-relaxed max-w-[270px]">
                  {dict?.actions?.confirmSpam || "Are you sure you want to mark this message as spam? This will block the sender."}
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <div className="px-5 py-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reason" className="text-[12px] font-semibold text-foreground">
                  {dict?.actions?.spamReasonLabel || "Spam Reason (Optional)"}
                </label>
                <Input
                  id="reason"
                  className="h-9 text-[13px] rounded-xl focus-visible:ring-danger/20"
                  placeholder={dict?.actions?.spamReasonPlaceholder || "E.g., Phishing, Advertising..."}
                  value={spamReason}
                  onChange={(e) => setSpamReason(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="px-5 pb-5 pt-3 grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                onClick={() => setIsSpamOpen(false)}
                className="w-full h-9 text-[13px] font-medium border-border-default/60 bg-surface-subtle/30 hover:bg-surface-subtle text-foreground transition-all cursor-pointer truncate"
              >
                {t.common?.cancel || "Cancel"}
              </Button>
              <Button
                onClick={handleSpamConfirm}
                className="w-full h-9 text-[13px] font-semibold shadow-md bg-danger hover:bg-danger/90 shadow-danger/20 text-white cursor-pointer truncate"
              >
                {dict?.actions?.submitSpam || "Confirm Spam"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          open={isDeleteOpen}
          onOpenChange={(open) => { if (!open) setIsDeleteOpen(false); }}
          onConfirm={handleDeleteConfirm}
          title={dict?.actions?.delete || "Delete"}
          description={dict?.actions?.confirmDelete || "Are you sure?"}
          confirmLabel={dict?.actions?.delete || "Delete"}
          variant="danger"
          isLoading={isDeleting}
        />

        {/* View Full Message Modal */}
        <Dialog open={!!viewMessage} onOpenChange={(open) => !open && setViewMessage(null)}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden !rounded-2xl border border-border-default shadow-2xl bg-surface-card">
            <DialogHeader className="p-5 pb-4 border-b border-border-subtle flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold text-foreground">
                  {dict?.actions?.expand || "Full Message"}
                </DialogTitle>
              </div>
              <DialogDescription className="hidden">Full message details</DialogDescription>
            </DialogHeader>

            <div className="px-5 pb-5 pt-2 flex flex-col gap-4">
              <Textarea 
                readOnly
                dir="auto"
                value={activeViewMessage?.content || ""}
                style={(() => {
                  const len = activeViewMessage?.content?.length || 0;
                  if (len <= 150) return { height: "90px", overflowY: "auto" as const };
                  if (len <= 400) return { height: "180px", overflowY: "auto" as const };
                  return { height: "280px", overflowY: "auto" as const };
                })()}
                className="w-full resize-none bg-surface-subtle/50 !border-border-subtle text-[15px] text-foreground/90 p-4 rounded-xl leading-relaxed !ring-0 !outline-none select-none cursor-default hover:!border-border-subtle focus:!border-border-subtle focus-visible:!border-border-subtle focus-visible:!shadow-none"
                onFocus={(e) => e.target.blur()}
                tabIndex={-1}
              />

              {/* Requested Service Details (If metadata exists or inquiry_type is service) */}
              {activeViewMessage?.metadata && (
                <div className="flex flex-col gap-2 p-3 bg-surface-subtle border border-border-subtle rounded-xl">
                  <span className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">
                    {dict?.requestedService || "Requested Service Details"}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {activeViewMessage.metadata.name || activeViewMessage.metadata.service_name || "-"}
                    </span>
                    {activeViewMessage.metadata.price !== undefined && (
                      <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0">
                        {typeof activeViewMessage.metadata.price === 'number' ? `$${activeViewMessage.metadata.price}` : activeViewMessage.metadata.price}
                      </span>
                    )}
                  </div>
                  {activeViewMessage.metadata.description && (
                    <p className="text-xs text-text-muted m-0 line-clamp-2 leading-relaxed">
                      {activeViewMessage.metadata.description}
                    </p>
                  )}
                </div>
              )}

              {/* Audit Details (Admin Only) */}
              {user?.role === "Admin" && (
                <div className="flex flex-col gap-2 mt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-subtle/50 p-3 rounded-xl border border-border-subtle">
                    {/* Read Audit */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">{dict?.audit?.readBy || "Read By"}</span>
                      {activeViewMessage?.read_at ? (
                        <>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <span className="truncate">{activeViewMessage.read_by_name || dict?.audit?.system || 'System'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                            <span>{new Date(activeViewMessage.read_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')} {new Date(activeViewMessage.read_at).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-subtle">
                          <span>{dict?.audit?.unread || 'Unread'}</span>
                        </div>
                      )}
                    </div>

                    {/* Action By Audit */}
                    <div className="flex flex-col gap-1.5 border-l border-border-subtle/40 pl-3">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">{dict?.audit?.convertedBy || "Action By"}</span>
                      {activeViewMessage?.converted_at ? (
                        <>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <span className="truncate">{activeViewMessage.converted_by_name || dict?.audit?.system || 'System'} (Booking)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                            <span>{new Date(activeViewMessage.converted_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')} {new Date(activeViewMessage.converted_at).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </div>
                        </>
                      ) : activeViewMessage?.profile_created_at ? (
                        <>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <span className="truncate">{activeViewMessage.profile_created_by_name || dict?.audit?.system || 'System'} (Profile)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                            <span>{new Date(activeViewMessage.profile_created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')} {new Date(activeViewMessage.profile_created_at).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-subtle">
                          <span>{dict?.audit?.notConverted || '-'}</span>
                        </div>
                      )}
                    </div>

                    {/* Spam Audit */}
                    <div className="flex flex-col gap-1.5 border-l border-border-subtle/40 pl-3">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">{dict?.audit?.spammedBy || "Spam By"}</span>
                      {activeViewMessage?.add_to_spam_at ? (
                        <>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                            <span className="truncate">{activeViewMessage.add_to_spam_by_name || dict?.audit?.system || 'System'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-danger/80">
                            <span>{new Date(activeViewMessage.add_to_spam_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')} {new Date(activeViewMessage.add_to_spam_at).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </div>
                          {activeViewMessage.spam_reason && (
                            <div className="mt-0.5 text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded border border-destructive/10 leading-tight">
                              <span className="font-bold">{dict?.audit?.reason || "Reason"}:</span> {activeViewMessage.spam_reason}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-subtle">
                          <span>{dict?.audit?.notSpammed || 'Not Spammed'}</span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

            </div>
          </DialogContent>
        </Dialog>

      </DashboardLayout>
    </TooltipProvider>
  );
}
