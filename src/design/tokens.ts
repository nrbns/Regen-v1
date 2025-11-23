/**
 * Design Tokens - Tier 3
 * Centralized design system for consistent visual language
 */

export const tokens = {
  // Spacing scale (4px base)
  spacing: {
    0: '0',
    1: '0.25rem', // 4px
    2: '0.5rem', // 8px
    3: '0.75rem', // 12px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    8: '2rem', // 32px
    10: '2.5rem', // 40px
    12: '3rem', // 48px
    16: '4rem', // 64px
    20: '5rem', // 80px
  },

  // Border radius scale
  radius: {
    none: '0',
    sm: '0.5rem', // 8px
    md: '0.75rem', // 12px
    lg: '1rem', // 16px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Typography scale
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'].join(', '),
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'].join(', '),
    },
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem', // 48px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  // Color palette (dark theme optimized)
  colors: {
    // Brand colors - OmniBrowser signature gradient
    brand: {
      primary: '#8b5cf6', // Purple
      secondary: '#06b6d4', // Cyan
      accent: '#f59e0b', // Amber
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
    },
    // Semantic colors
    semantic: {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    },
    // Neutral scale
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
    // Surface colors
    surface: {
      base: '#0f172a', // slate-900
      elevated: '#1e293b', // slate-800
      overlay: 'rgba(15, 23, 42, 0.8)',
    },
  },

  // Shadows (soft elevation)
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    glow: '0 0 20px rgba(139, 92, 246, 0.3)', // Brand glow
  },

  // Animation timings
  animation: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    commandBar: 1080,
  },
} as const;

// Helper function to get spacing
export function spacing(value: keyof typeof tokens.spacing): string {
  return tokens.spacing[value];
}

// Helper function to get radius
export function radius(value: keyof typeof tokens.radius): string {
  return tokens.radius[value];
}

// CSS variables for runtime access
export const cssVariables = {
  '--spacing-1': tokens.spacing[1],
  '--spacing-2': tokens.spacing[2],
  '--spacing-4': tokens.spacing[4],
  '--spacing-6': tokens.spacing[6],
  '--radius-md': tokens.radius.md,
  '--radius-lg': tokens.radius.lg,
  '--color-brand-primary': tokens.colors.brand.primary,
  '--color-brand-secondary': tokens.colors.brand.secondary,
  '--shadow-glow': tokens.shadows.glow,
  '--animation-fast': tokens.animation.duration.fast,
  '--animation-normal': tokens.animation.duration.normal,
} as const;
