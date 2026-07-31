"use client";

import React from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
  variant = "danger",
}: ConfirmationModalProps) {
  const isDanger = variant === "danger";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[calc(100vw-2rem)] sm:w-full !max-w-[330px] p-0 overflow-hidden !rounded-2xl bg-surface-card border border-border-default/60 shadow-2xl"
        showCloseButton={false}
      >
        {/* ── Header Area ────────────────────────────────────── */}
        <div className="relative px-5 pt-5 pb-1 flex flex-col items-center text-center">
          <div className={cn(
            "absolute inset-x-0 top-0 h-[2px] opacity-80",
            isDanger ? "bg-gradient-to-r from-transparent via-danger to-transparent" :
            variant === "warning" ? "bg-gradient-to-r from-transparent via-amber-500 to-transparent" :
            "bg-gradient-to-r from-transparent via-primary to-transparent"
          )} />
          
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 shadow-sm transition-transform duration-300",
            isDanger ? "bg-danger/10 text-danger" : variant === "warning" ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
          )}>
            <AlertTriangle size={18} />
          </div>
          
          <DialogHeader className="flex flex-col items-center gap-1">
            <DialogTitle className="text-[15px] font-bold text-foreground tracking-tight leading-snug">
              {title}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-text-muted leading-relaxed max-w-[290px] whitespace-pre-line">
              {typeof description === 'string' ? (
                description.split(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.ymzerotwo\.com[^\s]*)/gi).map((part, i) => {
                  if (part.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.ymzerotwo\.com[^\s]*)/gi)) {
                    const href = part.startsWith("http") ? part : `https://${part}`;
                    return (
                      <a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:text-primary/80 font-medium transition-colors cursor-pointer dir-ltr inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {part}
                      </a>
                    );
                  }
                  return part;
                })
              ) : (
                description
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Footer / Actions ────────────────────────────────── */}
        <div className="px-5 pb-5 pt-3 grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full h-9 text-[13px] font-medium border-border-default/60 bg-surface-subtle/30 hover:bg-surface-subtle text-foreground transition-all cursor-pointer truncate"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "w-full h-9 text-[13px] font-semibold shadow-md transition-all gap-1.5 cursor-pointer truncate",
              isDanger 
                ? "bg-danger hover:bg-danger/90 shadow-danger/20 text-white" 
                : variant === "warning"
                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 text-white"
                : "bg-primary hover:bg-primary/90 shadow-primary/20 text-white"
            )}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
            <span className="truncate">{confirmLabel}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
