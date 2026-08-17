'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('sb_theme') as Theme | null;
    const sys: Theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    applyTheme(stored ?? sys);
  }, []);

  function applyTheme(t: Theme) {
    setTheme(t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  }

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('sb_theme', next);
    applyTheme(next);
  }

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
