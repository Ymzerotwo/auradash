"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Search, Plus, Trash2, Pencil, ChevronLeft, ChevronRight, LayoutGrid, TableProperties, FolderOpen, Tag, Copy } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceCategoryFormDialog } from "./ServiceCategoryFormDialog";
import { ServiceFormDialog } from "./ServiceFormDialog";
import { DuplicateServiceDialog } from "./DuplicateServiceDialog";
import { type Dictionary } from "@/lib/i18n/dictionaries";

import { type ServiceCategory } from "@/lib/services/service-category.service";
import { type ServiceData } from "@/lib/services/service.service";
import { useServicesPageState, type UnifiedItem } from "@/lib/hooks/useServices";
import { PaginationControl } from "@/components/ui/PaginationControl";

type ViewMode = "table" | "cards";
type TabMode = "services" | "categories";

/* ─── Actions Component ────────────────────────────────────────────── */
function ActionsMenu({ item, t, onEdit, onDelete, onDuplicate }: { 
  item: UnifiedItem, 
  t: Dictionary, 
  onEdit: (item: UnifiedItem) => void, 
  onDelete: (item: UnifiedItem) => void,
  onDuplicate?: (item: UnifiedItem) => void
}) {
  const dict = t.services;
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
      {item.type === "service" && onDuplicate && (
        <Tooltip>
          <TooltipTrigger render={
            <button onClick={() => onDuplicate(item)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-purple-400 hover:bg-purple-500/15 hover:border-purple-500/30 transition-all duration-200 cursor-pointer">
              <Copy size={13} />
            </button>
          } />
          <TooltipContent>{dict.actions.duplicate}</TooltipContent>
        </Tooltip>
      )}
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
export default function ServicesPage() {
  const router = useRouter();
  const state = useServicesPageState();
  const {
    t, locale, dict, isRtl, currentUser, isAdmin,
    searchInputValue,
    statusFilter,
    viewMode, setViewMode,
    activeTab, setActiveTab,
    currentPage, setCurrentPage,
    itemsPerPage,
    isLoading, itemList, totalPages,
    isMobile,
    isDeleteModalOpen, setIsDeleteModalOpen,
    itemToDelete,
    isServiceCategoryModalOpen, setIsServiceCategoryModalOpen,
    isServiceModalOpen, setIsServiceModalOpen,
    editingServiceCategory, setEditingServiceCategory,
    editingService, setEditingService,
    isDuplicateModalOpen, setIsDuplicateModalOpen,
    itemToDuplicate,
    openEditModal, openDeleteModal, openDuplicateModal, confirmDelete,
    handleSearchChange, handleFilterChange, formatDate, filterTabs,
    deleteServiceCategoryMutation, deleteServiceMutation
  } = state;

  return (
    <TooltipProvider delay={200}>
      <DashboardLayout pageTitle={dict.pageTitle}>
        <div className="flex flex-col gap-6 w-full pb-10">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground m-0 mb-1">{dict.pageTitle}</h2>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-col sm:flex-row">
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => { setEditingServiceCategory(null); setIsServiceCategoryModalOpen(true); }}>
                <Plus size={16} className="me-1" />
                {dict.actions.createCategory}
              </Button>
              <Button size="sm" className="w-full sm:w-auto" onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }}>
                <Plus size={16} className="me-1" />
                {dict.actions.createService}
              </Button>
            </div>
          </div>

          {/* Top Tabs (Services vs Categories) */}
          <div className="flex items-center gap-1 bg-surface-subtle border border-border-default rounded-xl p-1 self-start">
            <button
              onClick={() => { setActiveTab("services"); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer border-none outline-none ${
                activeTab === "services"
                  ? "bg-background text-foreground shadow-sm"
                  : "bg-transparent text-text-muted hover:text-foreground"
              }`}
            >
              <Tag size={16} />
              {dict.tabs.services}
            </button>
            <button
              onClick={() => { setActiveTab("categories"); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer border-none outline-none ${
                activeTab === "categories"
                  ? "bg-background text-foreground shadow-sm"
                  : "bg-transparent text-text-muted hover:text-foreground"
              }`}
            >
              <FolderOpen size={16} />
              {dict.tabs.categories}
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3">
            <div className="w-full">
              <Input
                id="service-search"
                icon={Search}
                value={searchInputValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={dict.search.placeholder}
                className="h-10 rounded-lg text-sm w-full"
              />
            </div>
            
            {/* Filters (Left) & View Toggle (Right) */}
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-1 bg-surface-subtle rounded-lg p-1 overflow-x-auto whitespace-nowrap scrollbar-hide max-w-full">
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

              <div className="hidden md:flex items-center gap-1 bg-surface-subtle rounded-lg p-1 shrink-0">
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
          </div>

          {/* Content Area */}
          {isLoading ? (
            viewMode === "table" ? (
              <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                <Table className="min-w-[1100px]">
                  <TableHeader>
                    <TableRow className="bg-surface-subtle/50">
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
                    {Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        {isAdmin && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                        {isAdmin && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                        {isAdmin && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                        {isAdmin && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                        <TableCell><div className="flex justify-end gap-1"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1 flex-1">
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
                {activeTab === "services" ? <Tag size={24} className="text-text-muted" /> : <FolderOpen size={24} className="text-text-muted" />}
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                {activeTab === "services" ? dict.tabs.services : dict.tabs.categories}
              </h3>
              <p className="text-sm text-text-muted m-0">{dict.search.noResults}</p>
            </div>
          ) : (
            <>
              {/* Table View */}
              {viewMode === "table" && (
                <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                  <Table className="min-w-[1100px]" columnWidths={isAdmin ? [20, 16, 7, 9, 12, 10, 12, 10, 4] : [35, 25, 10, 15, 15]}>
                    <TableHeader>
                      <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                        <TableHead className="whitespace-nowrap">{dict.table.title}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table.slug}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.form?.sortOrder || "Order"}</TableHead>
                        <TableHead className="whitespace-nowrap">{dict.table.status}</TableHead>
                        {isAdmin && <TableHead className="whitespace-nowrap">{dict.table.createdBy}</TableHead>}
                        {isAdmin && <TableHead className="whitespace-nowrap">{dict.table.created}</TableHead>}
                        {isAdmin && <TableHead className="whitespace-nowrap">{dict.table.updatedBy}</TableHead>}
                        {isAdmin && <TableHead className="whitespace-nowrap">{dict.table.updated}</TableHead>}
                        <TableHead className="text-end whitespace-nowrap">{dict.table.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemList.map((item) => (
                        <TableRow 
                          key={item.id} 
                          className={`group ${item.type === 'category' ? 'cursor-pointer hover:bg-surface-subtle/50' : 'hover:bg-transparent'}`}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('.actions-menu')) return;
                            if (item.type === 'category') router.push(`/services/${item.id}`);
                          }}
                        >
                          <TableCell className="font-medium text-foreground max-w-[220px] overflow-hidden">
                            <span className="truncate block w-full text-start" dir="auto" title={item.title}>{item.title}</span>
                          </TableCell>
                          <TableCell className="text-text-muted font-mono text-sm max-w-[180px] overflow-hidden">
                            <span className="truncate block w-full text-start" dir="ltr" style={{ unicodeBidi: "isolate" }} title={item.slug}>{item.slug}</span>
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-text-subtle whitespace-nowrap">#{item.sort_order ?? 0}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${item.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-surface-subtle text-text-subtle border border-border-default/40"}`}>
                              {item.is_active ? dict.search.filterActive : dict.search.filterInactive}
                            </span>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-sm font-medium text-foreground max-w-[150px] overflow-hidden">
                              <span className="truncate block w-full text-start" dir="auto" title={(item.raw as any).created_by_name || (item.raw as any).created_by || "—"}>
                                {(item.raw as any).created_by_name || (item.raw as any).created_by || "—"}
                              </span>
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">
                              {item.created_at ? formatDate(item.created_at) : "—"}
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell className="text-sm font-medium text-foreground max-w-[150px] overflow-hidden">
                              <span className="truncate block w-full text-start" dir="auto" title={(item.raw as any).updated_by_name || (item.raw as any).updated_by || "—"}>
                                {(item.raw as any).updated_by_name || (item.raw as any).updated_by || "—"}
                              </span>
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">
                              {(item.raw as any).updated_at ? formatDate((item.raw as any).updated_at) : "—"}
                            </TableCell>
                          )}
                          <TableCell className="text-end actions-menu whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 shrink-0 whitespace-nowrap">
                              <ActionsMenu item={item} t={t} onEdit={openEditModal} onDelete={openDeleteModal} onDuplicate={openDuplicateModal} />
                            </div>
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
                    <div 
                      key={item.id} 
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('.actions-menu')) return;
                        if (item.type === 'category') router.push(`/services/${item.id}`);
                      }}
                      className={`bg-surface-card border border-border-default rounded-xl p-4 flex flex-col gap-2.5 group ${item.type === 'category' ? 'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-border-subtle' : ''}`}
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
                            {item.is_active ? dict.search.filterActive : dict.search.filterInactive}
                          </span>
                        </div>
                      </div>
                      
                      {/* Footer: Created By + Actions */}
                      <div className="mt-auto pt-2.5 border-t border-border-subtle flex items-center justify-between min-h-[28px]">
                        <div className="text-[11px] text-text-muted truncate max-w-[150px]" title={(item.raw as any)?.created_by_name || ""}>
                          {((item.raw as any)?.created_by_name) && (
                            <span><span className="font-semibold text-foreground">{dict.table?.createdBy || "Created by"}:</span> <span dir="auto">{(item.raw as any).created_by_name}</span></span>
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
          isLoading={deleteServiceCategoryMutation.isPending || deleteServiceMutation.isPending}
          variant="danger"
        />

        <ServiceCategoryFormDialog
          open={isServiceCategoryModalOpen}
          onOpenChange={setIsServiceCategoryModalOpen}
          category={editingServiceCategory}
        />

        <ServiceFormDialog
          open={isServiceModalOpen}
          onOpenChange={setIsServiceModalOpen}
          service={editingService}
        />

        <DuplicateServiceDialog
          open={isDuplicateModalOpen}
          onOpenChange={setIsDuplicateModalOpen}
          sourceService={itemToDuplicate!}
        />
      </DashboardLayout>
    </TooltipProvider>
  );
}
