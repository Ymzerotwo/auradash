"use client";

import React, { useMemo, useState } from "react";
import { 
  UploadCloud, 
  CheckCircle2, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ImageIcon, 
  Video, 
  Loader2, 
  Clock, 
  AlertCircle,
  Pause,
  Play
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useUploadStore } from "@/lib/stores/upload.store";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

export function FloatingUploadProgress() {
  const { t, locale } = useTranslation();
  const m = t.media;

  const uploadQueue = useUploadStore((s) => s.uploadQueue);
  const isQueueExpanded = useUploadStore((s) => s.isQueueExpanded);
  const setIsQueueExpanded = useUploadStore((s) => s.setIsQueueExpanded);
  const isPaused = useUploadStore((s) => s.isPaused);
  const togglePause = useUploadStore((s) => s.togglePause);
  const cancelUploadItem = useUploadStore((s) => s.cancelUploadItem);
  const clearUploadQueue = useUploadStore((s) => s.clearUploadQueue);

  // Modal target: { type: 'single', id: string } or { type: 'all' }
  const [cancelTarget, setCancelTarget] = useState<{ type: "single" | "all"; id?: string } | null>(null);

  const isUploading = useMemo(() => {
    return uploadQueue.some((i) => i.status === "uploading" || i.status === "pending" || i.status === "paused");
  }, [uploadQueue]);

  const { overallProgress, isAllCompleted } = useMemo(() => {
    if (uploadQueue.length === 0) return { overallProgress: 0, isAllCompleted: false };
    const totalBytes = uploadQueue.reduce((acc, i) => acc + i.size, 0);
    const loadedBytes = uploadQueue.reduce((acc, i) => {
      if (i.status === "completed") return acc + i.size;
      return acc + (i.loaded || 0);
    }, 0);
    const allCompleted = uploadQueue.every((i) => i.status === "completed");
    const progress = totalBytes > 0 
      ? (allCompleted ? 100 : Math.min(99, Math.round((loadedBytes / totalBytes) * 100)))
      : 0;
    return { overallProgress: progress, isAllCompleted: allCompleted };
  }, [uploadQueue]);

  if (uploadQueue.length === 0) return null;

  const handleConfirmCancel = () => {
    if (!cancelTarget) return;
    if (cancelTarget.type === "all") {
      clearUploadQueue();
    } else if (cancelTarget.id) {
      cancelUploadItem(cancelTarget.id);
    }
    setCancelTarget(null);
  };

  return (
    <>
      <div 
        className="fixed bottom-5 end-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[380px] bg-surface-card/95 backdrop-blur-md border border-border-default shadow-xl rounded-xl p-3 flex flex-col gap-2 transition-all duration-200 animate-in slide-in-from-bottom-3 fade-in"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        {/* Row 1: File Icon, Name/Count, Percentage/Status, and Header Controls */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isAllCompleted 
                ? "bg-emerald-500/10 text-emerald-500" 
                : isPaused
                ? "bg-amber-500/10 text-amber-500"
                : "bg-primary/10 text-primary"
            }`}>
              {isAllCompleted ? (
                <CheckCircle2 size={15} />
              ) : isPaused ? (
                <Pause size={15} />
              ) : (
                <UploadCloud size={15} className="animate-pulse" />
              )}
            </div>
            
            <span className="text-xs font-semibold text-foreground truncate max-w-[170px] sm:max-w-[190px]" dir="ltr">
              {uploadQueue.length === 1 
                ? uploadQueue[0].name 
                : m.uploadProgress.uploadingMultiple.replace("{count}", String(uploadQueue.length))
              }
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isAllCompleted ? (
              <span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
                <CheckCircle2 size={13} />
                <span>{m.uploadProgress.done}</span>
              </span>
            ) : isPaused ? (
              <span className="text-xs font-medium text-amber-500 font-mono">
                {m.uploadProgress.paused}
              </span>
            ) : (
              <span className="text-xs font-mono font-bold text-primary">
                {overallProgress}%
              </span>
            )}

            {/* Pause / Resume Button */}
            {!isAllCompleted && (
              <button
                onClick={togglePause}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-subtle text-text-muted hover:text-foreground transition-colors cursor-pointer"
                title={isPaused ? m.uploadProgress.resumeUpload : m.uploadProgress.pauseUpload}
              >
                {isPaused ? <Play size={13} className="text-primary fill-primary" /> : <Pause size={13} />}
              </button>
            )}

            {uploadQueue.length > 1 && (
              <button
                onClick={() => setIsQueueExpanded(!isQueueExpanded)}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-subtle text-text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                {isQueueExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            )}

            {/* Header Cancel/Close Button */}
            <button
              onClick={() => {
                if (isAllCompleted) {
                  clearUploadQueue();
                } else if (uploadQueue.length === 1) {
                  setCancelTarget({ type: "single", id: uploadQueue[0].id });
                } else {
                  setCancelTarget({ type: "all" });
                }
              }}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-destructive/10 text-text-muted hover:text-destructive transition-colors cursor-pointer"
              title={m.uploadProgress.cancelUpload}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Row 2: Single Master Progress Bar */}
        <div className="w-full bg-surface-subtle rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-200 ${
              isAllCompleted ? "bg-emerald-500" : isPaused ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Multi-File List with Individual Cancel Buttons */}
        {uploadQueue.length > 1 && isQueueExpanded && (
          <div className="max-h-44 overflow-y-auto flex flex-col gap-1.5 pt-1.5 border-t border-border-default/40 divide-y divide-border-default/20 scrollbar-thin">
            {uploadQueue.map((item) => (
              <div key={item.id} className="pt-1.5 first:pt-0 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-text-muted text-[10px]">
                      {item.type.startsWith("video/") ? <Video size={12} /> : <ImageIcon size={12} />}
                    </div>
                    <span className="text-xs text-foreground font-medium truncate max-w-[170px] sm:max-w-[200px]" title={item.name} dir="ltr">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === "completed" && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                        <CheckCircle2 size={12} />
                        <span className="text-[10px]">100%</span>
                      </span>
                    )}
                    {item.status === "paused" && (
                      <span className="text-[10px] text-amber-500 font-mono font-medium">
                        {m.uploadProgress.paused}
                      </span>
                    )}
                    {item.status === "uploading" && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-primary">
                        <Loader2 size={11} className="animate-spin" />
                        <span>{item.progress}%</span>
                      </span>
                    )}
                    {item.status === "pending" && (
                      <span className="text-[10px] text-text-muted font-mono flex items-center gap-1">
                        <Clock size={11} />
                        <span>{m.uploadProgress.waiting}</span>
                      </span>
                    )}
                    {item.status === "error" && (
                      <span className="text-[10px] text-destructive font-medium flex items-center gap-1">
                        <AlertCircle size={11} />
                        <span>{item.error || "Failed"}</span>
                      </span>
                    )}

                    {/* Individual Cancel Button */}
                    <button
                      onClick={() => {
                        if (item.status === "completed") {
                          cancelUploadItem(item.id);
                        } else {
                          setCancelTarget({ type: "single", id: item.id });
                        }
                      }}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 text-text-muted hover:text-destructive transition-colors cursor-pointer"
                      title={m.uploadProgress.cancelUpload}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {/* Micro-bar for active or paused upload */}
                {(item.status === "uploading" || item.status === "paused") && (
                  <div className="w-full bg-surface-subtle rounded-full h-1 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-150 ${
                        item.status === "paused" ? "bg-amber-500" : "bg-primary"
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Confirmation Modal for Cancelling Uploads ───────────────────────────── */}
      <ConfirmationModal
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title={cancelTarget?.type === "all" ? m.uploadProgress.cancelAllTitle : m.uploadProgress.cancelTitle}
        description={cancelTarget?.type === "all" ? m.uploadProgress.cancelAllDescription : m.uploadProgress.cancelDescription}
        onConfirm={handleConfirmCancel}
        confirmLabel={m.uploadProgress.confirmCancel}
        cancelLabel={m.uploadProgress.keepUploading}
        variant="danger"
      />
    </>
  );
}

