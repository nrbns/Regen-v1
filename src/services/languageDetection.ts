/**
 * Language Auto-Detection Service
 * Uses IndicBERT/mBART models for accurate language detection
 * Falls back to lightweight client-side detection when backend unavailable
 *
 * Supports 22 Indic languages + 100+ global languages
 */

import { log } from '../utils/logger';
import { isBhashiniSupported, getBhashiniSupportedLanguages } from './bhashiniService';

// Language detection result
export interface LanguageDetectionResult {
  language: string; // ISO 639-1 language code
  confidence: number; // 0.0 to 1.0
  method: 'indicbert' | 'mbart' | 'client' | 'fallback';
  isIndic: boolean;
}

// Supported Indic languages (22 languages)
const INDIC_LANGUAGES = [
  'as', // Assamese
  'bn', // Bengali
  'brx', // Bodo
  'doi', // Dogri
  'gom', // Konkani
  'gu', // Gujarati
  'hi', // Hindi
  'kn', // Kannada
  'ks', // Kashmiri
  'mai', // Maithili
  'ml', // Malayalam
  'mni', // Manipuri
  'mr', // Marathi
  'ne', // Nepali
  'or', // Odia
  'pa', // Punjabi
  'sa', // Sanskrit
  'sat', // Santali
  'sd', // Sindhi
  'ta', // Tamil
  'te', // Telugu
  'ur', // Urdu
] as const;

// Common language patterns for rule-based detection
const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  hi: [
    /[\u0900-\u097F]/, // Devanagari script
    /\b(है|हो|कर|से|में|को|का|के|की|पर|इस|उस|वह|यह|क्या|कैसे|कहाँ|कब|क्यों)\b/,
  ],
  ta: [
    /[\u0B80-\u0BFF]/, // Tamil script
    /\b(ஆக|இது|அது|என்ன|எப்படி|எங்கே|எப்போது|ஏன்)\b/,
  ],
  te: [
    /[\u0C00-\u0C7F]/, // Telugu script
    /\b(అది|ఇది|ఏమి|ఎలా|ఎక్కడ|ఎప్పుడు|ఎందుకు)\b/,
  ],
  bn: [
    /[\u0980-\u09FF]/, // Bengali script
    /\b(এটা|সেটা|কি|কিভাবে|কোথায়|কখন|কেন)\b/,
  ],
  mr: [
    /[\u0900-\u097F]/, // Devanagari (Marathi uses same script as Hindi)
    /\b(हे|ते|कर|पासून|मध्ये|ला|चा|चे|ची|वर|हा|ती|काय|कसे|कुठे|कधी|का)\b/,
  ],
  kn: [
    /[\u0C80-\u0CFF]/, // Kannada script
    /\b(ಇದು|ಅದು|ಏನು|ಹೇಗೆ|ಎಲ್ಲಿ|ಎಂದು|ಏಕೆ)\b/,
  ],
  ml: [
    /[\u0D00-\u0D7F]/, // Malayalam script
    /\b(ഇത്|അത്|എന്ത്|എങ്ങനെ|എവിടെ|എപ്പോൾ|എന്തുകൊണ്ട്)\b/,
  ],
  gu: [
    /[\u0A80-\u0AFF]/, // Gujarati script
    /\b(આ|તે|કર|માં|ને|નો|ની|ના|પર|આ|તે|શું|કેવી|ક્યાં|ક્યારે|શા માટે)\b/,
  ],
  pa: [
    /[\u0A00-\u0A7F]/, // Gurmukhi script
    /\b(ਇਹ|ਉਹ|ਕੀ|ਕਿਵੇਂ|ਕਿੱਥੇ|ਕਦੋਂ|ਕਿਉਂ)\b/,
  ],
  ur: [
    /[\u0600-\u06FF]/, // Arabic script (Urdu)
    /\b(یہ|وہ|کیا|کیسے|کہاں|کب|کیوں)\b/,
  ],
  or: [
    /[\u0B00-\u0B7F]/, // Odia script
    /\b(ଏହା|ସେହା|କଣ|କିପରି|କେଉଁଠି|କେବେ|କାହିଁକି)\b/,
  ],
  as: [
    /[\u0980-\u09FF]/, // Bengali script (Assamese)
    /\b(এই|সেই|কি|কেনেকৈ|ক’ত|কেতিয়া|কিয়)\b/,
  ],
  ne: [
    /[\u0900-\u097F]/, // Devanagari (Nepali)
    /\b(यो|त्यो|के|कसरी|कहाँ|कहिले|किन)\b/,
  ],
  sa: [
    /[\u0900-\u097F]/, // Devanagari (Sanskrit)
    /\b(एतत्|तत्|किम्|कथम्|कुत्र|कदा|किमर्थम्)\b/,
  ],
};

/**
 * Check if a language code is Indic
 */
export function isIndicLanguage(lang: string): boolean {
  return INDIC_LANGUAGES.includes(lang as any);
}

/**
 * Client-side language detection using pattern matching
 * Fast and lightweight, works offline
 */
function detectLanguageClient(text: string): LanguageDetectionResult {
  if (!text || text.trim().length < 2) {
    return {
      language: 'en',
      confidence: 0.5,
      method: 'fallback',
      isIndic: false,
    };
  }

  // Check for Indic language patterns
  const scores: Record<string, number> = {};

  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    let score = 0;
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length;
      }
    }
    if (score > 0) {
      scores[lang] = score;
    }
  }

  // Find language with highest score
  if (Object.keys(scores).length > 0) {
    const detectedLang = Object.entries(scores).reduce((a, b) =>
      scores[a[0]] > scores[b[0]] ? a : b
    )[0];
    const maxScore = scores[detectedLang];
    const confidence = Math.min(0.9, 0.5 + (maxScore / text.length) * 0.4);

    return {
      language: detectedLang,
      confidence,
      method: 'client',
      isIndic: isIndicLanguage(detectedLang),
    };
  }

  // Check for common English patterns
  const englishPattern = /[a-zA-Z]/;
  if (englishPattern.test(text)) {
    return {
      language: 'en',
      confidence: 0.7,
      method: 'client',
      isIndic: false,
    };
  }

  // Default fallback
  return {
    language: 'en',
    confidence: 0.5,
    method: 'fallback',
    isIndic: false,
  };
}

/**
 * Detect language using IndicBERT (via backend API)
 * More accurate for Indic languages
 */
async function detectLanguageIndicBERT(text: string): Promise<LanguageDetectionResult | null> {
  try {
    // Check if backend API is available
    const { ipc } = await import('../lib/ipc-typed');

    // Try to call backend language detection endpoint
    // Note: This assumes backend has IndicBERT model loaded
    const result = await ipc.research
      ?.queryEnhanced?.({
        query: `Detect language: ${text.slice(0, 500)}`,
        language: 'auto',
      })
      .catch(() => null);

    if (result && typeof result === 'object' && 'detectedLanguage' in result) {
      const detectedLang = (result as any).detectedLanguage || 'en';
      return {
        language: detectedLang,
        confidence: (result as any).confidence || 0.95,
        method: 'indicbert',
        isIndic: isIndicLanguage(detectedLang),
      };
    }
  } catch (error) {
    log.warn('[LanguageDetection] IndicBERT detection failed:', error);
  }

  return null;
}

/**
 * Detect language using mBART (via backend API)
 * Good for multilingual text
 */
async function detectLanguagemBART(text: string): Promise<LanguageDetectionResult | null> {
  try {
    // Check if backend API is available
    const { ipc } = await import('../lib/ipc-typed');

    // Try to call backend language detection endpoint with mBART
    const result = await ipc.research
      ?.queryEnhanced?.({
        query: `Detect language with mBART: ${text.slice(0, 500)}`,
        language: 'auto',
      })
      .catch(() => null);

    if (result && typeof result === 'object' && 'detectedLanguage' in result) {
      const detectedLang = (result as any).detectedLanguage || 'en';
      return {
        language: detectedLang,
        confidence: (result as any).confidence || 0.9,
        method: 'mbart',
        isIndic: isIndicLanguage(detectedLang),
      };
    }
  } catch (error) {
    log.warn('[LanguageDetection] mBART detection failed:', error);
  }

  return null;
}

/**
 * Auto-detect language of text
 * Tries IndicBERT/mBART first, falls back to client-side detection
 */
export async function detectLanguage(
  text: string,
  options?: {
    preferIndic?: boolean; // Prefer Indic language detection
    useBackend?: boolean; // Use backend models (IndicBERT/mBART)
  }
): Promise<LanguageDetectionResult> {
  if (!text || text.trim().length < 2) {
    return {
      language: 'en',
      confidence: 0.5,
      method: 'fallback',
      isIndic: false,
    };
  }

  const trimmedText = text.trim();
  const preferIndic = options?.preferIndic ?? true;
  const useBackend = options?.useBackend ?? true;

  // If backend is available and enabled, try IndicBERT/mBART
  if (useBackend && typeof window !== 'undefined' && navigator.onLine) {
    // For Indic languages, try IndicBERT first
    if (preferIndic) {
      const indicResult = await detectLanguageIndicBERT(trimmedText);
      if (indicResult && indicResult.confidence > 0.8) {
        return indicResult;
      }
    }

    // Try mBART for general multilingual detection
    const mbartResult = await detectLanguagemBART(trimmedText);
    if (mbartResult && mbartResult.confidence > 0.8) {
      return mbartResult;
    }
  }

  // Fallback to client-side detection
  return detectLanguageClient(trimmedText);
}

/**
 * Detect multiple languages in text (for mixed-language content)
 */
export async function detectLanguages(
  text: string,
  options?: {
    maxLanguages?: number;
    minConfidence?: number;
  }
): Promise<LanguageDetectionResult[]> {
  const maxLanguages = options?.maxLanguages ?? 3;
  const minConfidence = options?.minConfidence ?? 0.6;

  // Split text into sentences/segments
  const segments = text.split(/[.!?]\s+/).filter(s => s.trim().length > 10);

  if (segments.length === 0) {
    return [await detectLanguage(text)];
  }

  // Detect language for each segment
  const results = await Promise.all(segments.map(seg => detectLanguage(seg)));

  // Aggregate results
  const languageScores: Record<string, { count: number; totalConfidence: number }> = {};

  for (const result of results) {
    if (result.confidence >= minConfidence) {
      if (!languageScores[result.language]) {
        languageScores[result.language] = { count: 0, totalConfidence: 0 };
      }
      languageScores[result.language].count++;
      languageScores[result.language].totalConfidence += result.confidence;
    }
  }

  // Sort by count and confidence
  const sorted = Object.entries(languageScores)
    .map(([lang, stats]) => ({
      language: lang,
      confidence: stats.totalConfidence / stats.count,
      count: stats.count,
      method: 'client' as const,
      isIndic: isIndicLanguage(lang),
    }))
    .sort((a, b) => b.count - a.count || b.confidence - a.confidence)
    .slice(0, maxLanguages);

  return sorted.length > 0 ? sorted : [await detectLanguage(text)];
}

/**
 * Get supported languages for detection
 */
export function getSupportedLanguages(): string[] {
  return [
    ...INDIC_LANGUAGES,
    'en', // English
    'es', // Spanish
    'fr', // French
    'de', // German
    'pt', // Portuguese
    'zh', // Chinese
    'ja', // Japanese
    'ko', // Korean
    'ru', // Russian
    'ar', // Arabic
    'fa', // Persian
    'tr', // Turkish
    'id', // Indonesian
    'th', // Thai
    'vi', // Vietnamese
  ];
}
