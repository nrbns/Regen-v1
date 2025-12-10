/**
 * Query Translation Service
 * Automatically translates search queries between languages
 */

import { translateOnDevice } from './onDeviceAI';
import { detectLanguage } from '../services/languageDetection';
import { useSettingsStore } from '../state/settingsStore';

export interface TranslationOptions {
  sourceLanguage?: string;
  targetLanguage?: string;
  useOnDevice?: boolean;
}

/**
 * Translate a search query
 * Detects source language and translates to target (or user's preferred language)
 */
export async function translateQuery(
  query: string,
  options: TranslationOptions = {}
): Promise<string> {
  if (!query || query.trim().length === 0) {
    return query;
  }

  // Get user's preferred language from settings
  const settings = useSettingsStore.getState();
  const userLanguage = settings.language || 'en';

  // If user wants 'auto', try to detect language
  let sourceLanguage = options.sourceLanguage;
  let targetLanguage = options.targetLanguage || (userLanguage === 'auto' ? 'en' : userLanguage);

  // If source not specified, detect it
  if (!sourceLanguage || sourceLanguage === 'auto') {
    const detection = await detectLanguage(query);
    sourceLanguage = detection.language;
  }

  // If source and target are the same, no translation needed
  if (sourceLanguage === targetLanguage || (sourceLanguage === 'en' && targetLanguage === 'en')) {
    return query;
  }

  // Translate using on-device AI (with cloud fallback)
  try {
    const result = await translateOnDevice(query, {
      targetLanguage,
      sourceLanguage,
    });

    if (result.translated && result.translated !== query) {
      return result.translated;
    }

    // If translation failed or same, return original
    return query;
  } catch (error) {
    console.warn('[QueryTranslation] Translation failed:', error);
    return query; // Return original on error
  }
}

/**
 * Translate query for search (common use case)
 */
export async function translateQueryForSearch(query: string): Promise<string> {
  const settings = useSettingsStore.getState();
  const userLanguage = settings.language || 'en';

  // Don't translate if user language is 'auto' or 'en'
  if (userLanguage === 'auto' || userLanguage === 'en') {
    return query;
  }

  return translateQuery(query, {
    targetLanguage: userLanguage,
  });
}
