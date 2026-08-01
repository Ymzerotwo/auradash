"use client";

import React from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useTheme } from '@/app/components/ThemeProvider';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Moon, Sun, Languages, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useForgotPasswordForm } from '@/lib/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import logoImg from '@/public/icon.png';

export default function ForgotPasswordPage() {
  const { t, dir, locale, setLocale } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const {
    step,
    email,
    setEmail,
    resendTimer,
    codeDigits,
    inputRefs,
    isCodeComplete,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    error,
    fieldErrors,
    isSuccess,
    isLoading,
    handleForgotPassword,
    handleResendCode,
    handleResetPassword,
    handleCodeChange,
    handleCodeKeyDown,
    handleCodePaste,
    strengthScore,
    getStrengthLabel,
    getStrengthColor,
  } = useForgotPasswordForm();

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'ar' : 'en');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-x-hidden py-24 px-4 sm:py-12">
      <div className="absolute top-4 sm:top-8 right-4 sm:right-8 rtl:right-auto rtl:left-4 sm:rtl:left-8 flex gap-2 sm:gap-3 z-20">
        <button 
          onClick={toggleTheme} 
          className="flex items-center gap-2 bg-surface-overlay backdrop-blur-[10px] border border-border-subtle text-text-subtle h-10 px-4 rounded-[20px] text-sm font-semibold cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:text-foreground hover:border-primary hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(20,57,226,0.15)]"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <button 
          onClick={toggleLanguage} 
          className="flex items-center gap-2 bg-surface-overlay backdrop-blur-[10px] border border-border-subtle text-text-subtle h-10 px-4 rounded-[20px] text-sm font-semibold cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:text-foreground hover:border-primary hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(20,57,226,0.15)]"
          aria-label="Toggle Language"
        >
          <Languages size={20} />
          <span className="font-[inherit]">{locale === 'en' ? t.topbar.arabic : t.topbar.english}</span>
        </button>
      </div>

      <div className="absolute rounded-full blur-[100px] z-0 opacity-50 animate-float w-[400px] h-[400px] bg-primary-600 -top-[100px] -left-[100px]"></div>
      <div className="absolute rounded-full blur-[100px] z-0 opacity-50 animate-float w-[300px] h-[300px] bg-accent-600 -bottom-[50px] -right-[50px] [animation-delay:-5s]"></div>
      
      <div className={`w-full max-w-[440px] bg-surface-overlay backdrop-blur-[20px] border rounded-[24px] p-6 sm:p-10 relative z-10 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${isSuccess ? 'border-[#10b981] shadow-[0_0_20px_rgba(16,185,129,0.3),0_0_60px_rgba(16,185,129,0.15)]' : 'border-border-subtle shadow-[0_0_1px_rgba(255,255,255,0.1),0_0_20px_rgba(0,0,0,0.4),0_0_60px_rgba(0,0,0,0.6)] [html[data-theme=light]_&]:bg-[rgba(255,255,255,0.85)] [html[data-theme=light]_&]:shadow-[0_0_1px_rgba(0,0,0,0.05),0_0_20px_rgba(0,0,0,0.04),0_0_60px_rgba(0,0,0,0.08)]'}`}>
        
        {isSuccess && (
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(16,185,129,0.05)] to-[rgba(16,185,129,0.15)] -z-10 animate-fade-in"></div>
        )}

        <div className="relative z-10">
          <div className="text-center mb-8">
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
            <h1 className="text-[28px] font-extrabold text-foreground m-0 mb-2 tracking-tight">{t.forgotpassword.forgot_password_title}</h1>
            <p className="text-[15px] text-muted-foreground m-0">
              {step === 'email' && !isSuccess ? t.forgotpassword.forgot_password_subtitle : 
               !isSuccess ? t.forgotpassword.recovery_email_sent : ''}
            </p>
          </div>

          <form onSubmit={step === 'email' ? handleForgotPassword : handleResetPassword} className="flex flex-col gap-5" noValidate>
            
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center text-center py-8 animate-fade-in">
                <div className="w-20 h-20 bg-[rgba(16,185,129,0.1)] rounded-full flex items-center justify-center mb-6 text-[#10b981]">
                  <CheckCircle2 size={40} className="animate-pop-in opacity-0 scale-50" />
                </div>
                <h2 className="text-[24px] font-bold text-[#10b981] m-0 mb-2">{t.forgotpassword.password_reset_success}</h2>
                <div className="mt-6 text-center">
                  <Link href="/login" className="inline-flex items-center justify-center gap-2 text-[14px] font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                    <ArrowLeft size={16} className={dir === 'rtl' ? 'rotate-180' : ''} />
                    <span>{t.forgotpassword.back_to_login}</span>
                  </Link>
                </div>
              </div>
            ) : step === 'email' ? (
              <>
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-[13px] font-semibold text-text-subtle">{t.forgotpassword.email_label}</label>
                  <Input 
                    type="email" 
                    id="email"
                    icon={Mail}
                    placeholder={t.forgotpassword.email_placeholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    error={fieldErrors.email}
                  />
                </div>

                <Button type="submit" className="w-full mt-2" disabled={isLoading || !email.trim()}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin" size={20} />
                      <span>{t.forgotpassword.sending_code}</span>
                    </div>
                  ) : (
                    <>
                      <span>{t.forgotpassword.send_code_button}</span>
                      <ArrowRight size={20} className={dir === 'rtl' ? 'rotate-180' : ''} />
                    </>
                  )}
                </Button>

                <div className="mt-6 text-center">
                  <Link href="/login" className="inline-flex items-center justify-center gap-2 text-[14px] font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                    <ArrowLeft size={16} className={dir === 'rtl' ? 'rotate-180' : ''} />
                    <span>{t.forgotpassword.back_to_login}</span>
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-5 animate-fade-in">
                {!isCodeComplete ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-semibold text-text-subtle">{t.forgotpassword.enter_code}</label>
                      <button 
                        type="button" 
                        onClick={handleResendCode}
                        disabled={resendTimer > 0 || isLoading}
                        className="text-[12px] font-semibold text-primary hover:text-primary-hover disabled:text-text-muted transition-colors cursor-pointer disabled:cursor-not-allowed bg-transparent border-none p-0 outline-none"
                      >
                        {resendTimer > 0 ? `${t.forgotpassword.resend_in || 'Resend in'} ${resendTimer}s` : (t.forgotpassword.resend_code || 'Resend Code')}
                      </button>
                    </div>
                    <div className="flex justify-between gap-1 sm:gap-2 w-full" dir="ltr">
                      {codeDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => { inputRefs.current[index] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handleCodeKeyDown(index, e)}
                          onPaste={handleCodePaste}
                          disabled={isLoading}
                          className="w-10 h-12 sm:w-12 sm:h-14 px-0 text-center text-xl font-bold rounded-xl transition-all border border-input bg-background text-foreground focus-visible:border-primary focus-visible:shadow-[0_0_15px_rgba(79,70,229,0.25)] outline-none shadow-sm disabled:opacity-50"
                        />
                      ))}
                    </div>
                    {fieldErrors.code && <span className="text-[11px] text-destructive font-medium">{fieldErrors.code}</span>}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 p-4 bg-[rgba(16,185,129,0.1)] rounded-xl border border-[rgba(16,185,129,0.2)] text-[#10b981] animate-fade-in">
                    <CheckCircle2 size={20} />
                    <span className="text-[14px] font-medium">{t.forgotpassword.code_verified || 'Code verified successfully'}</span>
                  </div>
                )}

                <div className={`flex flex-col gap-5 transition-all duration-500 overflow-hidden ${isCodeComplete ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0'}`}>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="newPassword" className="text-[13px] font-semibold text-text-subtle">{t.forgotpassword.new_password}</label>
                    <Input 
                      type={showNewPassword ? "text" : "password"} 
                      id="newPassword"
                      icon={Lock}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      error={fieldErrors.newPassword}
                      endAdornment={
                        <button 
                          type="button" 
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="text-text-muted hover:text-primary transition-colors cursor-pointer outline-none bg-transparent border-none p-0"
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                    {fieldErrors.newPassword && <span className="text-[11px] text-destructive font-medium">{fieldErrors.newPassword}</span>}

                    {/* Password Strength Indicator */}
                    {newPassword.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1 animate-[fadeIn_0.3s_ease-out]">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-text-subtle">{t.forgotpassword.password_strength}</span>
                          <span className={`text-[11px] font-bold ${getStrengthColor().replace('bg-', 'text-')}`}>
                            {getStrengthLabel()}
                          </span>
                        </div>
                        <div className="flex gap-1 h-1 w-full rounded-full overflow-hidden bg-surface-base">
                          <div className={`h-full transition-all duration-300 ${getStrengthColor()}`} style={{ width: `${(strengthScore / 5) * 100}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="confirmPassword" className="text-[13px] font-semibold text-text-subtle">{t.forgotpassword.confirm_password}</label>
                    <Input 
                      type={showConfirmPassword ? "text" : "password"} 
                      id="confirmPassword"
                      icon={Lock}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      error={fieldErrors.confirmPassword}
                      endAdornment={
                        <button 
                          type="button" 
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-text-muted hover:text-primary transition-colors cursor-pointer outline-none bg-transparent border-none p-0"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                  </div>

                  <div className="text-[11px] leading-relaxed text-text-muted bg-surface-base p-3 rounded-lg border border-border-subtle">
                    {t.forgotpassword.password_tips}
                  </div>

                  <Button type="submit" className="w-full mt-2" disabled={isLoading || !newPassword.trim() || !confirmPassword.trim() || codeDigits.some(d => !d.trim())}>
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin" size={20} />
                        <span>{t.forgotpassword.sending_code}</span>
                      </div>
                    ) : (
                      <>
                        <span>{t.forgotpassword.reset_password_button}</span>
                        <ArrowRight size={20} className={dir === 'rtl' ? 'rotate-180' : ''} />
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-4 text-center">
                  <Link href="/login" className="inline-flex items-center justify-center gap-2 text-[14px] font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-none outline-none p-0">
                    <ArrowLeft size={16} className={dir === 'rtl' ? 'rotate-180' : ''} />
                    <span>{t.forgotpassword.back_to_login}</span>
                  </Link>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>  
  );
}
