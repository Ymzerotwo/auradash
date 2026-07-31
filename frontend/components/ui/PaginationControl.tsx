"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { localizeNumber } from "@/lib/utils";

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationControl({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationControlProps) {
  const { t, dir, locale } = useTranslation();

  if (totalPages <= 1) return null;

  const showingText = t.common?.pagination?.showing_page
    ? t.common.pagination.showing_page
        .replace("{page}", localizeNumber(String(Math.min(currentPage, totalPages)), locale))
        .replace("{totalPages}", localizeNumber(String(totalPages), locale))
    : `Page ${localizeNumber(Math.min(currentPage, totalPages), locale)} of ${localizeNumber(totalPages, locale)}`;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 bg-surface-card border border-border-default rounded-xl px-4 py-2 ${className}`}>
      <p className="text-xs text-text-muted m-0 whitespace-nowrap">
        {showingText}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="xs"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          {dir === "rtl" ? <ChevronRight size={14} className="ml-1" /> : <ChevronLeft size={14} className="mr-1" />}
          {t.common?.pagination?.previous || "Previous"}
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          {t.common?.pagination?.next || "Next"}
          {dir === "rtl" ? <ChevronLeft size={14} className="mr-1" /> : <ChevronRight size={14} className="ml-1" />}
        </Button>
      </div>
    </div>
  );
}
