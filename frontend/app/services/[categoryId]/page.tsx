"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Search, Plus, Trash2, Pencil, ChevronLeft, ChevronRight, LayoutGrid, TableProperties, Tag, FolderOpen, ArrowLeft, ArrowRight, Settings, Copy } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryServiceFormDialog } from "./CategoryServiceFormDialog";
import { ServiceCategorySettingsDialog } from "./ServiceCategorySettingsDialog";
import { DuplicateCategoryServiceDialog } from "./DuplicateCategoryServiceDialog";
import { type Dictionary } from "@/lib/i18n/dictionaries";
import { PaginationControl } from "@/components/ui/PaginationControl";

import { type ServiceData } from "@/lib/services/service.service";
import { useCategoryDetailsPageState } from "@/lib/hooks/useServiceCategories";

type ViewMode = "table" | "cards";

/* ─── Actions Component ────────────────────────────────────────────── */
function ActionsMenu({ item, t, onEdit, onDelete, onDuplicate }: { 
  item: ServiceData, 
  t: Dictionary, 
  onEdit: (item: ServiceData) => void, 
  onDelete: (item: ServiceData) => void,
  onDuplicate: (item: ServiceData) => void
}) {
  const dict = t.categories;
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <Tooltip>
        <TooltipTrigger render={
          <button onClick={() => onEdit(item)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/30 transition-all duration-200 cursor-pointer">
            <Pencil size={13} />
          </button>
        } />
        <TooltipContent>{dict.actions.edit}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={
          <button onClick={() => onDuplicate(item)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-purple-400 hover:bg-purple-500/15 hover:border-purple-500/30 transition-all duration-200 cursor-pointer">
            <Copy size={13} />
          </button>
        } />
        <TooltipContent>{t.services.actions.duplicate}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={
          <button onClick={() => onDelete(item)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 cursor-pointer">
            <Trash2 size={13} />
          </button>
        } />
        <TooltipContent>{dict.actions.delete}</TooltipContent>
      </Tooltip>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────── */
export default function CategoryDetailsPage() {
  const { categoryId } = useParams() as { categoryId: string };
  const router = useRouter();
  const state = useCategoryDetailsPageState(categoryId);
  const {
    t, locale, dict, isRtl, currentUser, isAdmin,
    searchInputValue,
    statusFilter,
    viewMode, setViewMode,
    currentPage, setCurrentPage,
    itemsPerPage,
    category, serviceData, deleteServiceMutation,
    isLoading, itemList, totalPages,
    isMobile,
    isDeleteModalOpen, setIsDeleteModalOpen,
    itemToDelete,
    isServiceModalOpen, setIsServiceModalOpen,
    isCategorySettingsOpen, setIsCategorySettingsOpen,
    editingService, setEditingService,
    isDuplicateModalOpen, setIsDuplicateModalOpen,
    itemToDuplicate,
    openEditModal, openDeleteModal, openDuplicateModal, confirmDelete,
    handleSearchChange, handleFilterChange, formatDate, filterTabs
  } = state;

  return (
    <TooltipProvider delay={200}>
      <DashboardLayout pageTitle={category?.name || dict.pageTitle}>
        <div className="flex flex-col gap-6 w-full pb-10">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => router.push('/services')} className="shrink-0 h-9 w-9">
                {isRtl ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
              </Button>
              <div>
                <h2 className="text-xl font-bold text-foreground m-0 mb-1 flex items-center gap-2">
                  <FolderOpen size={20} className="text-primary" />
                  {category?.name || "..."}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => setIsCategorySettingsOpen(true)}>
                <Settings size={16} className="me-1" />
                {dict.settingsButton || "Settings"}
              </Button>
              <Button size="sm" className="w-full sm:w-auto" onClick={() => { setEditingService({ category_id: categoryId } as ServiceData); setIsServiceModalOpen(true); }}>
                <Plus size={16} className="me-1" />
                {dict.actions.createService}
              </Button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <Input
                id="service-search"
                icon={Search}
                value={searchInputValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={dict.search.placeholder}
                className="h-10 rounded-lg text-sm w-full"
              />
            </div>
            
            <div className="flex items-center gap-1 bg-surface-subtle rounded-lg p-1 overflow-x-auto whitespace-nowrap scrollbar-hide self-start sm:self-auto max-w-full">
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleFilterChange(tab.value)}
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

            <div className="hidden md:flex items-center gap-1 bg-surface-subtle rounded-lg p-1 ms-auto shrink-0">
              <button
                onClick={() => setViewMode("table")}
                title={dict.search.viewTable}
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
                title={dict.search.viewCards}
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

          {/* Content Area */}
          {isLoading ? (
            viewMode === "table" ? (
              <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                <Table className="min-w-[1200px]" columnWidths={isAdmin ? [22, 16, 10, 11, 11, 11, 11, 8] : [55, 25, 12, 8]}>
                  <TableHeader>
                    <TableRow className="bg-surface-subtle/50">
                      <TableHead>{dict.table.title}</TableHead>
                      <TableHead>{dict.table.slug}</TableHead>
                      <TableHead>{dict.table.status}</TableHead>
                      {isAdmin && <TableHead>{dict.table.createdBy}</TableHead>}
                      {isAdmin && <TableHead>{dict.table.created}</TableHead>}
                      {isAdmin && <TableHead>{dict.table.updatedBy}</TableHead>}
                      {isAdmin && <TableHead>{dict.table.updated}</TableHead>}
                      <TableHead className="text-end">{dict.table.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        {isAdmin && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                        {isAdmin && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                        {isAdmin && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                        {isAdmin && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                        <TableCell><div className="flex justify-end gap-1"><Skeleton className="h-7 w-7 rounded-md" /><Skeleton className="h-7 w-7 rounded-md" /></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: itemsPerPage }).map((_, i) => (
                  <div key={i} className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3">
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
                ))}
              </div>
            )
          ) : itemList.length === 0 ? (
            <div className="bg-surface-card border border-border-default rounded-xl flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
                <Tag size={24} className="text-text-muted" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                {dict.pageTitle}
              </h3>
              <p className="text-sm text-text-muted m-0">{dict.search.noResults}</p>
            </div>
          ) : (
            <>
              {/* Table View */}
              {viewMode === "table" && (
                <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                  <Table className="min-w-[1100px]">
                    <TableHeader>
                      <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                        <TableHead>{dict.table.title}</TableHead>
                        <TableHead>{dict.table.slug}</TableHead>
                        <TableHead>{dict.form?.sortOrder || "Order"}</TableHead>
                        <TableHead>{dict.table.status}</TableHead>
                        {isAdmin && <TableHead>{dict.table.createdBy}</TableHead>}
                        {isAdmin && <TableHead>{dict.table.created}</TableHead>}
                        {isAdmin && <TableHead>{dict.table.updatedBy}</TableHead>}
                        {isAdmin && <TableHead>{dict.table.updated}</TableHead>}
                        <TableHead className="text-end">{dict.table.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemList.map((item) => (
                        <TableRow key={item.id} className="group hover:bg-transparent">
                          <TableCell className="font-medium text-foreground" title={item.name}>{item.name}</TableCell>
                          <TableCell className="text-text-muted font-mono text-sm" title={item.slug}>{item.slug}</TableCell>
                          <TableCell className="text-xs font-mono font-bold text-text-subtle">#{item.sort_order ?? 0}</TableCell>
                          <TableCell>
                            <Badge variant={item.is_active ? "default" : "secondary"}>
                              {item.is_active ? dict.search.filterActive : dict.search.filterInactive}
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-sm font-medium text-foreground">
                              {(item as any).created_by_name || (item as any).created_by || "—"}
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">
                              {item.created_at ? formatDate(item.created_at) : "—"}
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell className="text-sm font-medium text-foreground">
                              {(item as any).updated_by_name || (item as any).updated_by || "—"}
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">
                              {(item as any).updated_at ? formatDate((item as any).updated_at) : "—"}
                            </TableCell>
                          )}
                          <TableCell className="text-end">
                            <ActionsMenu item={item} t={t} onEdit={openEditModal} onDelete={openDeleteModal} onDuplicate={openDuplicateModal} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Cards View */}
              {(viewMode === "cards" || isMobile) && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${viewMode === 'table' ? 'md:hidden' : ''}`}>
                  {itemList.map((item) => (
                    <div key={item.id} className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-2.5 group">
                      {/* Top: Details + Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <h3 className="text-base font-bold text-foreground line-clamp-1 m-0" title={item.name}>
                            {item.name}
                          </h3>
                          <p className="text-xs text-text-muted font-mono truncate m-0">
                            /{item.slug}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-subtle text-text-muted border border-border-default/50" title={dict.form?.sortOrder || "Order"}>
                            #{item.sort_order ?? 0}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${item.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-surface-subtle text-text-subtle border border-border-default/40"} shadow-sm`}>
                            {item.is_active ? dict.search.filterActive : dict.search.filterInactive}
                          </span>
                        </div>
                      </div>
                      
                      {/* Footer: Created By + Actions */}
                      <div className="mt-auto pt-2.5 border-t border-border-subtle flex items-center justify-between min-h-[28px]">
                        <div className="text-[11px] text-text-muted truncate max-w-[150px]" title={(item as any)?.created_by_name || ""}>
                          {((item as any)?.created_by_name) && (
                            <span><span className="font-semibold text-foreground">{dict.table?.createdBy || "Created by"}:</span> {(item as any).created_by_name}</span>
                          )}
                        </div>
                        <div className="actions-menu">
                          <ActionsMenu item={item} t={t} onEdit={openEditModal} onDelete={openDeleteModal} onDuplicate={openDuplicateModal} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <PaginationControl
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>

        {/* Delete Modal */}
        <ConfirmationModal
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          title={dict.actions.delete}
          description={dict.actions.confirmDelete}
          onConfirm={confirmDelete}
          confirmLabel={dict.actions.delete}
          cancelLabel={dict.actions.cancel}
          isLoading={deleteServiceMutation.isPending}
          variant="danger"
        />

        <CategoryServiceFormDialog
          open={isServiceModalOpen}
          onOpenChange={setIsServiceModalOpen}
          service={editingService}
          categoryName={category?.name || ""}
        />

        <DuplicateCategoryServiceDialog
          open={isDuplicateModalOpen}
          onOpenChange={setIsDuplicateModalOpen}
          sourceService={itemToDuplicate!}
          categoryName={category?.name || ""}
        />

        <ServiceCategorySettingsDialog
          open={isCategorySettingsOpen}
          onOpenChange={setIsCategorySettingsOpen}
          category={category || null}
        />
      </DashboardLayout>
    </TooltipProvider>
  );
}
