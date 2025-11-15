/**
 * Design System Theme Utilities
 * Provides theme management and color utilities
 */

export type Theme = 'light' | 'dark' | 'system';

/**
 * Get the resolved theme (system resolves to light or dark)
 */
export function getResolvedTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  
  const root = document.documentElement;
  const themeAttr = root.getAttribute('data-theme');
  
  if (themeAttr === 'light' || themeAttr === 'dark') {
    return themeAttr;
  }
  
  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  
  return 'dark';
}

/**
 * Apply theme to document root
 */
export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  
  if (theme === 'system') {
    const resolved = getResolvedTheme();
    root.setAttribute('data-theme', resolved);
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
  } else {
    root.setAttribute('data-theme', theme);
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }
}

/**
 * Watch for system theme changes
 */
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  
  const handler = (e: MediaQueryListEvent | MediaQueryList) => {
    callback(e.matches ? 'light' : 'dark');
  };
  
  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }
  
  // Legacy browsers
  if (mediaQuery.addListener) {
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }
  
  return () => {};
}

