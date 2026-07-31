'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';

/**
 * React Query provider — wraps the entire client-side tree.
 * A new QueryClient is created per component mount to avoid sharing
 * state between SSR requests (Next.js best practice).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,          // 30s — data stays fresh
            refetchOnWindowFocus: false, // avoid surprise refetches
            retry: 1,                    // single retry on failure
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}
