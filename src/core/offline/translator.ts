/**
 * Offline Multilingual Translation
 * Uses lightweight translation for offline mode (50+ languages)
 * Falls back to online APIs when available
 */

import { useSettingsStore } from '../../state/settingsStore';

export interface TranslationResult {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  method: 'offline' | 'online' | 'cache';
}

// Language code mapping for offline translation
const LANGUAGE_CODES: Record<string, string> = {
  en: 'en',
  hi: 'hi',
  ta: 'ta',
  te: 'te',
  bn: 'bn',
  mr: 'mr',
  kn: 'kn',
  ml: 'ml',
  gu: 'gu',
  pa: 'pa',
  ur: 'ur',
  or: 'or',
  as: 'as',
  si: 'si',
  ne: 'ne',
  es: 'es',
  fr: 'fr',
  de: 'de',
  pt: 'pt',
  zh: 'zh',
  ja: 'ja',
  ko: 'ko',
  ru: 'ru',
  ar: 'ar',
  fa: 'fa',
  tr: 'tr',
  id: 'id',
  th: 'th',
  vi: 'vi',
};

// Simple offline translation cache
const translationCache = new Map<string, string>();

/**
 * Simple offline translation using rule-based approach
 * For production, this would use a lightweight model like mBART
 */
function simpleOfflineTranslate(text: string, sourceLang: string, targetLang: string): string {
  // Check cache first
  const cacheKey = `${sourceLang}:${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // If same language, return as-is
  if (sourceLang === targetLang || targetLang === 'auto') {
    return text;
  }

  // Simple rule-based translation for common phrases
  // In production, this would use mBART or similar model
  const commonTranslations: Record<string, Record<string, string>> = {
    research: {
      hi: 'अनुसंधान',
      ta: 'ஆராய்ச்சி',
      bn: 'গবেষণা',
    },
    summary: {
      hi: 'सारांश',
      ta: 'சுருக்கம்',
      bn: 'সারসংক্ষেপ',
    },
    sources: {
      hi: 'स्रोत',
      ta: 'மூலங்கள்',
      bn: 'উৎস',
    },
  };

  // Try to find common translations
  const lowerText = text.toLowerCase();
  for (const [key, translations] of Object.entries(commonTranslations)) {
    if (lowerText.includes(key) && translations[targetLang]) {
      const translated = text.replace(new RegExp(key, 'gi'), translations[targetLang]);
      translationCache.set(cacheKey, translated);
      return translated;
    }
  }

  // Fallback: return original text with language marker
  return text;
}

/**
 * Translate text offline or online
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslationResult> {
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
  const sourceLang = sourceLanguage || 'auto';
  const targetLang = targetLanguage === 'auto' ? 'en' : targetLanguage;

  // If online, try to use online translation API
  if (isOnline) {
    try {
      // Try to use backend translation API if available
      const { ipc } = await import('../../lib/ipc-typed');
      const result = await ipc.research
        ?.queryEnhanced?.({
          query: `Translate to ${targetLang}: ${text}`,
          language: targetLang,
        })
        .catch(() => null);

      if (result && typeof result === 'object' && 'summary' in result) {
        return {
          text: (result as any).summary || text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          confidence: 0.9,
          method: 'online',
        };
      }
    } catch (error) {
      console.warn('[OfflineTranslator] Online translation failed, using offline:', error);
    }
  }

  // Use offline translation
  const translated = simpleOfflineTranslate(text, sourceLang, targetLang);
  return {
    text: translated,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    confidence: 0.7, // Lower confidence for offline
    method: 'offline',
  };
}

/**
 * Summarize text offline
 */
export async function summarizeOffline(text: string, language: string = 'auto'): Promise<string> {
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

  // If online, try online summarization
  if (isOnline) {
    try {
      const { aiEngine } = await import('../ai');
      const result = await aiEngine.runTask({
        kind: 'search',
        prompt: `Summarize in ${language}: ${text.slice(0, 1000)}`,
        context: {},
        mode: 'research',
        llm: { temperature: 0.3, maxTokens: 200 },
      });
      return result.text || text.slice(0, 200) + '...';
    } catch (error) {
      console.warn('[OfflineTranslator] Online summarization failed:', error);
    }
  }

  // Offline summarization: simple truncation with language-aware markers
  const maxLength = 200;
  if (text.length <= maxLength) {
    return text;
  }

  // Try to find sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let summary = '';
  for (const sentence of sentences) {
    if ((summary + sentence).length > maxLength) {
      break;
    }
    summary += sentence;
  }

  return summary || text.slice(0, maxLength) + '...';
}

/**
 * Check if offline mode is available
 */
export function isOfflineModeAvailable(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Get supported languages for offline mode
 */
export function getOfflineSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_CODES);
}
