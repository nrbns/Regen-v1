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
      zIndex: {
        header: '20',
        overlay: '40',
        modal: '50',
        toast: '60',
        max: '9999',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,.06), 0 4px 10px rgba(0,0,0,.06)',
      },
    },
  },
  plugins: [],
} satisfies Config;


