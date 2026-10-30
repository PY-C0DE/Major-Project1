/**
 * Theme Context
 * Manages Dark Mode and Light Mode switching with localStorage persistence
 * and class attribute synchronization on document.documentElement.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('alphaquant_theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    // Pleasant Light Mode default as requested
    return 'light';
  });

  const applyThemeClasses = (targetTheme: Theme) => {
    const root = document.documentElement;
    if (targetTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('alphaquant_theme', targetTheme);
  };

  useEffect(() => {
    applyThemeClasses(theme);
  }, []);

  const transitionTheme = (nextTheme: Theme) => {
    if (nextTheme === theme) return;

    const root = document.documentElement;

    // 1. Native View Transitions API for GPU-accelerated global viewport cross-fade
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      root.classList.add('theme-transitioning');
      try {
        const transition = (document as any).startViewTransition(() => {
          applyThemeClasses(nextTheme);
          setThemeState(nextTheme);
        });
        transition.finished.finally(() => {
          root.classList.remove('theme-transitioning');
        });
      } catch {
        applyThemeClasses(nextTheme);
        setThemeState(nextTheme);
        setTimeout(() => {
          root.classList.remove('theme-transitioning');
        }, 420);
      }
    } else {
      // 2. CSS-based smooth cross-fade fallback
      root.classList.add('theme-transitioning');
      applyThemeClasses(nextTheme);
      setThemeState(nextTheme);
      setTimeout(() => {
        root.classList.remove('theme-transitioning');
      }, 420);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    transitionTheme(nextTheme);
  };

  const setTheme = (newTheme: Theme) => {
    transitionTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
