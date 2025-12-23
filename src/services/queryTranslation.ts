/**
 * Query Translation Service
 * Automatically translates search queries between languages
 */

import { detectLanguage } from '../services/languageDetection';
import { useSettingsStore } from '../state/settingsStore';
import { getLocalHFServer } from './huggingface/localHFServer';

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

  // Use Hugging Face local translation (offline)
  try {
    const hfServer = getLocalHFServer();
    const translated = await hfServer.translate(query, {
      from: sourceLanguage,
      to: targetLanguage,
    });

    if (translated && translated !== query) {
      return translated;
    }

    // If translation failed or same, return original
    return query;
  } catch (error) {
    console.warn('[QueryTranslation] HF translation failed:', error);
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
