import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    './apps/**/*.{ts,tsx,js,jsx}',
    './electron/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      // Consistent spacing scale from design tokens
      spacing: {
        '0.5': '4px',   // --space-1
        '1': '8px',     // --space-2
        '1.5': '12px',  // --space-3
        '2': '16px',    // --space-4
        '3': '24px',    // --space-6
        '4': '32px',    // --space-8
        '6': '48px',    // --space-12
        '8': '64px',    // --space-16
        '10': '80px',   // --space-20
        '12': '96px',   // --space-24
      },
      // Consistent typography scale
      fontSize: {
        'xs': ['12px', { lineHeight: '1.5' }],
        'sm': ['14px', { lineHeight: '1.5' }],
        'base': ['16px', { lineHeight: '1.5' }],
        'lg': ['18px', { lineHeight: '1.5' }],
        'xl': ['20px', { lineHeight: '1.4' }],
        '2xl': ['24px', { lineHeight: '1.4' }],
        '3xl': ['30px', { lineHeight: '1.3' }],
        '4xl': ['36px', { lineHeight: '1.3' }],
        '5xl': ['48px', { lineHeight: '1.2' }],
        '6xl': ['60px', { lineHeight: '1.1' }],
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Consolas', 'Courier New', 'monospace'],
      },
      // SPRINT 0: Border radius scale
      borderRadius: {
        'sm': '4px',   // --radius-sm
        'md': '8px',   // --radius-md
        'lg': '12px',  // --radius-lg
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
      // High contrast mode adjustments
      screens: {
        'high-contrast': { raw: '[data-high-contrast="true"]' },
      },
    },
  },
  plugins: [],
} satisfies Config;


