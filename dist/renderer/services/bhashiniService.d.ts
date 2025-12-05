/**
 * Bhashini API Service
 * Integration with Bhashini API for 22 Indic languages
 * Supports translation, text-to-speech (TTS), and speech-to-text (STT)
 *
 * Documentation: https://bhashini.gov.in/
 * API: https://api.bhashini.gov.in/
 */
export declare const BHASHINI_SUPPORTED_LANGUAGES: readonly ["as", "bn", "brx", "doi", "gom", "gu", "hi", "kn", "ks", "mai", "ml", "mni", "mr", "ne", "or", "pa", "sa", "sat", "sd", "ta", "te", "ur"];
export type BhashiniLanguage = (typeof BHASHINI_SUPPORTED_LANGUAGES)[number];
export interface BhashiniTranslationRequest {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
}
export interface BhashiniTranslationResponse {
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
    confidence?: number;
}
export interface BhashiniTTSRequest {
    text: string;
    language: string;
    voice?: string;
}
export interface BhashiniTTSResponse {
    audioUrl: string;
    audioData?: ArrayBuffer;
    format: 'mp3' | 'wav' | 'ogg';
}
export interface BhashiniSTTRequest {
    audioUrl: string;
    language: string;
}
export interface BhashiniSTTResponse {
    transcribedText: string;
    language: string;
    confidence?: number;
}
/**
 * Check if language is supported by Bhashini
 */
export declare function isBhashiniSupported(language: string): boolean;
/**
 * Translate text using Bhashini API
 */
export declare function translateWithBhashini(request: BhashiniTranslationRequest): Promise<BhashiniTranslationResponse | null>;
/**
 * Text-to-Speech using Bhashini API
 */
export declare function textToSpeechWithBhashini(request: BhashiniTTSRequest): Promise<BhashiniTTSResponse | null>;
/**
 * Speech-to-Text using Bhashini API
 */
export declare function speechToTextWithBhashini(request: BhashiniSTTRequest): Promise<BhashiniSTTResponse | null>;
/**
 * Get list of supported languages
 */
export declare function getBhashiniSupportedLanguages(): BhashiniLanguage[];
/**
 * Check if Bhashini API is configured
 */
export declare function isBhashiniConfigured(): boolean;
