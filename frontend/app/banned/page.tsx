"use client";

import React from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useTheme } from '@/app/components/ThemeProvider';
import { ShieldAlert, ArrowLeft, Moon, Sun, Languages } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import logoImg from '@/app/icon.png';

export default function BannedPage() {
  const { t, dir, locale, setLocale } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-x-hidden py-12 px-4 sm:py-12">
      
      {/* Top Controls (Theme & Language Toggle) */}
      <div className="absolute top-4 sm:top-8 right-4 sm:right-8 rtl:right-auto rtl:left-4 sm:rtl:left-8 flex gap-2 sm:gap-3 z-20">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 bg-surface-overlay backdrop-blur-[10px] border border-border-subtle text-text-subtle h-10 px-4 rounded-[20px] text-sm font-semibold cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:text-foreground hover:border-primary hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(20,57,226,0.15)]"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-2 bg-surface-overlay backdrop-blur-[10px] border border-border-subtle text-text-subtle h-10 px-4 rounded-[20px] text-sm font-semibold cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:text-foreground hover:border-primary hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(20,57,226,0.15)]"
          aria-label="Toggle Language"
        >
          <Languages size={20} />
          <span className="font-[inherit]">{locale === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </div>

      {/* Decorative Blobs */}
      <div className="absolute rounded-full blur-[100px] z-0 opacity-50 animate-float w-[400px] h-[400px] bg-red-950/20 -top-[100px] -left-[100px]"></div>
      <div className="absolute rounded-full blur-[100px] z-0 opacity-50 animate-float w-[300px] h-[300px] bg-red-900/10 -bottom-[50px] -right-[50px] [animation-delay:-5s]"></div>

      {/* Main Container Card */}
      <div className="w-full max-w-[440px] bg-surface-overlay backdrop-blur-[20px] border border-border-subtle rounded-[24px] p-6 sm:p-10 relative z-10 shadow-[0_0_1px_rgba(255,255,255,0.1),0_0_20px_rgba(0,0,0,0.4),0_0_60px_rgba(0,0,0,0.6)] [html[data-theme=light]_&]:bg-[rgba(255,255,255,0.85)] [html[data-theme=light]_&]:shadow-[0_0_1px_rgba(0,0,0,0.05),0_0_20px_rgba(0,0,0,0.04),0_0_60px_rgba(0,0,0,0.08)]">
        
        {/* Logo and Brand */}
        <div className="flex items-center justify-center gap-3 mb-8" dir="ltr">
          <Image 
            src={logoImg} 
            alt="AuraDash Logo" 
            width={40} 
            height={40} 
            className="w-10 h-10 object-contain -translate-y-1"
          />
          <span className="text-2xl font-bold text-foreground tracking-tight">AuraDash</span>
        </div>

        {/* Content */}
        <div className="text-center flex flex-col items-center">
          {/* Banned Icon */}
          <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6 animate-pulse">
            <ShieldAlert size={48} />
          </div>

          <h1 className="text-2xl sm:text-[28px] font-extrabold text-foreground m-0 mb-3">
            {t.common.page_state.banned_title}
          </h1>
          
          <p className="text-[15px] leading-relaxed text-muted-foreground m-0 mb-8 max-w-[320px]">
            {t.common.page_state.banned_desc}
          </p>

          {/* Action Link */}
          <Link 
            href="/login" 
            className="w-full inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-12 px-6 rounded-xl text-sm font-semibold transition-all duration-200 border border-border"
          >
            <ArrowLeft size={18} className={dir === 'rtl' ? 'rotate-180' : ''} />
            <span>{t.common.page_state.back_to_login}</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
