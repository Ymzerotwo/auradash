"use client";

import React, { createContext, useContext } from "react";

interface LayoutContextValue {
  initialSidebarCollapsed: boolean;
}

const LayoutContext = createContext<LayoutContextValue>({
  initialSidebarCollapsed: false,
});

export function useLayoutContext() {
  return useContext(LayoutContext);
}

export function LayoutProvider({
  initialSidebarCollapsed,
  children,
}: {
  initialSidebarCollapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <LayoutContext.Provider value={{ initialSidebarCollapsed }}>
      {children}
    </LayoutContext.Provider>
  );
}
