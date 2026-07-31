"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useApiKeysPageState } from "@/lib/hooks/useApiKeys";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PermissionGuard } from "@/components/layout/PermissionGuard";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Key, Plus, Trash2, ShieldAlert } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CreateApiKeyDialog, ApiKeySuccessDialog } from "./CreateApiKeyDialog";
import { CreateApiKeyResponse } from "@/lib/services/apikey.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { PaginationControl } from "@/components/ui/PaginationControl";

export default function ApiKeysPage() {
  const { t, locale } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const {
    page,
    setPage,
    keys,
    pagination,
    isLoading,
    isError,
    apiKeysError,
    keyToDelete,
    setKeyToDelete,
    handleDeleteConfirm,
    isDeletePending
  } = useApiKeysPageState();

  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);

  const isForbidden = (apiKeysError as { slug?: string; code?: number })?.slug === 'FORBIDDEN'
    || (apiKeysError as { code?: number })?.code === 403;

  if (isForbidden) {
    return (
      <DashboardLayout pageTitle={t.apikeys.title}>
        <PermissionDenied />
      </DashboardLayout>
    );
  }

  return (
    <PermissionGuard>
      <DashboardLayout pageTitle={t.apikeys.title}>
      <div className="flex flex-col gap-6 w-full">
        {/* ── Page Header ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground m-0 mb-1">{t.apikeys.title}</h2>
          </div>
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="hidden md:inline-flex w-full sm:w-auto self-start sm:self-auto">
            <Plus size={16} />
            {t.apikeys.new_api_key}
          </Button>
        </div>

        {/* ── Mobile Warning ───────────────────────────────────── */}
        <div className="md:hidden flex flex-col items-center justify-center p-8 bg-surface-subtle/30 border border-border-default rounded-xl text-center mt-2">
          <ShieldAlert className="w-10 h-10 text-text-muted mb-3 opacity-50" />
          <p className="text-sm font-medium text-text-muted m-0">
            {t.apikeys.mobile_warning}
          </p>
        </div>

        {/* ── Content Area ─────────────────────────────────────── */}
        <div className="hidden md:block">
          {isLoading ? (
            <ApiKeysTableSkeleton />
          ) : isError ? (
            <div className="bg-surface-card border border-border-default rounded-xl flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-destructive m-0">{t.apikeys.errors.fetch_failed}</p>
            </div>
          ) : !keys || keys.length === 0 ? (
            <div className="bg-surface-card border border-border-default rounded-xl flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
                <Key size={24} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted m-0">{t.apikeys.empty_state.description}</p>
            </div>
          ) : (
            <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto">
              <Table className="min-w-[1000px]" columnWidths={[20, 20, 25, 15, 12, 8]}>
                <TableHeader>
                  <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
                    <TableHead className="font-semibold">{t.apikeys.table.name}</TableHead>
                    <TableHead className="font-semibold">{t.apikeys.table.domain}</TableHead>
                    <TableHead className="font-semibold">{t.apikeys.table.key}</TableHead>
                    <TableHead className="font-semibold">{t.apikeys.table.created_by}</TableHead>
                    <TableHead className="font-semibold">{t.apikeys.table.created_at}</TableHead>
                    <TableHead className="text-end font-semibold">{t.apikeys.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key.id} className="hover:bg-transparent transition-colors">
                      <TableCell className="font-medium text-foreground truncate max-w-[200px]" title={key.name}>
                        {key.name}
                      </TableCell>
                      <TableCell className="text-text-muted font-mono text-xs truncate max-w-[200px]" title={key.domain}>
                        {key.domain}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-text-muted">
                        <div className="flex items-center gap-2">
                          <span dir="ltr" className="bg-surface-overlay border border-border-default px-2 py-1 rounded inline-block truncate max-w-[160px] font-mono text-xs text-start">
                            {key.short_key}...
                          </span>
                          {key.is_expired && (
                            <span className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide shrink-0">
                              {t.apikeys.table.expired}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground font-medium text-xs whitespace-nowrap truncate max-w-[150px]" title={key.created_by_name || undefined}>
                        {key.created_by_name || '-'}
                      </TableCell>
                      <TableCell className="text-foreground font-medium text-xs whitespace-nowrap">
                        {key.created_at ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }).format(new Date(key.created_at)) : '-'}
                      </TableCell>
                      <TableCell className="text-end">
                        <Tooltip>
                          <TooltipTrigger render={
                            <button
                              onClick={() => setKeyToDelete(key.id)}
                              className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-surface-subtle/50 border border-border-default/40 text-text-subtle hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          } />
                          <TooltipContent>{t.common?.delete}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

          {pagination && keys && (
            <PaginationControl 
              currentPage={pagination.page} 
              totalPages={pagination.totalPages} 
              onPageChange={setPage} 
            />
          )}

      <CreateApiKeyDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        onCreated={(key) => setCreatedKey(key)}
      />

      <ApiKeySuccessDialog
        createdKey={createdKey}
        onClose={() => setCreatedKey(null)}
      />

      <ConfirmationModal
        open={!!keyToDelete}
        onOpenChange={(v) => { if (!v) setKeyToDelete(null); }}
        title={t.apikeys.delete_dialog.title}
        description={
          keys?.find((k) => k.id === keyToDelete)?.type === 'test'
            ? t.apikeys.delete_dialog.warning_test
            : t.apikeys.delete_dialog.warning
        }
        onConfirm={() => handleDeleteConfirm()}
        confirmLabel={t.apikeys.delete_dialog.confirm}
        cancelLabel={t.apikeys.delete_dialog.cancel}
        isLoading={isDeletePending}
        variant="danger"
      />

      </div>
    </DashboardLayout>
    </PermissionGuard>
  );
}

function ApiKeysTableSkeleton() {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl overflow-x-auto">
      <Table className="min-w-[1000px]" columnWidths={[20, 20, 25, 15, 12, 8]}>
        <TableHeader>
          <TableRow className="bg-surface-subtle/50 hover:bg-surface-subtle/50">
            <TableHead><Skeleton className="h-4 w-16 rounded-md" /></TableHead>
            <TableHead><Skeleton className="h-4 w-14 rounded-md" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16 rounded-md" /></TableHead>
            <TableHead><Skeleton className="h-4 w-18 rounded-md" /></TableHead>
            <TableHead><Skeleton className="h-4 w-18 rounded-md" /></TableHead>
            <TableHead className="text-end"><Skeleton className="h-4 w-14 rounded-md inline-block" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i} className="hover:bg-transparent transition-colors">
              <TableCell>
                <Skeleton className="h-4 w-24 rounded-md" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12 rounded-md" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="bg-surface-overlay border border-border-default px-2 py-1 rounded inline-flex items-center">
                    <Skeleton className="h-3 w-32 rounded-sm" />
                  </div>
                  {i % 2 === 0 && (
                    <Skeleton className="h-5 w-14 rounded-full bg-destructive/10 shrink-0" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20 rounded-md" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24 rounded-md" />
              </TableCell>
              <TableCell className="text-end">
                <Skeleton className="h-8 w-8 rounded-md inline-block" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

