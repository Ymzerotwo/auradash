import React from 'react';
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PermissionDenied({ message }: { message?: string }) {
  const { t, locale } = useTranslation();
  const isAr = locale === "ar";

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-danger/10 text-danger rounded-full flex items-center justify-center mb-8 border-[6px] border-danger/5">
        <ShieldAlert size={48} strokeWidth={1.5} />
      </div>
      
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
        {t.common?.page_state?.access_denied_title || "Access Denied"}
      </h1>
      
      <p className="text-text-muted text-lg max-w-[500px] mb-8 leading-relaxed">
        {message || t.common?.page_state?.access_denied_desc || "You don't have the necessary permissions to view this page. If you believe this is a mistake, please contact your administrator."}
      </p>

      <div className="flex items-center justify-center gap-4">
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "gap-2 px-6 h-12 hover:bg-surface-subtle")}>
          {isAr ? <ArrowLeft size={18} className="rotate-180" /> : <ArrowLeft size={18} />}
          <span>{t.common?.page_state?.back_to_home || "Back to Home"}</span>
        </Link>
      </div>
    </div>
  );
}
