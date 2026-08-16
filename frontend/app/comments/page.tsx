"use client";

// Removed direct react state imports
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useAuthStore } from "@/lib/stores/auth.store";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, LayoutGrid, TableProperties, Check, Trash2, FileText, CheckSquare, Reply, Loader2 } from "lucide-react";
import { useCommentsPage } from "@/lib/hooks/useComments";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
// Removed useSearchParams import
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaginationControl } from "@/components/ui/PaginationControl";

export default function CommentsPage() {
  const { t, locale } = useTranslation();
  const dict = t.comments;
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const { state, setters, handlers, mutations } = useCommentsPage();
  const { viewMode, filterStatus, searchQuery, debouncedSearch, page, limit, actionCommentId, isApproveOpen, isDeleteOpen, viewComment, replyComment, replyText, isReplyOpen, highlightedId, isLoading, comments, filteredComments, data } = state;
  const { setViewMode, setFilterStatus, setSearchQuery, setPage, setActionCommentId, setIsApproveOpen, setIsDeleteOpen, setViewComment, setReplyText, setIsReplyOpen } = setters;
  const { handleApproveConfirm, handleDeleteConfirm, handleReplyClick, handleReplyClose, handleReplySubmit } = handlers;
  const { replyMutation } = mutations;

  if (user && !hasPermission("cms.comments") && user.role !== "Admin") {
    return (
      <DashboardLayout pageTitle={dict?.pageTitle || "Comments Management"}>
        <PermissionDenied />
      </DashboardLayout>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
      case "approved": return "default";
      case "pending": return "warning";
      case "spam": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusText = (status: string) => {
    if (!dict || !dict.status) return status;
    return dict.status[status as keyof typeof dict.status] || status;
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    }
  };

  const filterTabs = [
    { label: dict?.search?.filterAll || "All", value: "all" },
    { label: dict?.search?.filterPending || "Pending", value: "pending" },
    { label: dict?.search?.filterApproved || "Approved", value: "approved" },
  ];

  return (
    <TooltipProvider delay={200}>
      <DashboardLayout pageTitle={dict?.pageTitle || "Comments Management"}>
        <div className="flex flex-col gap-6 w-full">
          
          {/* ── Page Header ─────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground m-0 mb-1">{dict?.pageTitle || "Comments Management"}</h2>
            </div>
          </div>

          {/* ── Search, Filter & View Toggle Bar ────────────────── */}
          <div className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3">
            {/* Search */}
            <div className="w-full">
              <Input
                icon={Search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={dict?.search?.placeholder || "Search comments..."}
                className="h-10 rounded-lg text-sm w-full"
              />
            </div>

            {/* Filters (Left) & View Toggle (Right) */}
            <div className="flex items-center justify-between gap-3 w-full">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-surface-subtle rounded-lg p-1 overflow-x-auto whitespace-nowrap scrollbar-hide max-w-full">
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
              <div className="hidden md:flex items-center gap-1 bg-surface-subtle rounded-lg p-1 shrink-0">
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
          </div>

          {/* ── Content Area ─────────────────────────────────────── */}
          {isLoading ? (
            <>
              {/* Desktop Table Skeleton */}
              {viewMode === "table" && (
                <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                  <Table className="min-w-[1200px]" columnWidths={["18%", "24%", "14%", "10%", "10%", "10%", "10%", "10%"]}>
                    <TableHeader>
                      <TableRow className="bg-surface-subtle/50">
                        <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                        <TableHead className="text-end"><Skeleton className="h-4 w-16 ms-auto" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i} className="hover:bg-transparent">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="space-y-1.5">
                                <Skeleton className="h-3.5 w-24 rounded" />
                                <Skeleton className="h-3 w-32 rounded" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <div className="space-y-1.5">
                              <Skeleton className="h-3.5 w-full rounded" />
                              <Skeleton className="h-3 w-2/3 rounded" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-3.5 w-3.5 rounded-sm" />
                              <Skeleton className="h-3.5 w-20 rounded" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-14 rounded-md" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-3.5 w-16 rounded" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-3.5 w-16 rounded" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-3.5 w-16 rounded" />
                          </TableCell>
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-1">
                              <Skeleton className="h-8 w-8 rounded-md" />
                              <Skeleton className="h-8 w-8 rounded-md" />
                              <Skeleton className="h-8 w-8 rounded-md" />
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
                  <div key={i} className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[120px]" />
                          <Skeleton className="h-3 w-[80px]" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full shrink-0" />
                    </div>
                    <div className="bg-surface-subtle rounded-lg p-3">
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <div className="flex justify-between items-center mt-auto pt-2.5 border-t border-border-subtle">
                      <Skeleton className="h-3.5 w-[80px] rounded-lg" />
                      <div className="flex gap-1">
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : filteredComments.length === 0 ? (
            <div className="bg-surface-card border border-border-default rounded-xl flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
                <CheckSquare size={24} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted m-0">{dict?.search?.noResults || "No comments found"}</p>
            </div>
          ) : (
            <>
              {/* ── Desktop Table View ── */}
              {viewMode === "table" && (
                <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                  <Table className="min-w-[1250px]" columnWidths={["18%", "24%", "14%", "10%", "10%", "10%", "10%", "10%"]}>
                    <TableHeader>
                      <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                        <TableHead className="whitespace-nowrap">{dict?.table?.author || "Author"}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict?.table?.comment || "Comment"}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict?.table?.article || "Article"}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict?.table?.status || "Status"}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict?.table?.date || "Date"}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict?.table?.approvedBy || "Approved By"}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict?.table?.approvedAt || "Approved At"}</TableHead>
                        <TableHead className="text-end whitespace-nowrap">{dict?.table?.actions || "Actions"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredComments.map((comment) => (
                        <TableRow 
                          key={comment.id} 
                          id={`comment-${comment.id}`}
                          className="group transition-colors hover:bg-transparent"
                        >
                          <TableCell className="max-w-[200px] overflow-hidden">
                            <div className="flex items-center gap-3 min-w-0 w-full overflow-hidden">
                              <div className="flex flex-col min-w-0 w-full overflow-hidden">
                                <span className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5 w-full text-start" dir="auto" title={comment.user_full_name || comment.user_name}>
                                  <span className="truncate">{comment.user_full_name || comment.user_name}</span>
                                  {comment.user_id && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-none shrink-0">
                                      {dict?.table?.staff || 'Staff'}
                                    </Badge>
                                  )}
                                </span>
                                <span className="text-xs text-text-muted truncate w-full block text-start" dir="ltr" style={{ unicodeBidi: "isolate" }} title={comment.user_email || "No email"}>{comment.user_email || "No email"}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] overflow-hidden">
                            {comment.parent_id && (
                              <div className="flex items-center gap-1 text-[11px] text-text-subtle font-medium mb-1 min-w-0 w-full overflow-hidden text-start" dir="auto">
                                <Reply className="h-3 w-3 shrink-0 scale-x-[-1] text-text-subtle/80" />
                                <span className="truncate">{dict?.actions?.replyTo || "Reply to"}: {comment.parent_user_name}</span>
                              </div>
                            )}
                            <p 
                              className="text-sm text-text-muted line-clamp-2 cursor-pointer hover:text-foreground transition-colors m-0 block w-full overflow-hidden text-start" 
                              dir="auto"
                              onClick={() => setViewComment({id: comment.id, content: comment.content, author: comment.user_name})}
                              title="Click to read full comment"
                            >
                              {comment.content}
                            </p>
                          </TableCell>
                          <TableCell className="max-w-[200px] overflow-hidden">
                            <div className="flex items-center gap-2 text-xs font-medium text-text-subtle min-w-0 w-full overflow-hidden">
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate block w-full text-start" dir="auto" title={comment.article_title}>{comment.article_title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getStatusBadgeClasses(comment.status)}`}>
                              {getStatusText(comment.status)}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="text-sm text-text-muted whitespace-nowrap">
                              {new Date(comment.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[150px] overflow-hidden">
                            <span className="text-sm text-text-muted truncate block w-full text-start" dir="auto" title={comment.approved_by_name || "-"}>
                              {comment.approved_by_name || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="text-sm text-text-muted whitespace-nowrap">
                              {comment.approved_at ? new Date(comment.approved_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-end whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 shrink-0 whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger render={
                                  <button 
                                    onClick={() => handleReplyClick(comment)} 
                                    className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-blue-500 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all duration-200 cursor-pointer"
                                  >
                                    <Reply size={13} />
                                  </button>
                                } />
                                <TooltipContent>{dict?.actions?.reply || "Reply"}</TooltipContent>
                              </Tooltip>
                              {comment.status === "pending" && (
                                <Tooltip>
                                  <TooltipTrigger render={
                                    <button 
                                      onClick={() => {setActionCommentId(comment.id); setIsApproveOpen(true);}} 
                                      className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer"
                                    >
                                      <Check size={13} />
                                    </button>
                                  } />
                                  <TooltipContent>{dict?.actions?.approve || "Approve"}</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger render={
                                  <button 
                                    onClick={() => {setActionCommentId(comment.id); setIsDeleteOpen(true);}} 
                                    className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                } />
                                <TooltipContent>{dict?.actions?.delete || "Delete"}</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* ── Cards View (Desktop & Mobile) ── */}
              <div className={`grid gap-4 ${viewMode === "cards" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 md:hidden"}`}>
                {filteredComments.map((comment) => (
                    <div key={comment.id} id={`comment-${comment.id}`} className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                      
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5 text-start" dir="auto">
                              {comment.user_full_name || comment.user_name}
                              {comment.user_id && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-none">
                                  {dict?.table?.staff}
                                </Badge>
                              )}
                            </span>
                            <span className="text-xs text-text-muted truncate text-start" dir="ltr" style={{ unicodeBidi: "isolate" }}>{comment.user_email || "No email"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-text-subtle bg-surface-subtle border border-border-default/40 rounded px-2 py-0.5 max-w-[120px] truncate text-start" dir="auto" title={comment.article_title}>
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{comment.article_title}</span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getStatusBadgeClasses(comment.status)}`}>
                            {getStatusText(comment.status)}
                          </span>
                        </div>
                      </div>

                      <div className="bg-surface-subtle rounded-lg p-3 border border-border-subtle flex-1">
                        {comment.parent_id && (
                          <div className="flex items-center gap-1 text-xs text-text-subtle font-medium mb-1 text-start" dir="auto">
                            <Reply className="h-3.5 w-3.5 shrink-0 scale-x-[-1] text-text-subtle/80" />
                            <span>{dict?.actions?.replyTo || "Reply to"}: {comment.parent_user_name}</span>
                          </div>
                        )}
                        <p 
                          className="text-sm text-text-muted line-clamp-3 leading-relaxed m-0 cursor-pointer hover:text-foreground transition-colors text-start"
                          dir="auto"
                          onClick={() => setViewComment({id: comment.id, content: comment.content, author: comment.user_name})}
                        >
                          {comment.content}
                        </p>
                        {comment.content.length > 100 && (
                          <button 
                            onClick={() => setViewComment({id: comment.id, content: comment.content, author: comment.user_name})}
                            className="text-xs text-text-subtle font-medium mt-2 hover:text-primary hover:underline focus:outline-none self-start bg-transparent border-none cursor-pointer p-0"
                          >
                            {dict?.actions?.expand || "Read more"}
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-2.5 border-t border-border-subtle mt-auto min-h-[28px]">
                        <div className="text-[11px] text-text-muted truncate max-w-[150px]" title={comment.approved_by_name || ""}>
                          {comment.approved_by_name && (
                            <span><span className="font-semibold text-foreground">{dict?.table?.approvedBy || "Approved"}:</span> <span dir="auto">{comment.approved_by_name}</span></span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Tooltip>
                            <TooltipTrigger render={
                              <button 
                                onClick={() => handleReplyClick(comment)} 
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-text-subtle hover:text-blue-500 hover:bg-blue-500/10 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent"
                              >
                                <Reply size={13} />
                              </button>
                            } />
                            <TooltipContent>{dict?.actions?.reply || "Reply"}</TooltipContent>
                          </Tooltip>
                          {comment.status === "pending" && (
                            <Tooltip>
                              <TooltipTrigger render={
                                <button 
                                  onClick={() => {setActionCommentId(comment.id); setIsApproveOpen(true);}} 
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-text-subtle hover:text-emerald-500 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent"
                                >
                                  <Check size={13} />
                                </button>
                              } />
                              <TooltipContent>{dict?.actions?.approve || "Approve"}</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger render={
                              <button 
                                onClick={() => {setActionCommentId(comment.id); setIsDeleteOpen(true);}} 
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-text-subtle hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 cursor-pointer border-none outline-none bg-transparent"
                              >
                                <Trash2 size={13} />
                              </button>
                            } />
                            <TooltipContent>{dict?.actions?.delete || "Delete"}</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  ))}
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
        <ConfirmationModal
          open={isApproveOpen}
          onOpenChange={(open) => { if (!open) setIsApproveOpen(false); }}
          onConfirm={handleApproveConfirm}
          title={dict?.actions?.approve || "Approve Comment"}
          description={dict?.actions?.confirmApprove || "Are you sure?"}
          confirmLabel={dict?.actions?.confirmApproveButton || "Confirm Approval"}
          cancelLabel={dict?.actions?.cancel || "Cancel"}
          variant="info"
        />

        <ConfirmationModal
          open={isDeleteOpen}
          onOpenChange={(open) => { if (!open) setIsDeleteOpen(false); }}
          onConfirm={handleDeleteConfirm}
          title={dict?.actions?.delete || "Delete Comment"}
          description={dict?.actions?.confirmDelete || "Are you sure?"}
          confirmLabel={dict?.actions?.confirmDeleteButton || "Confirm Delete"}
          cancelLabel={dict?.actions?.cancel || "Cancel"}
          variant="danger"
        />

        <Dialog open={!!viewComment} onOpenChange={(open) => !open && setViewComment(null)}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden !rounded-2xl border border-border-default shadow-2xl bg-surface-card">
            <DialogHeader className="p-5 pb-4 border-b border-border-subtle flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold text-foreground">
                  {dict?.actions?.expand || "Full Comment"}
                </DialogTitle>
              </div>
              <DialogDescription className="hidden">Full comment details</DialogDescription>
              
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-muted">{dict?.table?.author || "Author"}:</span>
                <span className="text-xs font-bold text-foreground">
                  {viewComment?.author}
                </span>
              </div>
            </DialogHeader>

            <div className="px-5 pb-5 pt-2">
              <Textarea 
                readOnly
                dir="auto"
                value={viewComment?.content || ""}
                style={(() => {
                  const len = viewComment?.content?.length || 0;
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

        <Dialog open={isReplyOpen} onOpenChange={(open) => !open && handleReplyClose()}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden !rounded-2xl border border-border-subtle shadow-2xl bg-surface-card">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
            <DialogHeader className="p-6 pb-4 flex flex-col items-center gap-1">
              <DialogTitle className="text-xl font-bold text-foreground">
                {dict?.actions?.reply || "Reply to Comment"}
              </DialogTitle>
              <DialogDescription className="hidden">Reply to comment form</DialogDescription>
              <div className="flex items-center justify-center gap-2 text-sm mt-1">
                <span className="text-text-muted">{dict?.table?.author || "Author"}:</span>
                <Badge variant="outline" className="font-semibold text-foreground bg-surface-subtle px-2.5 py-0.5 rounded-full border-border-subtle">
                  {replyComment?.user_name}
                </Badge>
              </div>
            </DialogHeader>
            <div className="px-6 pb-6 flex flex-col gap-4">
              <Textarea 
                readOnly
                dir="auto"
                value={replyComment?.content || ""}
                style={(() => {
                  const len = replyComment?.content?.length || 0;
                  if (len <= 150) return { height: "80px", overflowY: "auto" as const };
                  if (len <= 400) return { height: "140px", overflowY: "auto" as const };
                  return { height: "220px", overflowY: "auto" as const };
                })()}
                className="w-full resize-none bg-surface-subtle/50 !border-border-subtle/50 text-sm text-text-muted p-3 rounded-xl leading-relaxed !ring-0 !outline-none select-none cursor-default hover:!border-border-subtle/50 focus:!border-border-subtle/50 focus-visible:!border-border-subtle/50 focus-visible:!shadow-none"
                onFocus={(e) => e.target.blur()}
                tabIndex={-1}
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reply-content" className="text-xs font-semibold text-text-subtle">
                  {dict?.actions?.writeReply || "Write a reply..."}
                </Label>
                <Textarea
                  id="reply-content"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={dict?.actions?.writeReply || "Write a reply..."}
                  className="min-h-[120px] !rounded-xl"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border-default flex items-center justify-end gap-2">
              <Button variant="outline" type="button" onClick={handleReplyClose} size="sm" className="font-semibold rounded-lg">
                {dict?.actions?.cancel || "Cancel"}
              </Button>
              <Button 
                type="button" 
                onClick={handleReplySubmit} 
                disabled={!replyText.trim() || replyMutation.isPending} 
                size="sm"
                className="font-semibold bg-primary hover:bg-primary/90 text-primary-foreground border-none gap-1.5 rounded-lg"
              >
                {replyMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                {replyMutation.isPending ? "" : (dict?.actions?.submitReply || "Submit Reply")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </DashboardLayout>
    </TooltipProvider>
  );
}
