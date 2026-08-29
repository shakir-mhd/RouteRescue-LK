'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('routerescue_theme') as Theme | null;
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored);
        applyTheme(stored);
      } else {
        // Default to dark mode for RouteRescue LK
        applyTheme('dark');
      }
    } catch (e) {
      applyTheme('dark');
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'routerescue_theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue);
        applyTheme(e.newValue);
      }
    };

    const handleCustomThemeChange = (e: any) => {
      const newTheme = e.detail?.theme;
      if (newTheme === 'light' || newTheme === 'dark') {
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('theme-change' as any, handleCustomThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('theme-change' as any, handleCustomThemeChange);
    };
  }, []);

  const applyTheme = (t: Theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (t === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    try {
      localStorage.setItem('routerescue_theme', newTheme);
      window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: newTheme } }));
    } catch (e) {}
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'dark' as Theme,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}
