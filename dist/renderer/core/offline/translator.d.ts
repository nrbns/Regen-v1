/**
 * Offline Multilingual Translation
 * Uses lightweight translation for offline mode (50+ languages)
 * Falls back to online APIs when available
 * Integrates with Bhashini API for 22 Indic languages
 */
export interface TranslationResult {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
    confidence: number;
    method: 'offline' | 'online' | 'cache';
}
/**
 * Translate text offline or online
 * Uses Bhashini API for Indic languages when available
 * Auto-detects source language if not provided
 */
export declare function translateText(text: string, targetLanguage: string, sourceLanguage?: string): Promise<TranslationResult>;
/**
 * Summarize text offline
 */
export declare function summarizeOffline(text: string, language?: string): Promise<string>;
/**
 * Check if offline mode is available
 */
export declare function isOfflineModeAvailable(): boolean;
/**
 * Get supported languages for offline mode
 */
export declare function getOfflineSupportedLanguages(): string[];
