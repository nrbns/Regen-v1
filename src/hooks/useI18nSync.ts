/**
 * Hook to sync language setting with i18n
 * Ensures settings store and i18n stay in sync
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../state/settingsStore';

/**
 * Sync language from settings store to i18n
 */
export function useI18nSync() {
  const { i18n } = useTranslation();
  const language = useSettingsStore(state => state.language || 'auto');

  useEffect(() => {
    // Get effective language (if 'auto', use browser language or 'en')
    let effectiveLang = language;
    if (language === 'auto') {
      const browserLang = navigator.language.split('-')[0];
      effectiveLang = ['en', 'hi', 'ta', 'te'].includes(browserLang) ? browserLang : 'en';
    }

    // Only change if different
    if (i18n.language !== effectiveLang) {
      i18n.changeLanguage(effectiveLang);
    }
  }, [language, i18n]);

  // Also sync back to settings if i18n language changes externally
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      const { setLanguage } = useSettingsStore.getState();
      if (useSettingsStore.getState().language !== lng) {
        setLanguage(lng);
      }
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);
}



