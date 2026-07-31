import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCreateApiKeyForm } from "@/lib/hooks/useApiKeys";
import { CreateApiKeyResponse } from "@/lib/services/apikey.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Copy, Check, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (key: CreateApiKeyResponse) => void;
}

export function CreateApiKeyDialog({ open, onOpenChange, onCreated }: CreateApiKeyDialogProps) {
  const { t, dir } = useTranslation();

  const {
    type,
    setType,
    name,
    setName,
    domain,
    setDomain,
    expiresInHours,
    setExpiresInHours,
    errors,
    onSubmit,
    handleClose,
    isPending
  } = useCreateApiKeyForm(onOpenChange, onCreated);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent 
        className="w-[calc(100vw-2rem)] sm:w-full !max-w-[440px] p-0 overflow-hidden !rounded-2xl bg-surface-card border border-border-default/60 shadow-2xl"
        showCloseButton={false} 
        dir={dir}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

          {/* Close Button */}
          <DialogClose
            render={
              <button className="dialog-close-btn">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            }
          />

          <DialogHeader className="gap-1 pe-8">
            <DialogTitle className="text-base font-bold text-foreground tracking-tight">
              {t.apikeys.create_dialog.title}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-text-muted leading-relaxed m-0">
              {t.apikeys.create_dialog.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div className="h-px bg-border-default/60" />

        <form onSubmit={onSubmit} className="flex flex-col">
          {/* ── Form Body ───────────────────────────────────────── */}
          <div className="px-6 py-5 flex flex-col gap-4.5">
            {/* Key Type Selector */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-text-subtle">
                {t.apikeys.create_dialog.type_label}
              </Label>
              <div className="grid grid-cols-2 gap-2 bg-surface-subtle/50 p-1 rounded-xl border border-border-default/60">
                <button
                  type="button"
                  onClick={() => setType('production')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all border-none cursor-pointer outline-none ${
                    type === 'production'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'bg-transparent text-text-muted hover:text-foreground'
                  }`}
                >
                  {t.apikeys.create_dialog.type_production}
                </button>
                <button
                  type="button"
                  onClick={() => setType('test')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all border-none cursor-pointer outline-none ${
                    type === 'test'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'bg-transparent text-text-muted hover:text-foreground'
                  }`}
                >
                  {t.apikeys.create_dialog.type_test}
                </button>
              </div>
            </div>

            {/* Key Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-text-subtle">
                {t.apikeys.create_dialog.name_label} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.apikeys.create_dialog.name_placeholder}
                className="h-9 rounded-xl text-[13px]"
                error={errors.name}
              />
            </div>
            
            {/* Conditional Allowed Domain (Production only) */}
            {type === 'production' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="domain" className="text-xs font-semibold text-text-subtle">
                  {t.apikeys.create_dialog.domain_label} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder={t.apikeys.create_dialog.domain_placeholder}
                  dir="ltr"
                  className="h-9 rounded-xl text-[13px] text-start"
                  error={errors.domain}
                />
              </div>
            )}

            {/* Conditional Expiration (Test only) */}
            {type === 'test' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expiresInHours" className="text-xs font-semibold text-text-subtle">
                  {t.apikeys.create_dialog.expires_label} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="expiresInHours"
                  type="number"
                  min={1}
                  max={24}
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(parseInt(e.target.value) || 24)}
                  className="h-9 rounded-xl text-[13px]"
                  error={errors.expiresInHours}
                />
              </div>
            )}
          </div>

          {/* ── Footer ────────────────────────────────────────── */}
          <div className="px-6 pb-5 pt-3 border-t border-border-default/60 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={handleClose} className="h-9 text-[13px] font-medium border-border-default/60 bg-surface-subtle/30 hover:bg-surface-subtle text-foreground cursor-pointer">
              {t.common.cancel}
            </Button>
            <Button 
              type="submit" 
              disabled={
                isPending || 
                !name.trim() || 
                (type === 'production' && !domain.trim())
              }
              className="h-9 text-[13px] font-semibold bg-primary hover:bg-primary/90 text-white cursor-pointer"
            >
              {isPending ? t.common.loading : t.apikeys.create_dialog.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ApiKeySuccessDialogProps {
  createdKey: CreateApiKeyResponse | null;
  onClose: () => void;
}

export function ApiKeySuccessDialog({ createdKey, onClose }: ApiKeySuccessDialogProps) {
  const { t, dir } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!createdKey) return null;

  const handleCopy = async () => {
    if (!createdKey.apiKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.apiKey);
      setCopied(true);
      toast.success(t.apikeys.success_dialog.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog open={!!createdKey} onOpenChange={() => {}}>
      <DialogContent 
        className="w-[calc(100vw-2rem)] sm:w-full !max-w-[360px] p-0 overflow-hidden !rounded-2xl bg-surface-card border border-border-default/60 shadow-2xl"
        showCloseButton={false}
        dir={dir}
      >
        <div className="relative px-5 pt-5 pb-1 flex flex-col items-center text-center">
          <div className="absolute inset-x-0 top-0 h-[2px] opacity-80 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
          
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 shadow-sm transition-transform duration-300 bg-emerald-500/10 text-emerald-500">
            <ShieldCheck size={20} />
          </div>
          
          <DialogHeader className="flex flex-col items-center gap-1">
            <DialogTitle className="text-[15px] font-bold text-foreground tracking-tight leading-snug">
              {t.apikeys.success_dialog.title}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-text-muted leading-relaxed max-w-[280px]">
              {t.apikeys.success_dialog.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 py-3 flex flex-col gap-3">
          <div className="bg-surface-subtle/60 border border-border-default/60 rounded-xl p-3 flex items-center justify-between gap-2.5">
            <code dir="ltr" className="text-xs font-mono text-foreground break-all select-all text-start">{createdKey.apiKey}</code>
            <Button 
              variant="outline" 
              size="icon-sm" 
              onClick={handleCopy}
              className="shrink-0 h-8 w-8 rounded-lg border-border-default/60 bg-background hover:bg-surface-subtle text-text-muted hover:text-foreground cursor-pointer"
            >
              {copied ? <Check className="text-emerald-500" size={14} /> : <Copy size={14} />}
            </Button>
          </div>
          
          <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl p-3 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="m-0 leading-relaxed font-medium">
              {t.apikeys.success_dialog.warning}
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 pt-2 flex items-center justify-center">
          <Button onClick={onClose} className="w-full h-9 text-[13px] font-semibold bg-primary hover:bg-primary/90 text-white cursor-pointer">
            {t.apikeys.success_dialog.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
