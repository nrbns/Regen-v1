/**
 * i18n Configuration
 * Sets up react-i18next for multilingual support
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Load translation files using static imports - Vite handles these at build time
// Initialize with empty translations, then load asynchronously
const resources: Record<string, { translation: any }> = {
  en: { translation: {} },
  hi: { translation: {} },
  ta: { translation: {} },
  te: { translation: {} },
};

// Load translations asynchronously (non-blocking)
(async () => {
  try {
    // Static imports - Vite will resolve these at build time
    const [en, hi, ta, te] = await Promise.allSettled([
      import('../../locales/en.json').then(m => m.default),
      import('../../locales/hi.json').then(m => m.default),
      import('../../locales/ta.json').then(m => m.default),
      import('../../locales/te.json').then(m => m.default),
    ]);
    
    if (en.status === 'fulfilled') resources.en.translation = en.value;
    else console.warn('[i18n] English translations not found');
    
    if (hi.status === 'fulfilled') resources.hi.translation = hi.value;
    else console.warn('[i18n] Hindi translations not found');
    
    if (ta.status === 'fulfilled') resources.ta.translation = ta.value;
    else console.warn('[i18n] Tamil translations not found');
    
    if (te.status === 'fulfilled') resources.te.translation = te.value;
    else console.warn('[i18n] Telugu translations not found');
    
    // Reload i18n after translations are loaded
    i18n.reloadResources();
  } catch (error) {
    console.warn('[i18n] Error loading translations:', error);
  }
})();

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'ta', 'te'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Resources are defined above

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      // Detect language from:
      // 1. localStorage/sessionStorage
      // 2. Browser language
      // 3. Default to 'en'
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    react: {
      useSuspense: false, // Don't require Suspense for translations
    },
  });

export default i18n;

