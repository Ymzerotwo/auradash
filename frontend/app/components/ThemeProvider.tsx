"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: (event?: React.MouseEvent | MouseEvent) => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "auradash-theme";

/**
 * Inline script to prevent FOUC (Flash of Unstyled Content).
 * This runs BEFORE React hydration so the correct theme is applied immediately.
 */
export function ThemeScript() {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('${STORAGE_KEY}');
        var theme = stored === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
      } catch(e) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}

let listeners: Array<() => void> = [];

function emitThemeChange() {
  listeners.forEach((l) => l());
}

function subscribeTheme(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function getThemeSnapshot(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

function getThemeServerSnapshot(): Theme {
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);

  const setTheme = useCallback((newTheme: Theme) => {
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    emitThemeChange();
  }, []);

  const toggleTheme = useCallback((event?: React.MouseEvent | MouseEvent) => {
    const current = getThemeSnapshot();
    const nextTheme = current === "dark" ? "light" : "dark";

    const updateDOM = () => {
      document.documentElement.setAttribute("data-theme", nextTheme);
      localStorage.setItem(STORAGE_KEY, nextTheme);
      emitThemeChange();
    };

    // If view transitions are not supported or no click event, fallback
    if (!event || typeof (document as any).startViewTransition !== 'function') {
      document.documentElement.classList.add("theme-transitioning");
      updateDOM();
      setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
      }, 450);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = (document as any).startViewTransition(updateDOM);

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];
      document.documentElement.animate(
        {
          clipPath: nextTheme === "light" ? clipPath : [...clipPath].reverse(),
        },
        {
          duration: 400,
          easing: "ease-out",
          fill: "forwards",
          pseudoElement: nextTheme === "light" 
            ? "::view-transition-new(root)" 
            : "::view-transition-old(root)",
        }
      );
    });
  }, []);

  const value: ThemeContextValue = {
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme and toggle function.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
