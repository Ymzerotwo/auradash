"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function NotFound() {
  const { t, locale } = useTranslation();
  const isAr = locale === "ar";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface-base p-6 text-center">
      <div className="flex flex-col items-center max-w-[440px]">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[rgba(33,73,255,0.1)] text-primary mb-6 shadow-[0_0_40px_rgba(33,73,255,0.15)] [html[data-theme=light]_&]:bg-[rgba(33,73,255,0.05)]">
          <SearchX size={40} strokeWidth={1.5} />
        </div>
        
        <h1 className="text-[80px] font-extrabold leading-none m-0 bg-gradient-to-br from-primary-300 to-accent bg-clip-text text-transparent tracking-tighter">404</h1>
        <h2 className="text-2xl font-bold text-foreground mt-2 mb-4 tracking-tight">
          {t.common?.page_state?.not_found_title || "Page Not Found"}
        </h2>
        
        <p className="text-[15px] text-text-muted leading-relaxed mb-8 text-center">
          {t.common?.page_state?.not_found_desc || "The page you are looking for doesn't exist, has been moved, or you don't have permission to access it."}
        </p>
        
        <Link href="/" className="inline-flex items-center justify-center gap-2 px-6 h-11 rounded-md bg-primary text-white text-sm font-semibold transition-all duration-200 ease-in-out shadow-primary hover:bg-primary-600 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(20,57,226,0.3)]">
          {isAr ? <ArrowLeft size={16} className="rotate-180" /> : <ArrowLeft size={16} />}
          {t.common?.page_state?.return_to_dashboard || "Return to Dashboard"}
        </Link>
      </div>
    </div>
  );
}
