import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Cairo } from "next/font/google";
import { ThemeProvider, ThemeScript } from "./components/ThemeProvider";
import { LayoutProvider } from "./components/LayoutProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";
import { cookies } from "next/headers";
import { getDictionary, Locale } from "@/lib/i18n/dictionaries";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { QueryProvider } from "@/lib/providers/QueryProvider";

export const runtime = 'edge';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AuraDash",
  description: "AuraDash",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value as Locale;
  const locale: Locale = localeCookie === "ar" || localeCookie === "en" ? localeCookie : "en";
  
  const sidebarCollapsedCookie = cookieStore.get("NEXT_SIDEBAR_COLLAPSED")?.value === "true";

  const dictionary = await getDictionary(locale);
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn(inter.variable, cairo.variable, jetbrainsMono.variable, "scrollbar-none")}
    >
      <head>
        <ThemeScript />
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="bingbot" content="noindex, nofollow" />
        <meta name="Google-Extended" content="noindex" />
        <meta name="Anthropic-AI" content="noindex" />
        <meta name="cohere-ai" content="noindex" />
        <meta name="facebookexternalhit" content="noindex, nofollow" />
        <meta name="ia_archiver" content="noindex, nofollow" />
        <meta name="GPTBot" content="noindex, nofollow" />
        <meta name="ChatGPT-User" content="noindex, nofollow" />
        <meta name="PerplexityBot" content="noindex, nofollow" />
        <meta name="ClaudeBot" content="noindex, nofollow" />
        <meta name="Applebot" content="noindex, nofollow" />
        <meta name="ByteSpider" content="noindex, nofollow" />
      </head>
      <body className="h-screen overflow-hidden bg-surface-base antialiased">
        <QueryProvider>
          <LanguageProvider initialLocale={locale} initialDictionary={dictionary}>
            <ThemeProvider>
              <LayoutProvider initialSidebarCollapsed={sidebarCollapsedCookie}>
                <TooltipProvider>
                  {children}
                  <Toaster position="bottom-right" richColors closeButton />
                </TooltipProvider>
              </LayoutProvider>
            </ThemeProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
