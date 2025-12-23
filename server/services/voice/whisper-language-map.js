/**
 * DESI POLISH: Whisper Language Mapping
 * Maps our language codes to Whisper-supported language codes
 * Whisper uses ISO 639-1 language codes
 */

// Whisper-supported Indian languages (ISO 639-1)
const WHISPER_SUPPORTED_LANGUAGES = {
  // Directly supported by Whisper
  hi: 'hi', // Hindi
  ta: 'ta', // Tamil
  te: 'te', // Telugu
  bn: 'bn', // Bengali
  mr: 'mr', // Marathi
  kn: 'kn', // Kannada
  ml: 'ml', // Malayalam
  gu: 'gu', // Gujarati
  pa: 'pa', // Punjabi
  ur: 'ur', // Urdu
  or: 'or', // Odia
  as: 'as', // Assamese
  ne: 'ne', // Nepali
  sa: 'sa', // Sanskrit

  // International languages
  en: 'en', // English
  es: 'es', // Spanish
  fr: 'fr', // French
  de: 'de', // German
  zh: 'zh', // Chinese
  ja: 'ja', // Japanese
  ko: 'ko', // Korean
  ru: 'ru', // Russian
  pt: 'pt', // Portuguese
  ar: 'ar', // Arabic
};

// Languages not directly supported by Whisper - map to closest supported or use auto
const LANGUAGE_FALLBACK_MAP = {
  // Devanagari script languages -> Hindi (best match)
  mai: 'hi', // Maithili -> Hindi (both Devanagari)
  kok: 'hi', // Konkani -> Hindi (both Devanagari)
  brx: 'hi', // Bodo -> Hindi (both Devanagari)
  doi: 'hi', // Dogri -> Hindi (both Devanagari)
  ks: 'ur', // Kashmiri -> Urdu (Perso-Arabic script, or 'hi' for Devanagari variant)

  // Other scripts
  sat: 'bn', // Santali (Ol Chiki) -> Bengali (closest major language in region)
  mni: 'bn', // Manipuri (Meitei Mayek) -> Bengali (closest major language in region)

  // Default fallback
  auto: null, // Let Whisper auto-detect
};

/**
 * Convert our language code to Whisper language code
 * @param {string} langCode - Our language code (e.g., 'hi-IN', 'ta', 'mai')
 * @returns {string|null} - Whisper language code or null for auto-detect
 */
function getWhisperLanguageCode(langCode) {
  if (!langCode || langCode === 'auto') {
    return null; // Auto-detect
  }

  // Extract base language code (remove locale suffix like '-IN')
  const baseCode = langCode.split('-')[0].toLowerCase();

  // Check if directly supported
  if (WHISPER_SUPPORTED_LANGUAGES[baseCode]) {
    return WHISPER_SUPPORTED_LANGUAGES[baseCode];
  }

  // Check fallback map
  if (LANGUAGE_FALLBACK_MAP[baseCode]) {
    return LANGUAGE_FALLBACK_MAP[baseCode];
  }

  // Default: try the base code as-is (Whisper might support it)
  // If not, Whisper will auto-detect
  return baseCode;
}

/**
 * Get all supported Whisper languages for Indian languages
 * @returns {string[]} - Array of language codes
 */
function getSupportedIndianLanguages() {
  return Object.keys(WHISPER_SUPPORTED_LANGUAGES).filter(code =>
    ['hi', 'ta', 'te', 'bn', 'mr', 'kn', 'ml', 'gu', 'pa', 'ur', 'or', 'as', 'ne', 'sa'].includes(
      code
    )
  );
}

module.exports = {
  getWhisperLanguageCode,
  getSupportedIndianLanguages,
  WHISPER_SUPPORTED_LANGUAGES,
  LANGUAGE_FALLBACK_MAP,
};
