/**
 * Theme Management Hook
 * Handles light/dark mode toggle with localStorage persistence
 */

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export function useTheme() {
  // Initialize from localStorage or default to dark
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme | null;
      return stored || 'dark';
    }
    return 'dark';
  });

  // Apply theme to document on mount and when theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return { theme, toggleTheme, setTheme };
}
