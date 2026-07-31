"use client";

import React from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useTheme } from '@/app/components/ThemeProvider';
import { Lock, Loader2, AlertCircle, CheckCircle2, ArrowRight, Moon, Sun, Languages, User } from 'lucide-react';
import Link from 'next/link';
import { useLoginForm } from '@/lib/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import logoImg from '@/app/icon.png';

export default function LoginPage() {
  const { t, dir, locale, setLocale } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const {
    username,
    setUsername,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    error,
    fieldErrors,
    isSuccess,
    isLoading,
    handleLogin,
  } = useLoginForm();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-x-hidden py-12 px-4 sm:py-12">
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

      <div className="absolute rounded-full blur-[100px] z-0 opacity-50 animate-float w-[400px] h-[400px] bg-primary-600 -top-[100px] -left-[100px]"></div>
      <div className="absolute rounded-full blur-[100px] z-0 opacity-50 animate-float w-[300px] h-[300px] bg-accent-600 -bottom-[50px] -right-[50px] [animation-delay:-5s]"></div>

      <div className={`w-full max-w-[440px] bg-surface-overlay backdrop-blur-[20px] border rounded-[24px] p-6 sm:p-10 relative z-10 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${isSuccess ? 'border-[#10b981] shadow-[0_0_20px_rgba(16,185,129,0.3),0_0_60px_rgba(16,185,129,0.15)]' : 'border-border-subtle shadow-[0_0_1px_rgba(255,255,255,0.1),0_0_20px_rgba(0,0,0,0.4),0_0_60px_rgba(0,0,0,0.6)] [html[data-theme=light]_&]:bg-[rgba(255,255,255,0.85)] [html[data-theme=light]_&]:shadow-[0_0_1px_rgba(0,0,0,0.05),0_0_20px_rgba(0,0,0,0.04),0_0_60px_rgba(0,0,0,0.08)]'}`}>

        {isSuccess && (
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(16,185,129,0.05)] to-[rgba(16,185,129,0.15)] -z-10 animate-fade-in"></div>
        )}

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

        {!isSuccess && (
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-extrabold text-foreground m-0 mb-2">{t.login.title}</h1>
          </div>
        )}

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center text-center py-8 animate-fade-in">
            <div className="w-20 h-20 bg-[rgba(16,185,129,0.1)] rounded-full flex items-center justify-center mb-6 text-[#10b981]">
              <CheckCircle2 size={56} className="animate-pop-in opacity-0 scale-50" />
            </div>
            <h2 className="text-[24px] font-bold text-[#10b981] m-0 mb-2">{t.login.success_message}</h2>
            <p className="text-[15px] text-muted-foreground m-0">{t.login.redirect_message}</p>
          </div>
        ) : (
          <form className="flex flex-col gap-5" onSubmit={handleLogin} noValidate>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-text-subtle">{t.login.username_label}</label>
              <Input
                type="text"
                icon={User}
                placeholder={t.login.username_placeholder}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={fieldErrors.username}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-text-subtle">{t.login.password_label}</label>
              <Input
                type="password"
                icon={Lock}
                placeholder={t.login.password_placeholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
              />
            </div>

            <div className="flex flex-col min-[360px]:flex-row gap-3 min-[360px]:items-center min-[360px]:justify-between mt-1">
              <label className="flex items-center gap-2 text-[13px] text-text-subtle cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  className="accent-primary w-4 h-4 rounded" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>{t.login.remember_me}</span>
              </label>
              <Link href="/forgot-password" className="text-[13px] font-semibold text-primary no-underline hover:underline self-start min-[360px]:self-auto">{t.login.forgot_password}</Link>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={isLoading || !username.trim() || !password.trim()}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  <span>{t.login.signing_in}</span>
                </div>
              ) : (
                <>
                  <span>{t.login.submit_button}</span>
                  <ArrowRight size={18} className={dir === 'rtl' ? 'rotate-180' : ''} />
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
