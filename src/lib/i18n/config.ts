/**
 * i18n Configuration
 * Sets up react-i18next for multilingual support
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Lazy load translation files (to avoid import errors if files don't exist)
// Will be loaded dynamically when i18n initializes
const resources: Record<string, { translation: any }> = {
  en: { translation: {} },
  hi: { translation: {} },
  ta: { translation: {} },
  te: { translation: {} },
};

// Try to load translations (if files exist)
try {
  const enTranslations = require('../locales/en.json');
  resources.en.translation = enTranslations;
} catch {
  console.warn('[i18n] English translations not found');
}

try {
  const hiTranslations = require('../locales/hi.json');
  resources.hi.translation = hiTranslations;
} catch {
  console.warn('[i18n] Hindi translations not found');
}

try {
  const taTranslations = require('../locales/ta.json');
  resources.ta.translation = taTranslations;
} catch {
  console.warn('[i18n] Tamil translations not found');
}

try {
  const teTranslations = require('../locales/te.json');
  resources.te.translation = teTranslations;
} catch {
  console.warn('[i18n] Telugu translations not found');
}

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

