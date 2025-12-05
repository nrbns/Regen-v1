/**
 * Real-time Multi-Language AI
 * Supports Hindi, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati
 * Instant translation, search, summarization
 */
export type SupportedLanguage = 'hi' | 'ta' | 'te' | 'ml' | 'kn' | 'bn' | 'mr' | 'gu' | 'en' | 'auto';
export interface LanguageMetadata {
    code: string;
    name: string;
    nativeName: string;
    locale: string;
    script: string;
}
export declare const LANGUAGE_METADATA: Record<SupportedLanguage, LanguageMetadata>;
declare class MultiLanguageAI {
    private cache;
    /**
     * Detect language of text
     */
    detectLanguage(text: string): Promise<SupportedLanguage>;
    /**
     * Heuristic language detection (fallback)
     */
    private heuristicDetect;
    /**
     * Translate text to target language
     */
    translate(text: string, targetLang: SupportedLanguage, sourceLang?: SupportedLanguage): Promise<string>;
    /**
     * Search in multiple languages
     */
    search(query: string, languages?: SupportedLanguage[], options?: {
        limit?: number;
    }): Promise<Array<{
        language: SupportedLanguage;
        results: unknown[];
    }>>;
    /**
     * Summarize in target language
     */
    summarize(text: string, targetLang?: SupportedLanguage, options?: {
        maxLength?: number;
    }): Promise<string>;
    /**
     * Perform search (placeholder - integrate with your search service)
     */
    private performSearch;
    /**
     * Get language metadata
     */
    getLanguageMetadata(lang: SupportedLanguage): LanguageMetadata;
    /**
     * Get all supported languages
     */
    getSupportedLanguages(): SupportedLanguage[];
    /**
     * Clear cache
     */
    clearCache(): void;
}
export declare const multiLanguageAI: MultiLanguageAI;
export {};
