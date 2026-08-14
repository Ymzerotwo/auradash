/* eslint-disable @next/next/no-img-element */
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Video, CheckCircle2, UploadCloud, Loader2, Image as ImageIcon, X, Play } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useMediaPickerState, MediaPickerItem } from "@/lib/hooks/useMedia";
import { useAuthStore } from "@/lib/stores/auth.store";

export type MediaType = "image" | "video" | "all";

function PickerVideoPreview({ url }: { url: string }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const handleMouseEnter = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0.1;
    }
  };

  return (
    <div
      className="w-full h-full relative flex items-center justify-center bg-surface-subtle overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video 
        ref={videoRef}
        src={`${url}#t=0.1`} 
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
        muted 
        playsInline 
        preload="metadata" 
        loop
      />
      <div 
        className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200 pointer-events-none ${
          isPlaying ? "opacity-0" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center shadow-lg">
          <Play size={14} className="fill-white translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: MediaType;
  folder?: string;
  onSelect: (media: MediaPickerItem) => void;
}

export function MediaPickerDialog({ open, onOpenChange, type = "all", folder, onSelect }: MediaPickerDialogProps) {
  const { t, locale, dir } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const m = t.media;
  const pickerDict = m.picker;

  const state = useMediaPickerState({ type, folder, onSelect, onOpenChange });

  // ─── Filter Tabs ───────────────────────────────────────────────
  const filterTabs: { label: string; value: "all" | "image" | "video" }[] = (() => {
    if (type !== "all") {
      return [
        { label: type === "image" ? pickerDict.image : pickerDict.video, value: type },
      ];
    }
    return [
      { label: m.search.filterAll, value: "all" },
      { label: m.search.filterImages, value: "image" },
      { label: m.search.filterVideos, value: "video" },
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

  const isUploading = state.isUploading;
  const { fileInputRef } = state;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[840px] w-[calc(100vw-2rem)] !max-w-[840px] bg-surface-card border-border-default text-foreground p-0 overflow-hidden flex flex-col h-[85vh] sm:h-[620px] !rounded-2xl"
        dir={dir}
        showCloseButton={false}
      >
        {/* ── Header Area ────────────────────────────────────────── */}
        <DialogHeader className="relative px-5 pt-5 pb-0 flex-shrink-0">
          <DialogClose
            render={
              <button 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-foreground hover:bg-surface-subtle transition-colors cursor-pointer absolute top-4 end-4"
                aria-label={pickerDict.cancel}
              >
                <X size={16} />
              </button>
            }
          />

          <div className="flex flex-col gap-1 pe-10">
            <DialogTitle className="text-lg sm:text-xl font-bold text-foreground m-0 leading-tight">
              {pickerDict.title}
            </DialogTitle>
            <p className="text-xs sm:text-sm text-text-muted m-0">{m.pageDescription}</p>
          </div>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptString()}
          multiple
          className="hidden"
          onChange={state.handleFileChange}
        />

        {/* ── Search & Filter Bar ─────────────────────────────────── */}
        <div className="px-5 pt-4 pb-0 flex-shrink-0">
          <div className="bg-surface-card border border-border-default rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex-1">
              <Input
                id="media-picker-search"
                icon={Search}
                value={state.searchQuery}
                onChange={(e) => state.handleSearchChange(e.target.value)}
                placeholder={pickerDict.searchPlaceholder}
                className="h-9 rounded-lg text-sm w-full"
              />
            </div>

            <Button
              size="sm"
              onClick={state.handleUploadNewClick}
              disabled={isUploading}
              className="h-9 gap-1.5 shrink-0"
            >
              {isUploading ? <Loader2 size={15} className="animate-spin" /> : getUploadIcon()}
              <span>{isUploading ? m.uploadModal.title : pickerDict.uploadNew}</span>
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
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5 scrollbar-thin">
          {state.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
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
              <p className="text-sm text-text-muted m-0">{pickerDict.emptyState}</p>
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
                          loading="lazy"
                        />
                      ) : (
                        <PickerVideoPreview url={item.url} />
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
            className="h-9 px-5 bg-background text-foreground border-border-default hover:bg-surface-subtle font-semibold cursor-pointer"
          >
            {pickerDict.cancel}
          </Button>

          <Button
            onClick={state.handleSelectConfirm}
            disabled={!state.selectedId}
            className="h-9 px-6 font-semibold cursor-pointer"
          >
            {pickerDict.select}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}