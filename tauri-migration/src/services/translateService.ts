/**
 * Translation Service
 * Centralized translation service with caching and multiple providers
 */

import { translateText, mapToBhashiniCode } from './bhashiniService';

const CACHE_KEY_PREFIX = 'regen:translation:';
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

interface TranslationCacheEntry {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
}

/**
 * Translate text with caching
 */
export async function translate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  try {
    // Check cache first
    const cached = getCachedTranslation(text, sourceLanguage, targetLanguage);
    if (cached) {
      return cached.translatedText;
    }

    // Translate using Bhashini
    const bhashiniSource = mapToBhashiniCode(sourceLanguage);
    const bhashiniTarget = mapToBhashiniCode(targetLanguage);

    const result = await translateText({
      text,
      sourceLanguage: bhashiniSource,
      targetLanguage: bhashiniTarget,
    });

    // Cache the result
    cacheTranslation(text, sourceLanguage, targetLanguage, result.translatedText);

    return result.translatedText;
  } catch (error) {
    console.error('[TranslateService] Translation failed:', error);
    // Return original text on error
    return text;
  }
}

/**
 * Translate page title and URL
 */
export async function translatePageContent(
  title: string,
  url: string,
  targetLanguage: string
): Promise<{ title: string; url: string }> {
  try {
    // Detect source language (assume English for now, can be enhanced)
    const sourceLanguage = 'en';

    // Translate title
    const translatedTitle = await translate(title, sourceLanguage, targetLanguage);

    // For URL, we can't translate it, but we can add a note
    // In production, you might want to create a translated page version
    const translatedUrl = url; // Keep original URL

    return {
      title: translatedTitle,
      url: translatedUrl,
    };
  } catch (error) {
    console.error('[TranslateService] Page translation failed:', error);
    return {
      title,
      url,
    };
  }
}

/**
 * Translate multiple texts in batch
 */
export async function translateBatch(
  texts: string[],
  sourceLanguage: string,
  targetLanguage: string
): Promise<string[]> {
  try {
    // Translate in parallel (with rate limiting consideration)
    const translations = await Promise.all(
      texts.map(text => translate(text, sourceLanguage, targetLanguage))
    );
    return translations;
  } catch (error) {
    console.error('[TranslateService] Batch translation failed:', error);
    return texts; // Return original texts on error
  }
}

/**
 * Cache translation
 */
function cacheTranslation(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  translatedText: string
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const entry: TranslationCacheEntry = {
      translatedText,
      sourceLanguage,
      targetLanguage,
      timestamp: Date.now(),
    };

    const cacheKey = `${CACHE_KEY_PREFIX}${hashText(text)}:${sourceLanguage}:${targetLanguage}`;
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.error('[TranslateService] Cache failed:', error);
  }
}

/**
 * Get cached translation
 */
function getCachedTranslation(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): TranslationCacheEntry | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const cacheKey = `${CACHE_KEY_PREFIX}${hashText(text)}:${sourceLanguage}:${targetLanguage}`;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const entry: TranslationCacheEntry = JSON.parse(cached);

    // Check if cache is expired
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return entry;
  } catch (error) {
    console.error('[TranslateService] Cache read failed:', error);
    return null;
  }
}

/**
 * Hash text for cache key
 */
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Clear translation cache
 */
export function clearTranslationCache(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('[TranslateService] Cache clear failed:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: number } {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { size: 0, entries: 0 };
    }

    const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_KEY_PREFIX));
    let totalSize = 0;

    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    });

    return {
      size: totalSize,
      entries: keys.length,
    };
  } catch (error) {
    console.error('[TranslateService] Cache stats failed:', error);
    return { size: 0, entries: 0 };
  }
}
