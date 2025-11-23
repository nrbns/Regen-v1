export const colorTokens = {
  primary: 'var(--color-primary-500)',
  primaryHover: 'var(--color-primary-400)',
  primaryActive: 'var(--color-primary-600)',
  surface: 'var(--surface-panel)',
  surfaceHover: 'var(--surface-hover)',
  surfaceActive: 'var(--surface-active)',
  border: 'var(--surface-border)',
  borderStrong: 'var(--surface-border-strong)',
  text: 'var(--text-primary)',
  textMuted: 'var(--text-muted)',
  accent: 'var(--accent)',
};

export const spacingTokens = {
  none: '0px',
  xs: 'var(--space-2)',
  sm: 'var(--space-3)',
  md: 'var(--space-4)',
  lg: 'var(--space-6)',
  xl: 'var(--space-8)',
  '2xl': 'var(--space-10)',
};

export const radiusTokens = {
  sm: 'var(--radius-md, 0.375rem)',
  md: 'var(--radius-lg, 0.5rem)',
  lg: 'var(--radius-2xl, 1rem)',
  pill: '9999px',
};

export const shadowTokens = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
};

export type ThemeMode = 'light' | 'dark';
