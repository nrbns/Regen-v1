import { ReactNode, useCallback, useLayoutEffect } from 'react';

import { useThemeStore } from '../state/themeStore';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const resolved = useThemeStore(state => state.resolved);

  const syncLayoutPadding = useCallback(() => {
    if (typeof document === 'undefined') return;
    const width = window.innerWidth;
    let padding = '1rem';
    if (width >= 1440) {
      padding = '2.25rem';
    } else if (width >= 1024) {
      padding = '1.75rem';
    } else if (width >= 640) {
      padding = '1.25rem';
    }
    document.documentElement.style.setProperty('--layout-page-padding', padding);
  }, []);

  useLayoutEffect(() => {
    syncLayoutPadding();
    window.addEventListener('resize', syncLayoutPadding);
    return () => window.removeEventListener('resize', syncLayoutPadding);
  }, [syncLayoutPadding]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  return <>{children}</>;
}

export function useTheme() {
  const preference = useThemeStore(state => state.preference);
  const resolved = useThemeStore(state => state.resolved);
  const setPreference = useThemeStore(state => state.setPreference);
  const cyclePreference = useThemeStore(state => state.cyclePreference);

  return {
    preference,
    resolved,
    setPreference,
    cyclePreference,
  };
}
