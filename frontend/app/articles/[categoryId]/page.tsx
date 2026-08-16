"use client";

import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Search, Plus, Trash2, Pencil, ChevronLeft, ChevronRight, LayoutGrid, TableProperties, FileText, FolderOpen, ArrowLeft, ArrowRight, Settings, Copy } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryArticleFormDialog } from "./CategoryArticleFormDialog";
import { ArticleCategorySettingsDialog } from "./ArticleCategorySettingsDialog";
import { PaginationControl } from "@/components/ui/PaginationControl";
import { type ArticleData } from "@/lib/services/article.service";
import { useArticleCategoryPageState } from "@/lib/hooks/useArticles";

/* ─── Actions Component ────────────────────────────────────────────── */
function ActionsMenu({
  item,
  dict,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  item: ArticleData;
  dict: any;
  onEdit: (item: ArticleData) => void;
  onDelete: (item: ArticleData) => void;
  onDuplicate: (item: ArticleData) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={() => onEdit(item)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/30 transition-all duration-200 cursor-pointer">
            <Pencil size={13} />
          </button>
        </TooltipTrigger>
        <TooltipContent>{dict.actions?.edit || "Edit"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={() => onDuplicate(item)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-purple-400 hover:bg-purple-500/15 hover:border-purple-500/30 transition-all duration-200 cursor-pointer">
            <Copy size={13} />
          </button>
        </TooltipTrigger>
        <TooltipContent>{dict.actions?.duplicate || "Duplicate"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={() => onDelete(item)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 cursor-pointer">
            <Trash2 size={13} />
          </button>
        </TooltipTrigger>
        <TooltipContent>{dict.actions?.delete || "Delete"}</TooltipContent>
      </Tooltip>
    </div>
  );
}


/* ─── Skeletons ──────────────────────────────────────────────────── */
function ArticleTableRowSkeleton({ isAdmin }: { isAdmin?: boolean }) {
  return (
    <TableRow>
      <TableCell className="align-middle">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded bg-surface-subtle shrink-0" />
          <Skeleton className="h-4 w-32 rounded-md bg-surface-subtle" />
        </div>
      </TableCell>
      <TableCell className="align-middle"><Skeleton className="h-4 w-24 rounded-md bg-surface-subtle" /></TableCell>
      <TableCell className="align-middle"><Skeleton className="h-5 w-16 rounded-md bg-surface-subtle" /></TableCell>
      {isAdmin && <TableCell className="align-middle"><Skeleton className="h-4 w-28 rounded-md bg-surface-subtle" /></TableCell>}
      {isAdmin && <TableCell className="align-middle"><Skeleton className="h-4 w-28 rounded-md bg-surface-subtle" /></TableCell>}
      <TableCell className="align-middle text-end">
        <div className="flex justify-end gap-1">
          <Skeleton className="h-7 w-7 rounded-md bg-surface-subtle" />
          <Skeleton className="h-7 w-7 rounded-md bg-surface-subtle" />
          <Skeleton className="h-7 w-7 rounded-md bg-surface-subtle" />
        </div>
      </TableCell>
    </TableRow>
  );
}

function ArticleCardSkeleton() {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-5 w-3/4 rounded-md bg-surface-subtle" />
          <Skeleton className="h-4 w-1/2 rounded-md bg-surface-subtle" />
        </div>
        <Skeleton className="h-5 w-14 rounded-md bg-surface-subtle shrink-0" />
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

/* ─── Main Page ────────────────────────────────────────────────────── */
export default function ArticleCategoryDetailsPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const unwrappedParams = React.use(params);
  const state = useArticleCategoryPageState(unwrappedParams.categoryId);
  const {
    t, locale, dict, isRtl, currentUser, isAdmin,
    searchInputValue,
    statusFilter,
    viewMode, setViewMode,
    currentPage, setCurrentPage,
    itemsPerPage,
    category, isLoading, itemList, totalPages,
    isMobile,
    isDeleteModalOpen, setIsDeleteModalOpen,
    itemToDelete,
    isArticleModalOpen, setIsArticleModalOpen,
    isCategorySettingsOpen, setIsCategorySettingsOpen,
    editingArticle, setEditingArticle,
    openEditModal, openDeleteModal, openDuplicateModal, confirmDelete,
    handleSearchChange, handleFilterChange, formatDate, filterTabs,
    router, categoryId
  } = state;

  return (
    <TooltipProvider delay={200}>
      <DashboardLayout pageTitle={category?.title || dict.pageTitle}>
        <div className="flex flex-col gap-6 w-full pb-4">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => router.push("/articles")} className="shrink-0 h-9 w-9">
                {isRtl ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
              </Button>
              <div>
                <h2 className="text-xl font-bold text-foreground m-0 mb-1 flex items-center gap-2">
                  <FolderOpen size={20} className="text-primary" />
                  {category?.title || "..."}
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto flex-col sm:flex-row">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => setIsCategorySettingsOpen(true)}
              >
                <Settings size={16} className="me-2" />
                {(dict.actions as any)?.categorySettings || "Category Settings"}
              </Button>
              
              <Button 
                size="sm" 
                className="w-full sm:w-auto" 
                onClick={() => router.push(`/articles/${categoryId}/create`)}
              >
                <Plus size={16} className="me-1" />
                {dict.actions?.createArticle || "Add Article"}
              </Button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3">
            <div className="w-full">
              <Input
                id="article-search"
                icon={Search}
                value={searchInputValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={dict.search?.placeholder || "Search articles..."}
                className="h-10 rounded-lg text-sm w-full"
              />
            </div>
            
            {/* Filters (Left) & View Toggle (Right) */}
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-1 bg-surface-subtle rounded-lg p-1 overflow-x-auto whitespace-nowrap scrollbar-hide max-w-full">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => handleFilterChange(tab.value as any)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${
                      statusFilter === tab.value
                        ? "bg-primary text-white shadow-sm"
                        : "bg-transparent text-text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="hidden md:flex items-center gap-1 bg-surface-subtle rounded-lg p-1 shrink-0">
                <button
                  onClick={() => setViewMode("table")}
                  title={dict.search?.viewTable || "Table view"}
                  className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${
                    viewMode === "table"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-transparent text-text-muted hover:text-foreground"
                  }`}
                >
                  <TableProperties size={16} />
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  title={dict.search?.viewCards || "Grid view"}
                  className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${
                    viewMode === "cards"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-transparent text-text-muted hover:text-foreground"
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            viewMode === "table" ? (
              <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                <Table className="min-w-[1200px]">
                  <TableHeader>
                    <TableRow className="bg-surface-subtle/50">
                      <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                      {isAdmin && <TableHead><Skeleton className="h-4 w-20" /></TableHead>}
                      {isAdmin && <TableHead><Skeleton className="h-4 w-20" /></TableHead>}
                      <TableHead className="text-end"><Skeleton className="h-4 w-12 ms-auto" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <ArticleTableRowSkeleton key={i} isAdmin={isAdmin} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ArticleCardSkeleton key={i} />
                ))}
              </div>
            )
          ) : itemList.length === 0 ? (
            <div className="bg-surface-card border border-border-default rounded-xl flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
                <FileText size={24} className="text-text-muted" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                {dict.search?.noResults || "No articles found"}
              </h3>
              <p className="text-sm text-text-muted m-0">
                {searchInputValue ? "Try adjusting your search or filters" : "Get started by adding an article to this category"}
              </p>
            </div>
          ) : (
            <>
              {viewMode === "table" && (
                <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                  <Table className="min-w-[1200px]" columnWidths={isAdmin ? [24, 18, 8, 10, 16, 14, 10] : [38, 28, 10, 12, 12]}>
                    <TableHeader>
                      <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                        <TableHead className="whitespace-nowrap">{dict.table?.title || "Title"}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table?.slug || "Slug"}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.form?.sortOrder || "Order"}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table?.status || "Status"}</TableHead>
                        {isAdmin && <TableHead className="whitespace-nowrap">{dict.table?.createdBy || "Created By"}</TableHead>}
                        {isAdmin && <TableHead className="whitespace-nowrap">{dict.table?.created || "Created At"}</TableHead>}
                        <TableHead className="text-end whitespace-nowrap">{dict.table?.actions || "Actions"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemList.map((item) => (
                        <TableRow key={item.id} className="group hover:bg-transparent">
                          <TableCell className="font-medium text-foreground max-w-[220px] overflow-hidden">
                            <span className="truncate block w-full text-start" dir="auto" title={item.title}>{item.title}</span>
                          </TableCell>
                          <TableCell className="text-text-muted font-mono text-sm max-w-[180px] overflow-hidden">
                            <span className="truncate block w-full text-start" dir="ltr" style={{ unicodeBidi: "isolate" }} title={item.slug}>{item.slug}</span>
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-text-subtle whitespace-nowrap">#{item.sort_order ?? 0}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${item.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-surface-subtle text-text-subtle border border-border-default/40"}`}>
                              {item.is_active ? dict.search?.filterActive || "Active" : dict.search?.filterInactive || "Inactive"}
                            </span>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-sm font-medium text-foreground max-w-[150px] overflow-hidden">
                              <span className="truncate block w-full text-start" dir="auto" title={item.created_by_name || item.created_by || "—"}>{item.created_by_name || item.created_by || "—"}</span>
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">
                              {item.created_at ? formatDate(item.created_at) : "—"}
                            </TableCell>
                          )}
                          <TableCell className="text-end whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 shrink-0 whitespace-nowrap">
                              <ActionsMenu item={item} dict={dict} onEdit={openEditModal} onDelete={openDeleteModal} onDuplicate={openDuplicateModal} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {(viewMode === "cards" || isMobile) && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${viewMode === 'table' ? 'md:hidden' : ''}`}>
                  {itemList.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-2.5 group"
                    >
                      {/* Top: Details + Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <h3 className="text-base font-bold text-foreground line-clamp-1 m-0 text-start" dir="auto" title={item.title}>
                            {item.title}
                          </h3>
                          <p className="text-xs text-text-muted font-mono truncate m-0 text-start" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                            /{item.slug}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-subtle text-text-muted border border-border-default/50" title={dict.form?.sortOrder || "Order"}>
                            #{item.sort_order ?? 0}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${item.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-surface-subtle text-text-subtle border border-border-default/40"} shadow-sm`}>
                            {item.is_active ? dict.search?.filterActive || "Active" : dict.search?.filterInactive || "Inactive"}
                          </span>
                        </div>
                      </div>
                      
                      {/* Footer: Created By + Actions */}
                      <div className="mt-auto pt-2.5 border-t border-border-subtle flex items-center justify-between min-h-[28px]">
                        <div className="text-[11px] text-text-muted truncate max-w-[150px]" title={item.created_by_name || ""}>
                          {item.created_by_name && (
                            <span><span className="font-semibold text-foreground">{dict.table?.createdBy || "Created by"}:</span> <span dir="auto">{item.created_by_name}</span></span>
                          )}
                        </div>
                        <div className="actions-menu">
                          <ActionsMenu item={item} dict={dict} onEdit={openEditModal} onDelete={openDeleteModal} onDuplicate={openDuplicateModal} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {totalPages > 1 && (
            <PaginationControl
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>

        <ConfirmationModal
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          title={dict.actions?.delete || "Delete"}
          description={dict.actions?.confirmDelete || "Are you sure you want to delete this?"}
          onConfirm={confirmDelete}
          confirmLabel={dict.actions?.delete || "Delete"}
          cancelLabel={dict.actions?.cancel || "Cancel"}
          isLoading={false}
          variant="danger"
        />

        <CategoryArticleFormDialog
          open={isArticleModalOpen}
          onOpenChange={setIsArticleModalOpen}
          article={editingArticle}
          categoryId={categoryId}
        />
        
        <ArticleCategorySettingsDialog
          open={isCategorySettingsOpen}
          onOpenChange={setIsCategorySettingsOpen}
          category={category || null}
        />
      </DashboardLayout>
    </TooltipProvider>
  );
}
