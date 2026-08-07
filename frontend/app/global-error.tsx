'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" dir="ltr" className="scrollbar-none">
      <body className="h-[100dvh] overflow-hidden bg-surface-base antialiased text-foreground">
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-surface-base p-6 text-center">
          <div className="flex flex-col items-center max-w-[480px]">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[rgba(239,68,68,0.1)] text-destructive mb-6 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
              <AlertTriangle size={40} strokeWidth={1.5} />
            </div>
            
            <h1 className="text-[64px] font-extrabold leading-none m-0 bg-gradient-to-br from-destructive to-red-400 bg-clip-text text-transparent tracking-tighter">500</h1>
            
            <h2 className="text-2xl font-bold text-foreground mt-2 mb-3 tracking-tight">
              An unexpected error occurred
            </h2>
            
            <p className="text-[15px] text-text-muted leading-relaxed mb-6 text-center">
              An unexpected error occurred in the system. Please try again.
            </p>

            {error?.message && (
              <div className="w-full mb-6 p-3 rounded-lg bg-surface-subtle border border-border text-xs font-mono text-destructive break-words text-start dir-ltr max-h-32 overflow-y-auto">
                {error.message}
              </div>
            )}
            
            <Button
              onClick={() => reset()}
              variant="default"
              size="default"
            >
              <RotateCcw size={18} />
              Retry
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
