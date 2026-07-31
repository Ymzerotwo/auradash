"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Search, Plus, Image as ImageIcon, Video, File as FileIcon, Trash2, Download, Pencil, LayoutGrid, TableProperties, UploadCloud } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaItem } from "@/lib/services/media.service";
import { useMediaPageState, useVideoPreview, useGifPreview } from "@/lib/hooks/useMedia";
import { API_BASE_URL } from "@/lib/api/client";
import { type Dictionary } from "@/lib/i18n/dictionaries";
import { useAuthStore } from "@/lib/stores/auth.store";
import { PaginationControl } from "@/components/ui/PaginationControl";

/* ─── Helpers ────────────────────────────────────────────────── */
function getFileUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
}

function getMediaIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon size={24} className="text-blue-500" />;
  if (mimeType.startsWith("video/")) return <Video size={24} className="text-purple-500" />;
  return <FileIcon size={24} className="text-gray-500" />;
}

/* ─── Video Preview Component ────────────────────────────────────── */
function VideoPreview({ url }: { url: string }) {
  const { isHovered, setIsHovered } = useVideoPreview();

  return (
    <div
      className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-indigo-500/10 dark:from-purple-500/5 dark:to-indigo-500/5 transition-all duration-300 animate-in fade-in"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered ? (
        <video
          src={url}
          className="w-full h-full object-cover animate-in fade-in duration-300"
          muted
          playsInline
          autoPlay
          loop
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition-all duration-300">
          <Video size={18} className="fill-purple-600/20 dark:fill-purple-400/20 group-hover:scale-110 transition-transform duration-300" />
        </div>
      )}
    </div>
  );
}

/* ─── GIF Preview Component ─────────────────────────────────────── */
function GifPreview({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const { isHovered, setIsHovered, canvasRef, imgRef, setImgLoaded } = useGifPreview(url);

  return (
    <div
      className="w-full h-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={url}
        alt={alt}
        className={`${className} ${isHovered ? "opacity-100" : "absolute opacity-0 pointer-events-none"}`}
        onLoad={() => setImgLoaded(true)}
        loading="lazy"
        decoding="async"
      />
      {!isHovered && (
        <canvas
          ref={canvasRef}
          className={className}
        />
      )}
    </div>
  );
}

/* ─── Actions Component ────────────────────────────────────────────── */
function MediaActions({ item, t, onDownload, onEdit, onDelete }: { 
  item: MediaItem, 
  t: Dictionary, 
  onDownload: (id: string, name: string) => void, 
  onEdit: (item: MediaItem) => void, 
  onDelete: (item: MediaItem) => void 
}) {
  const m = t.media;
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <Tooltip>
        <TooltipTrigger render={
          <button onClick={() => onDownload(item.id, item.file_name)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-blue-500 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all duration-200 cursor-pointer">
            <Download size={13} />
          </button>
        } />
        <TooltipContent>{m.actions.download}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={
          <button onClick={() => onEdit(item)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/30 transition-all duration-200 cursor-pointer">
            <Pencil size={13} />
          </button>
        } />
        <TooltipContent>{m.actions.edit}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={
          <button onClick={() => onDelete(item)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 cursor-pointer">
            <Trash2 size={13} />
          </button>
        } />
        <TooltipContent>{m.actions.delete}</TooltipContent>
      </Tooltip>
    </div>
  );
}

/* ─── Skeletons ──────────────────────────────────────────────────── */
function MediaCardSkeleton({ isAdmin }: { isAdmin?: boolean }) {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden flex flex-col">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-3 flex flex-col gap-2">
        <Skeleton className="h-3.5 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
        {isAdmin && <Skeleton className="h-3 w-1/3 rounded-md" />}
      </div>
      <div className="px-3 pb-3 flex items-center justify-between">
        {isAdmin ? <Skeleton className="h-3 w-1/4 rounded-md" /> : <div />}
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function MediaTableRowSkeleton({ isAdmin }: { isAdmin?: boolean }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell><div className="flex items-center gap-3"><Skeleton className="w-9 h-9 rounded-lg shrink-0" /><Skeleton className="h-3.5 w-36 rounded-md" /></div></TableCell>
      <TableCell><Skeleton className="h-3 w-20 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-3 w-16 rounded-md" /></TableCell>
      {isAdmin && <TableCell><Skeleton className="h-3 w-24 rounded-md" /></TableCell>}
      {isAdmin && <TableCell><Skeleton className="h-3 w-16 rounded-md" /></TableCell>}
      <TableCell><div className="flex justify-end gap-1"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div></TableCell>
    </TableRow>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────── */

export default function MediaPage() {
  const { t, locale } = useTranslation();
  const m = t.media;
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const state = useMediaPageState();

  // ─── Format Helpers ─────────────────────────────────────────
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return `0 ${m.units.bytes}`;
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = [m.units.bytes, m.units.kb, m.units.mb, m.units.gb, m.units.tb];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        year: "numeric", month: "short", day: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return "—";
    }
  };

  const filterTabs: { label: string; value: "all" | "image" | "video" }[] = [
    { label: m.search.filterAll, value: "all" },
    { label: m.search.filterImages, value: "image" },
    { label: m.search.filterVideos, value: "video" },
  ];

  return (
    <TooltipProvider delay={200}>
      <DashboardLayout pageTitle={m.pageTitle}>
        <div className="flex flex-col gap-6 w-full pb-10">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground m-0 mb-1">{m.pageTitle}</h2>
            </div>
            <Button size="sm" onClick={() => state.setIsUploadModalOpen(true)} className="w-full sm:w-auto self-start sm:self-auto">
              <Plus size={16} />
              {m.actions.uploadMedia}
            </Button>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-surface-card border border-border-default rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <Input
                id="media-search"
                icon={Search}
                value={state.searchQuery}
                onChange={(e) => state.handleSearchChange(e.target.value)}
                placeholder={m.search.placeholder}
                className="h-10 rounded-lg text-sm w-full"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                name="media_search_field"
              />
            </div>
            
            <div className="flex items-center gap-1 bg-surface-subtle rounded-lg p-1 overflow-x-auto whitespace-nowrap scrollbar-hide self-start sm:self-auto max-w-full">
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => state.handleFilterChange(tab.value as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${
                    state.typeFilter === tab.value
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
                onClick={() => state.setViewMode("table")}
                title={m.search.viewTable}
                className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${
                  state.viewMode === "table"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-transparent text-text-muted hover:text-foreground"
                }`}
              >
                <TableProperties size={16} />
              </button>
              <button
                onClick={() => state.setViewMode("cards")}
                title={m.search.viewCards}
                className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none outline-none ${
                  state.viewMode === "cards"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-transparent text-text-muted hover:text-foreground"
                }`}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          {state.isLoading ? (
            state.viewMode === "table" ? (
              <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                <Table className="min-w-[1000px]" columnWidths={isAdmin ? [30, 15, 12, 15, 20, 8] : [50, 15, 15, 20]}>
                  <TableHeader>
                    <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                      <TableHead>{m.table.file}</TableHead>
                      <TableHead>{m.table.type}</TableHead>
                      <TableHead>{m.table.size}</TableHead>
                      {isAdmin && <TableHead>{m.table.uploaded}</TableHead>}
                      {isAdmin && <TableHead>{m.table.uploadedBy}</TableHead>}
                      <TableHead className="text-end">{m.table.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <MediaTableRowSkeleton key={i} isAdmin={isAdmin} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: state.itemsPerPage }).map((_, i) => (
                  <MediaCardSkeleton key={i} isAdmin={isAdmin} />
                ))}
              </div>
            )
          ) : state.mediaList.length === 0 ? (
            <div className="bg-surface-card border border-border-default rounded-xl flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
                <Search size={24} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted m-0">{m.search.noResults}</p>
            </div>
          ) : (
            <>
              {state.viewMode === "table" && (
                <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto hidden md:block">
                  <Table className="min-w-[1000px]" columnWidths={isAdmin ? [30, 15, 12, 15, 20, 8] : [50, 15, 15, 20]}>
                    <TableHeader>
                      <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                        <TableHead>{m.table.file}</TableHead>
                        <TableHead>{m.table.type}</TableHead>
                        <TableHead>{m.table.size}</TableHead>
                        {isAdmin && <TableHead>{m.table.uploaded}</TableHead>}
                        {isAdmin && <TableHead>{m.table.uploadedBy}</TableHead>}
                        <TableHead className="text-end">{m.table.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {state.mediaList.map((item) => (
                        <TableRow key={item.id} className="group hover:bg-transparent">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border-default flex items-center justify-center shrink-0 overflow-hidden relative">
                                {item.mime_type === 'image/gif' ? (
                                  <GifPreview url={getFileUrl(item.file_url)} alt={item.alt_text || item.file_name} className="w-full h-full object-cover" />
                                ) : item.mime_type.startsWith('image/') ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={getFileUrl(item.file_url)} alt={item.alt_text || item.file_name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                ) : item.mime_type.startsWith('video/') ? (
                                  <VideoPreview url={getFileUrl(item.file_url)} />
                                ) : (
                                  getMediaIcon(item.mime_type)
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-foreground truncate max-w-[250px] lg:max-w-[450px] text-start" title={item.file_name} dir="ltr">{item.file_name}</span>
                                {item.alt_text && <span className="text-xs text-text-muted truncate max-w-[250px] lg:max-w-[450px]" title={item.alt_text}>{item.alt_text}</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border border-border-default/40 bg-surface-subtle text-text-subtle font-mono lowercase">
                              {item.mime_type.split('/')[1] || item.mime_type}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-text-subtle font-mono">{formatBytes(item.size_bytes)}</span>
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <span className="text-xs font-medium text-foreground">{formatDate(item.created_at)}</span>
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell>
                              <span className="text-xs font-medium text-foreground">{item.created_by_name || item.created_by || "—"}</span>
                            </TableCell>
                          )}
                          <TableCell className="text-end">
                            <MediaActions item={item} t={t as any} onDownload={state.handleDownload} onEdit={state.openEditModal} onDelete={state.openDeleteModal} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {(state.viewMode === "cards" || state.isMobile) && (
                <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 ${state.viewMode === 'table' ? 'md:hidden' : ''}`}>
                  {state.mediaList.map((item) => (
                    <div key={item.id} className="bg-surface-card border border-border-default rounded-xl overflow-hidden flex flex-col transition-[box-shadow,border-color] duration-200 hover:shadow-md hover:border-border-subtle group">
                      <div className="aspect-video bg-surface-subtle relative flex items-center justify-center overflow-hidden border-b border-border-default">
                        {item.mime_type === 'image/gif' ? (
                          <GifPreview 
                            url={getFileUrl(item.file_url)} 
                            alt={item.alt_text || item.file_name} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                          />
                        ) : item.mime_type.startsWith('image/') ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={getFileUrl(item.file_url)} 
                            alt={item.alt_text || item.file_name} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            loading="lazy"
                            decoding="async"
                          />
                        ) : item.mime_type.startsWith('video/') ? (
                          <VideoPreview url={getFileUrl(item.file_url)} />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 opacity-60">
                            {getMediaIcon(item.mime_type)}
                          </div>
                        )}
                        <span className="absolute top-2 start-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border border-border-default/40 bg-surface-subtle text-text-subtle font-mono lowercase shadow-sm">
                          {item.mime_type.split('/')[1] || item.mime_type}
                        </span>
                      </div>
                      <div className="p-4 flex flex-col gap-3 flex-1">
                        <div className="flex flex-col gap-0.5">
                          <h3 className="text-sm font-semibold text-foreground truncate text-start" title={item.file_name} dir="ltr">
                            {item.file_name}
                          </h3>
                          <p className="text-xs text-text-muted truncate">
                            {formatBytes(item.size_bytes)}{isAdmin && ` • ${formatDate(item.created_at)}`}
                          </p>
                        </div>
                        <div className="mt-auto pt-3 border-t border-border-subtle flex items-center justify-between">
                          {isAdmin ? (
                            <span className="text-[11px] font-medium text-text-subtle truncate max-w-[100px]">
                              {item.created_by_name || item.created_by || "—"}
                            </span>
                          ) : (
                            <div />
                          )}
                          <MediaActions item={item} t={t as any} onDownload={state.handleDownload} onEdit={state.openEditModal} onDelete={state.openDeleteModal} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Pagination Controls */}
          {state.totalPages > 1 && (
            <PaginationControl
              currentPage={state.currentPage}
              totalPages={state.totalPages}
              onPageChange={state.setCurrentPage}
            />
          )}
        </div>

        {/* Edit / Rename Modal */}
        <Dialog open={state.isEditModalOpen} onOpenChange={state.setIsEditModalOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:w-full !max-w-[340px] p-0 overflow-hidden !rounded-2xl bg-surface-card border border-border-default/60 shadow-2xl animate-in fade-in zoom-in-95 duration-200" showCloseButton={false}>
            <div className="relative px-5 pt-5 pb-1 flex flex-col items-center text-center">
              <div className="absolute inset-x-0 top-0 h-[2px] opacity-80 bg-gradient-to-r from-transparent via-primary to-transparent" />
              
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 shadow-sm transition-transform duration-300 bg-primary/10 text-primary">
                <Pencil size={18} />
              </div>
              
              <DialogHeader className="flex flex-col items-center gap-1">
                <DialogTitle className="text-[15px] font-bold text-foreground tracking-tight leading-snug">
                  {m.actions.rename}
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="px-5 py-2">
              <div className="flex flex-col gap-1.5">
                <Input 
                  value={state.newFileName} 
                  onChange={(e) => state.setNewFileName(e.target.value)} 
                  placeholder="filename.ext" 
                  className={`h-9 !rounded-lg text-[13px] w-full ${state.errors.file_name ? 'border-destructive focus-visible:ring-destructive' : ''}`} 
                  autoFocus
                />
                {state.errors.file_name && <span className="text-[11px] text-destructive font-medium">{state.errors.file_name}</span>}
              </div>
            </div>

            <div className="px-5 pb-5 pt-3 grid grid-cols-2 gap-2.5">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => state.setIsEditModalOpen(false)}
                className="w-full h-9 text-[13px] font-medium border-border-default/60 bg-surface-subtle/30 hover:bg-surface-subtle text-foreground transition-all cursor-pointer truncate"
              >
                {m.actions.cancel}
              </Button>
              <Button 
                onClick={state.saveEdit} 
                disabled={!state.newFileName.trim()} 
                className="w-full h-9 text-[13px] font-semibold bg-primary hover:bg-primary/90 text-white transition-all cursor-pointer truncate shadow-md shadow-primary/20"
              >
                {m.actions.saveChanges}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upload Modal */}
        <Dialog open={state.isUploadModalOpen} onOpenChange={state.setIsUploadModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{m.uploadModal.title}</DialogTitle>
            </DialogHeader>
            <div 
              onClick={() => state.fileInputRef.current?.click()}
              className={`py-8 flex flex-col items-center justify-center border-2 border-dashed border-border-default rounded-xl bg-surface-card hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer group mt-2 mb-2 ${state.uploadMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input type="file" ref={state.fileInputRef as any} onChange={state.handleFileChange} className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" />
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                {state.uploadMutation.isPending ? (
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadCloud size={32} className="text-primary" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1.5 text-center px-4">
                {state.uploadMutation.isPending ? m.status.uploading : m.uploadModal.description}
              </h3>
              <p className="text-xs text-text-muted mb-3 text-center px-4">{m.uploadModal.supportedFormats}</p>
              <Badge variant="secondary" className="font-mono text-[10px] mb-6 shadow-sm">{m.uploadModal.maxSize}</Badge>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Modal */}
        <ConfirmationModal
          open={state.isDeleteModalOpen}
          onOpenChange={state.setIsDeleteModalOpen}
          title={m.actions.delete}
          description={m.actions.confirmDelete}
          onConfirm={state.confirmDelete}
          confirmLabel={m.actions.confirmDeleteButton || m.actions.delete}
          cancelLabel={m.actions.cancel}
          isLoading={state.deleteMutation.isPending}
          variant="danger"
        />
      </DashboardLayout>
    </TooltipProvider>
  );
}
