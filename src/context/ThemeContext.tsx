/**
 * Theme Context
 * Manages Dark Mode and Light Mode switching with localStorage persistence
 * and class attribute synchronization on document.documentElement.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (event?: React.MouseEvent | MouseEvent) => void;
  setTheme: (theme: Theme, event?: React.MouseEvent | MouseEvent) => void;
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

  const transitionTheme = (nextTheme: Theme, event?: React.MouseEvent | MouseEvent) => {
    if (nextTheme === theme) return;

    const root = document.documentElement;
    const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasViewTransition = typeof document !== 'undefined' && 'startViewTransition' in document && !isReducedMotion;

    if (hasViewTransition) {
      // Temporarily mark view-transition-active so child CSS transitions don't skew the before/after snapshot
      root.classList.add('view-transition-active');
      try {
        const transition = (document as any).startViewTransition(() => {
          applyThemeClasses(nextTheme);
          setThemeState(nextTheme);
        });

        // If a trigger coordinate exists (e.g. user clicked the sun/moon button), perform a radial expansion
        if (event && 'clientX' in event && event.clientX > 0 && typeof window !== 'undefined') {
          const x = event.clientX;
          const y = event.clientY;
          const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
          );

          if (transition.ready && typeof transition.ready.then === 'function') {
            transition.ready.then(() => {
              try {
                document.documentElement.animate(
                  {
                    clipPath: [
                      `circle(0px at ${x}px ${y}px)`,
                      `circle(${endRadius}px at ${x}px ${y}px)`
                    ]
                  },
                  {
                    duration: 400,
                    easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
                    pseudoElement: '::view-transition-new(root)'
                  }
                );
              } catch {
                // If browser does not support pseudoElement in Web Animations API, CSS cross-fade handles it seamlessly
              }
            }).catch(() => {});
          }
        }

        transition.finished.finally(() => {
          root.classList.remove('view-transition-active');
        });
        return;
      } catch {
        root.classList.remove('view-transition-active');
        // Fall through to CSS smooth transition fallback
      }
    }

    // CSS Fallback: Synchronized cross-fade for browsers without View Transitions
    root.classList.add('theme-transitioning');
    applyThemeClasses(nextTheme);
    setThemeState(nextTheme);
    window.setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 380);
  };

  const toggleTheme = (event?: React.MouseEvent | MouseEvent) => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    transitionTheme(nextTheme, event);
  };

  const setTheme = (newTheme: Theme, event?: React.MouseEvent | MouseEvent) => {
    transitionTheme(newTheme, event);
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
