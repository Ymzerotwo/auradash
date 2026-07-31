"use client";

import React, { useSyncExternalStore } from "react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const mounted = useSyncExternalStore(
    () => () => {}, 
    () => true, 
    () => false
  );

  const isDark = theme === "dark";

  return (
    <button
      id="theme-toggle-button"
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative inline-flex items-center justify-center w-9 h-9 rounded-md border border-border-default bg-surface-raised cursor-pointer overflow-hidden transition-all duration-300 outline-none text-text-default hover:border-border-strong hover:bg-surface-overlay",
        isDark 
          ? "hover:shadow-[0_0_20px_rgba(33,73,255,0.15)]" 
          : "hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]",
        !mounted && "opacity-0"
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "absolute w-[15px] h-[15px] transition-all duration-500 ease-out text-[#f59e0b]",
          isDark 
            ? "rotate-0 scale-100 opacity-100" 
            : "rotate-[-90deg] scale-0 opacity-0"
        )}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
 
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "absolute w-[15px] h-[15px] transition-all duration-500 ease-out text-[#a7b1ff]",
          !isDark 
            ? "rotate-0 scale-100 opacity-100" 
            : "rotate-[90deg] scale-0 opacity-0"
        )}
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
