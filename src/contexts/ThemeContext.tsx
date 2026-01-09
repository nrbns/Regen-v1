import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  defaultHighContrast?: boolean;
  highContrastKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'regen:theme',
  defaultHighContrast = false,
  highContrastKey = 'regen:high-contrast',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');
  const [highContrast, setHighContrast] = useState<boolean>(defaultHighContrast);

  // Load theme and high contrast from localStorage on mount
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(storageKey);
      if (storedTheme && ['dark', 'light', 'system'].includes(storedTheme)) {
        setTheme(storedTheme as Theme);
      }

      const storedHighContrast = localStorage.getItem(highContrastKey);
      if (storedHighContrast !== null) {
        setHighContrast(storedHighContrast === 'true');
      }
    } catch (error) {
      console.warn('Failed to load preferences from localStorage:', error);
    }
  }, [storageKey, highContrastKey]);

  // Update resolved theme when theme or high contrast changes
  useEffect(() => {
    const updateResolvedTheme = () => {
      let resolved: 'dark' | 'light';

      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        resolved = theme;
      }

      setResolvedTheme(resolved);

      // Apply to document
      const root = document.documentElement;
      root.classList.remove('light', 'dark', 'high-contrast');
      root.classList.add(resolved);
      if (highContrast) {
        root.classList.add('high-contrast');
      }
      root.setAttribute('data-theme', resolved);
      root.setAttribute('data-high-contrast', highContrast.toString());

      // Update meta theme-color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', resolved === 'dark' ? '#0f172a' : '#f8fafc');
      }
    };

    updateResolvedTheme();

    // Listen for system theme changes if using system preference
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateResolvedTheme();

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, highContrast]);

  // Save theme to localStorage
  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  };

  // Save high contrast to localStorage
  const handleSetHighContrast = (enabled: boolean) => {
    setHighContrast(enabled);
    try {
      localStorage.setItem(highContrastKey, enabled.toString());
    } catch (error) {
      console.warn('Failed to save high contrast to localStorage:', error);
    }
  };

  const value = {
    theme,
    setTheme: handleSetTheme,
    resolvedTheme,
    highContrast,
    setHighContrast: handleSetHighContrast,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}