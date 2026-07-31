"use client";

import React, { createContext, useContext, useEffect } from 'react';
import type { Dictionary, Locale } from './dictionaries';

type LanguageContextType = {
  t: Dictionary;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: 'ltr' | 'rtl';
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({
  children,
  initialLocale,
  initialDictionary,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialDictionary: Dictionary;
}) => {
  const dir = initialLocale === 'ar' ? 'rtl' : 'ltr';

  // Apply direction and language to the HTML tag on the client side (for dynamic updates if needed)
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = initialLocale;
  }, [dir, initialLocale]);

  const setLocale = (newLocale: Locale | string) => {
    // Security Hardening: Validate locale input to prevent cookie injection or path manipulation
    const validatedLocale = newLocale === 'ar' || newLocale === 'en' ? newLocale : 'en';
    
    // Save preference with secure flags (SameSite=Lax; Secure) matching project standards
    document.cookie = `NEXT_LOCALE=${validatedLocale}; path=/; max-age=31536000; SameSite=Lax; Secure`; // 1 year expiry
    // Reload the page to let Server Components fetch the new dictionary and re-render
    window.location.reload();
  };

  return (
    <LanguageContext.Provider value={{ t: initialDictionary, locale: initialLocale, setLocale, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Prevent SSR crashes during dev server hot-reload glitches where context might temporarily drop.
    // Next.js will gracefully fall back to client rendering, where the context will be fully available.
    if (typeof window === 'undefined') {
      return {
        t: {} as Dictionary,
        locale: 'en' as Locale,
        setLocale: () => {},
        dir: 'ltr' as 'ltr' | 'rtl'
      };
    }
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
