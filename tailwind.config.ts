import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    './apps/**/*.{ts,tsx,js,jsx}',
    './electron/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      // SPRINT 0: 8px baseline grid spacing scale
      spacing: {
        '0.5': '4px', // --spacing-1
        '1': '8px', // --spacing-2
        '1.5': '12px', // --spacing-3
        '2': '16px', // --spacing-4
        '3': '24px', // --spacing-5
        '4': '32px', // --spacing-6
        '6': '48px', // --spacing-7
        '8': '64px', // --spacing-8
      },
      // SPRINT 0: Typography scale
      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.5' }], // Base content line-height
        lg: ['18px', { lineHeight: '1.5' }],
        xl: ['24px', { lineHeight: '1.4' }],
        '2xl': ['32px', { lineHeight: '1.4' }],
        '3xl': ['48px', { lineHeight: '1.3' }],
      },
      // SPRINT 0: Border radius scale
      borderRadius: {
        sm: '4px', // --radius-sm
        md: '8px', // --radius-md
        lg: '12px', // --radius-lg
      },
      zIndex: {
        // Base layers (0-10): Content, UI elements
        base: 0,
        content: 1,
        // Navigation (10-30): Top nav, sidebars, status bars
        nav: 10,
        header: 20,
        status: 30,
        // Dropdowns & Popovers (30-50): Menus, tooltips, dropdowns
        dropdown: 30,
        popover: 40,
        tooltip: 45,
        // Overlays (50-100): Backdrops, non-modal overlays
        overlay: 50,
        overlayBackdrop: 60,
        // Modals (100-200): Dialogs, modals, full-screen overlays
        modal: 100,
        modalBackdrop: 110,
        modalContent: 120,
        // Critical UI (200-300): Onboarding, tours, critical alerts
        critical: 200,
        onboarding: 210,
        tour: 220,
        // Maximum (9000+): Emergency, always-on-top
        max: 9999,
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,.06), 0 4px 10px rgba(0,0,0,.06)',
      },
    },
  },
  plugins: [],
} satisfies Config;
