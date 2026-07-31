/* eslint-disable @next/next/no-img-element */
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Video, CheckCircle2, UploadCloud, Loader2, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useMediaPickerState, MediaPickerItem } from "@/lib/hooks/useMedia";
import { useAuthStore } from "@/lib/stores/auth.store";

export type MediaType = "image" | "video" | "all";

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: MediaType;
  folder?: string;
  onSelect: (media: MediaPickerItem) => void;
}

export function MediaPickerDialog({ open, onOpenChange, type = "all", folder, onSelect }: MediaPickerDialogProps) {
  const { t, locale, dir } = useTranslation() as { t: Dictionary; locale: string; dir: "ltr" | "rtl" };
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const pickerDict = t.media?.picker;
  const mediaDict = t.media;

  const state = useMediaPickerState({ type, folder, onSelect, onOpenChange });

  // ─── Filter Tabs ───────────────────────────────────────────────
  const filterTabs: { label: string; value: "all" | "image" | "video" }[] = (() => {
    if (type !== "all") {
      return [
        { label: type === "image" ? (pickerDict?.image || "Image") : (pickerDict?.video || "Video"), value: type },
      ];
    }
    return [
      { label: mediaDict?.search?.filterAll || "All", value: "all" },
      { label: mediaDict?.search?.filterImages || "Images", value: "image" },
      { label: mediaDict?.search?.filterVideos || "Videos", value: "video" },
    ];
  })();

  // ─── Date Formatter ────────────────────────────────────────────
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return "-";
    }
  };

  // ─── Accept string for file input based on type ────────────────
  const getAcceptString = (): string => {
    const activeType = type !== "all" ? type : state.typeFilter;
    if (activeType === "image") return ["image/jpeg", "image/png", "image/webp", "image/gif"].join(",");
    if (activeType === "video") return ["video/mp4", "video/webm"].join(",");
    return ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"].join(",");
  };

  // ─── Upload button icon ────────────────────────────────────────
  const getUploadIcon = () => {
    const activeType = type !== "all" ? type : state.typeFilter;
    if (activeType === "image") return <ImageIcon size={16} />;
    if (activeType === "video") return <Video size={16} />;
    return <UploadCloud size={16} />;
  };

  const isUploading = state.uploadMutation.isPending;
  const { fileInputRef } = state;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[820px] w-[calc(100vw-2rem)] !max-w-[820px] bg-surface-card border-border-default text-foreground p-0 overflow-hidden flex flex-col h-[85vh] sm:h-[620px] !rounded-2xl"
        dir={dir}
        showCloseButton={false}
      >
        {/* ── Page Header ────────────────────────────────────────── */}
        <DialogHeader className="relative px-5 pt-5 pb-0 flex-shrink-0">
          <DialogClose
            render={
              <button className="dialog-close-btn">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            }
          />

          <div className="flex flex-col gap-1 pe-10">
            <DialogTitle className="text-xl font-bold text-foreground m-0 mb-1">
              {pickerDict?.title || "Select Media"}
            </DialogTitle>
            <p className="text-sm text-text-muted m-0">{mediaDict?.pageDescription || ""}</p>
          </div>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptString()}
          className="hidden"
          onChange={state.handleFileChange}
        />

        {/* ── Search & Filter Bar ─────────────────────────────────── */}
        <div className="px-5 pt-4 pb-0 flex-shrink-0">
          <div className="bg-surface-card border border-border-default rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <Input
                id="media-picker-search"
                icon={Search}
                value={state.searchQuery}
                onChange={(e) => state.handleSearchChange(e.target.value)}
                placeholder={pickerDict?.searchPlaceholder || "Search media..."}
                className="h-9 rounded-lg text-sm w-full"
              />
            </div>

            <Button
              size="sm"
              onClick={state.handleUploadNewClick}
              disabled={isUploading}
              className="h-9 gap-1.5 shrink-0"
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : getUploadIcon()}
              {isUploading ? (mediaDict?.uploadModal?.title || "Uploading...") : (pickerDict?.uploadNew || "Upload New")}
            </Button>

            {filterTabs.length > 1 && (
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
            )}
          </div>
        </div>

        {/* ── Content Area ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5">
          {state.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-surface-card border border-border-default rounded-xl overflow-hidden flex flex-col animate-pulse">
                  <div className="aspect-video bg-surface-subtle" />
                  <div className="p-3 flex flex-col gap-1.5">
                    <div className="h-3 w-3/4 bg-surface-subtle rounded" />
                    <div className="h-2.5 w-1/2 bg-surface-subtle rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : state.mediaItems.length === 0 ? (
            <div className="bg-surface-card border border-border-default rounded-xl flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-surface-subtle flex items-center justify-center mb-3">
                <Search size={22} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted m-0">{pickerDict?.emptyState || "No media found."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {state.mediaItems.map((item) => {
                const isSelected = state.selectedId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => state.setSelectedId(item.id)}
                    className={`bg-surface-card border rounded-xl overflow-hidden flex flex-col transition-all duration-200 cursor-pointer group ${
                      isSelected
                        ? "border-primary shadow-md ring-1 ring-primary"
                        : "border-border-default hover:shadow-md hover:border-border-subtle"
                    }`}
                  >
                    <div className="aspect-video bg-surface-subtle relative flex items-center justify-center overflow-hidden border-b border-border-default">
                      {item.type === "image" ? (
                        <img
                          src={item.url}
                          alt={item.altText || item.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full relative group">
                          <video src={`${item.url}#t=0.1`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" muted playsInline preload="metadata" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                            <Video className="text-white drop-shadow-md" size={24} />
                          </div>
                        </div>
                      )}

                      <Badge variant="secondary" className="absolute top-2 start-2 font-mono text-[10px] lowercase shadow-sm">
                        {item.type}
                      </Badge>

                      {isSelected && (
                        <div className="absolute top-2 end-2 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm shadow-primary/30">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </div>

                    <div className={`p-3 flex flex-col gap-0.5 flex-1 transition-colors ${isSelected ? "bg-primary/5" : ""}`}>
                      <h3 className="text-xs font-semibold text-foreground truncate m-0 text-start" title={item.name} dir="ltr">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-text-muted truncate m-0">
                        {item.size}{isAdmin && item.createdAt && ` • ${formatDate(item.createdAt)}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer Actions ──────────────────────────────────────── */}
        <div className="px-5 pb-5 pt-3 border-t border-border-default flex justify-end gap-3 items-center flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-5 bg-background text-foreground border-border-default hover:bg-surface-subtle font-semibold"
          >
            {pickerDict?.cancel || "Cancel"}
          </Button>

          <Button
            onClick={state.handleSelectConfirm}
            disabled={!state.selectedId}
            className="h-9 px-6 font-semibold"
          >
            {pickerDict?.select || "Select"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}