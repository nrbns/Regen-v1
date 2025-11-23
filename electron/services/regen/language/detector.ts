/**
 * Language Detection Service
 * Detects Tamil, Hindi, English, and other Indian languages
 */

// Language detection utility

export type LanguageCode = 'ta' | 'hi' | 'en' | 'te' | 'kn' | 'ml' | 'mr' | 'gu' | 'pa' | 'bn';
export type LanguageLocale =
  | 'ta-IN'
  | 'hi-IN'
  | 'en-IN'
  | 'te-IN'
  | 'kn-IN'
  | 'ml-IN'
  | 'mr-IN'
  | 'gu-IN'
  | 'pa-IN'
  | 'bn-IN';

/**
 * Detect language from text
 * Uses pattern matching for common Indian languages
 */
export function detectLanguage(text: string): LanguageCode {
  if (!text || text.trim().length === 0) {
    return 'en'; // Default to English
  }

  const lower = text.toLowerCase();

  // Tamil detection (Tamil script range: 0B80-0BFF)
  const tamilPattern = /[\u0B80-\u0BFF]/;
  if (tamilPattern.test(text)) {
    return 'ta';
  }

  // Hindi detection (Devanagari script range: 0900-097F)
  const hindiPattern = /[\u0900-\u097F]/;
  if (hindiPattern.test(text)) {
    return 'hi';
  }

  // Telugu detection (0C00-0C7F)
  const teluguPattern = /[\u0C00-\u0C7F]/;
  if (teluguPattern.test(text)) {
    return 'te';
  }

  // Kannada detection (0C80-0CFF)
  const kannadaPattern = /[\u0C80-\u0CFF]/;
  if (kannadaPattern.test(text)) {
    return 'kn';
  }

  // Malayalam detection (0D00-0D7F)
  const malayalamPattern = /[\u0D00-\u0D7F]/;
  if (malayalamPattern.test(text)) {
    return 'ml';
  }

  // Bengali detection (0980-09FF)
  const bengaliPattern = /[\u0980-\u09FF]/;
  if (bengaliPattern.test(text)) {
    return 'bn';
  }

  // Gujarati detection (0A80-0AFF)
  const gujaratiPattern = /[\u0A80-\u0AFF]/;
  if (gujaratiPattern.test(text)) {
    return 'gu';
  }

  // Punjabi detection (0A00-0A7F)
  const punjabiPattern = /[\u0A00-\u0A7F]/;
  if (punjabiPattern.test(text)) {
    return 'pa';
  }

  // Marathi detection (uses Devanagari, but can check for Marathi-specific words)
  // For now, treat as Hindi if Devanagari is present

  // Check for Hinglish (Hindi words in English script)
  const hinglishKeywords = [
    'kya',
    'hai',
    'ho',
    'nahi',
    'hain',
    'kar',
    'karne',
    'karo',
    'kare',
    'mein',
    'se',
    'ko',
    'ka',
    'ki',
    'ke',
    'par',
    'aur',
    'ya',
    'bhi',
  ];
  const hasHinglish = hinglishKeywords.some(keyword => lower.includes(keyword));
  if (hasHinglish && !tamilPattern.test(text) && !hindiPattern.test(text)) {
    return 'hi'; // Treat Hinglish as Hindi
  }

  // Default to English
  return 'en';
}

/**
 * Convert language code to locale
 */
export function languageToLocale(lang: LanguageCode): LanguageLocale {
  const localeMap: Record<LanguageCode, LanguageLocale> = {
    ta: 'ta-IN',
    hi: 'hi-IN',
    en: 'en-IN',
    te: 'te-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    mr: 'mr-IN',
    gu: 'gu-IN',
    pa: 'pa-IN',
    bn: 'bn-IN',
  };
  return localeMap[lang] || 'en-IN';
}

/**
 * Get language name in English
 */
export function getLanguageName(lang: LanguageCode): string {
  const names: Record<LanguageCode, string> = {
    ta: 'Tamil',
    hi: 'Hindi',
    en: 'English',
    te: 'Telugu',
    kn: 'Kannada',
    ml: 'Malayalam',
    mr: 'Marathi',
    gu: 'Gujarati',
    pa: 'Punjabi',
    bn: 'Bengali',
  };
  return names[lang] || 'English';
}
