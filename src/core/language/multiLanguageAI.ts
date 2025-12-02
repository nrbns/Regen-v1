/**
 * Real-time Multi-Language AI
 * Supports Hindi, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati
 * Instant translation, search, summarization
 */

export type SupportedLanguage =
  | 'hi' // Hindi
  | 'ta' // Tamil
  | 'te' // Telugu
  | 'ml' // Malayalam
  | 'kn' // Kannada
  | 'bn' // Bengali
  | 'mr' // Marathi
  | 'gu' // Gujarati
  | 'en' // English
  | 'auto'; // Auto-detect

export interface LanguageMetadata {
  code: string;
  name: string;
  nativeName: string;
  locale: string;
  script: string;
}

export const LANGUAGE_METADATA: Record<SupportedLanguage, LanguageMetadata> = {
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    locale: 'hi-IN',
    script: 'Devanagari',
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    locale: 'ta-IN',
    script: 'Tamil',
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    locale: 'te-IN',
    script: 'Telugu',
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    locale: 'ml-IN',
    script: 'Malayalam',
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    locale: 'kn-IN',
    script: 'Kannada',
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    locale: 'bn-IN',
    script: 'Bengali',
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    locale: 'mr-IN',
    script: 'Devanagari',
  },
  gu: {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    locale: 'gu-IN',
    script: 'Gujarati',
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    locale: 'en-US',
    script: 'Latin',
  },
  auto: {
    code: 'auto',
    name: 'Auto-detect',
    nativeName: 'Auto',
    locale: 'en-US',
    script: 'Auto',
  },
};

class MultiLanguageAI {
  private cache: Map<string, string> = new Map();

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<SupportedLanguage> {
    // Check cache
    const cacheKey = `detect:${text.slice(0, 100)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached as SupportedLanguage;
    }

    // Use Tauri backend for detection
    if (typeof window !== 'undefined' && window.__TAURI__) {
      try {
        const result = await window.__TAURI__.invoke('detect_language', { text });
        const detected = (result as { language: string }).language || 'en';
        this.cache.set(cacheKey, detected);
        return detected as SupportedLanguage;
      } catch (error) {
        console.error('[MultiLanguageAI] Detection failed:', error);
      }
    }

    // Fallback: simple heuristic detection
    return this.heuristicDetect(text);
  }

  /**
   * Heuristic language detection (fallback)
   */
  private heuristicDetect(text: string): SupportedLanguage {
    // Check for Devanagari script (Hindi, Marathi)
    if (/[\u0900-\u097F]/.test(text)) {
      // More likely Hindi than Marathi
      return 'hi';
    }

    // Check for Tamil script
    if (/[\u0B80-\u0BFF]/.test(text)) {
      return 'ta';
    }

    // Check for Telugu script
    if (/[\u0C00-\u0C7F]/.test(text)) {
      return 'te';
    }

    // Check for Malayalam script
    if (/[\u0D00-\u0D7F]/.test(text)) {
      return 'ml';
    }

    // Check for Kannada script
    if (/[\u0C80-\u0CFF]/.test(text)) {
      return 'kn';
    }

    // Check for Bengali script
    if (/[\u0980-\u09FF]/.test(text)) {
      return 'bn';
    }

    // Check for Gujarati script
    if (/[\u0A80-\u0AFF]/.test(text)) {
      return 'gu';
    }

    return 'en';
  }

  /**
   * Translate text to target language
   */
  async translate(
    text: string,
    targetLang: SupportedLanguage,
    sourceLang?: SupportedLanguage
  ): Promise<string> {
    // Auto-detect source if not provided
    if (!sourceLang || sourceLang === 'auto') {
      sourceLang = await this.detectLanguage(text);
    }

    // No translation needed if same language
    if (sourceLang === targetLang) {
      return text;
    }

    // Check cache
    const cacheKey = `translate:${sourceLang}:${targetLang}:${text.slice(0, 100)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Use Tauri backend for translation
    if (typeof window !== 'undefined' && window.__TAURI__) {
      try {
        const result = await window.__TAURI__.invoke('translate_text', {
          text,
          sourceLang,
          targetLang,
        });
        const translated = (result as { translated: string }).translated || text;
        this.cache.set(cacheKey, translated);
        return translated;
      } catch (error) {
        console.error('[MultiLanguageAI] Translation failed:', error);
      }
    }

    // Fallback: return original text
    return text;
  }

  /**
   * Search in multiple languages
   */
  async search(
    query: string,
    languages: SupportedLanguage[] = ['en'],
    options?: { limit?: number }
  ): Promise<Array<{ language: SupportedLanguage; results: unknown[] }>> {
    const results: Array<{ language: SupportedLanguage; results: unknown[] }> = [];

    // Detect query language
    const detectedLang = await this.detectLanguage(query);

    // Search in each language
    for (const lang of languages) {
      let searchQuery = query;

      // Translate query if needed
      if (lang !== detectedLang && lang !== 'auto') {
        searchQuery = await this.translate(query, lang, detectedLang);
      }

      // Perform search (use existing search service)
      try {
        // This would integrate with your existing search service
        const searchResults = await this.performSearch(searchQuery, lang);
        results.push({
          language: lang,
          results: searchResults.slice(0, options?.limit || 10),
        });
      } catch (error) {
        console.error(`[MultiLanguageAI] Search failed for ${lang}:`, error);
      }
    }

    return results;
  }

  /**
   * Summarize in target language
   */
  async summarize(
    text: string,
    targetLang: SupportedLanguage = 'en',
    options?: { maxLength?: number }
  ): Promise<string> {
    // Detect source language
    const sourceLang = await this.detectLanguage(text);

    // Summarize in source language first (more accurate)
    let summary = text;
    if (text.length > (options?.maxLength || 500)) {
      // Use Tauri backend for summarization
      if (typeof window !== 'undefined' && window.__TAURI__) {
        try {
          const result = await window.__TAURI__.invoke('summarize_text', {
            text,
            language: sourceLang,
            maxLength: options?.maxLength || 500,
          });
          summary = (result as { summary: string }).summary || text;
        } catch (error) {
          console.error('[MultiLanguageAI] Summarization failed:', error);
          // Fallback: simple truncation
          summary = text.slice(0, options?.maxLength || 500) + '...';
        }
      } else {
        // Fallback: simple truncation
        summary = text.slice(0, options?.maxLength || 500) + '...';
      }
    }

    // Translate summary to target language if needed
    if (sourceLang !== targetLang && targetLang !== 'auto') {
      summary = await this.translate(summary, targetLang, sourceLang);
    }

    return summary;
  }

  /**
   * Perform search (placeholder - integrate with your search service)
   */
  private async performSearch(_query: string, _language: SupportedLanguage): Promise<unknown[]> {
    // This would integrate with your existing search infrastructure
    // For now, return empty array
    return [];
  }

  /**
   * Get language metadata
   */
  getLanguageMetadata(lang: SupportedLanguage): LanguageMetadata {
    return LANGUAGE_METADATA[lang] || LANGUAGE_METADATA.en;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return Object.keys(LANGUAGE_METADATA) as SupportedLanguage[];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const multiLanguageAI = new MultiLanguageAI();
