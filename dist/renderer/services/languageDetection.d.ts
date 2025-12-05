/**
 * Language Auto-Detection Service
 * Uses IndicBERT/mBART models for accurate language detection
 * Falls back to lightweight client-side detection when backend unavailable
 *
 * Supports 22 Indic languages + 100+ global languages
 */
export interface LanguageDetectionResult {
    language: string;
    confidence: number;
    method: 'indicbert' | 'mbart' | 'client' | 'fallback';
    isIndic: boolean;
}
/**
 * Check if a language code is Indic
 */
export declare function isIndicLanguage(lang: string): boolean;
/**
 * Auto-detect language of text
 * Tries IndicBERT/mBART first, falls back to client-side detection
 */
export declare function detectLanguage(text: string, options?: {
    preferIndic?: boolean;
    useBackend?: boolean;
}): Promise<LanguageDetectionResult>;
/**
 * Detect multiple languages in text (for mixed-language content)
 */
export declare function detectLanguages(text: string, options?: {
    maxLanguages?: number;
    minConfidence?: number;
}): Promise<LanguageDetectionResult[]>;
/**
 * Get supported languages for detection
 */
export declare function getSupportedLanguages(): string[];
