import { create } from 'zustand';

type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  cyclePreference: () => void;
}

const STORAGE_KEY = 'regen:theme-preference';
const isBrowser = typeof window !== 'undefined';

const getSystemTheme = (): ResolvedTheme => {
  if (!isBrowser || typeof window.matchMedia !== 'function') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (preference: ThemePreference) => {
  if (typeof document === 'undefined') return;
  const resolved = preference === 'system' ? getSystemTheme() : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.setAttribute('data-theme-resolved', resolved);
};

const initialPreference: ThemePreference = (() => {
  if (!isBrowser) return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
})();

const initialResolved: ResolvedTheme =
  initialPreference === 'system' ? getSystemTheme() : initialPreference;
if (typeof document !== 'undefined') {
  applyTheme(initialPreference);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: initialPreference,
  resolved: initialResolved,
  setPreference: preference => {
    if (isBrowser) {
      window.localStorage.setItem(STORAGE_KEY, preference);
    }
    applyTheme(preference);
    const resolved = preference === 'system' ? getSystemTheme() : preference;
    set({ preference, resolved });
  },
  cyclePreference: () => {
    const order: ThemePreference[] = ['system', 'light', 'dark'];
    const current = get().preference;
    const next = order[(order.indexOf(current) + 1) % order.length];
    get().setPreference(next);
  },
}));

if (isBrowser && typeof window.matchMedia === 'function') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    const { preference } = useThemeStore.getState();
    if (preference === 'system') {
      applyTheme('system');
      const resolved = getSystemTheme();
      useThemeStore.setState({ resolved });
    }
  };
  try {
    mediaQuery.addEventListener('change', handleChange);
  } catch {
    // Safari < 14 fallback
    mediaQuery.addListener(handleChange);
  }
}
