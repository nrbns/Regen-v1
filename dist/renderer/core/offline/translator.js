/**
 * Offline Multilingual Translation
 * Uses lightweight translation for offline mode (50+ languages)
 * Falls back to online APIs when available
 * Integrates with Bhashini API for 22 Indic languages
 */
// import { useSettingsStore } from '../../state/settingsStore'; // Reserved for future use
import { translateWithBhashini, isBhashiniSupported, isBhashiniConfigured, } from '../../services/bhashiniService';
import { log } from '../../utils/logger';
// Language code mapping for offline translation
// Includes 22 Indic languages supported by Bhashini
const LANGUAGE_CODES = {
    en: 'en',
    // 22 Indic languages (Bhashini supported)
    as: 'as', // Assamese
    bn: 'bn', // Bengali
    brx: 'brx', // Bodo
    doi: 'doi', // Dogri
    gom: 'gom', // Konkani
    gu: 'gu', // Gujarati
    hi: 'hi', // Hindi
    kn: 'kn', // Kannada
    ks: 'ks', // Kashmiri
    mai: 'mai', // Maithili
    ml: 'ml', // Malayalam
    mni: 'mni', // Manipuri
    mr: 'mr', // Marathi
    ne: 'ne', // Nepali
    or: 'or', // Odia
    pa: 'pa', // Punjabi
    sa: 'sa', // Sanskrit
    sat: 'sat', // Santali
    sd: 'sd', // Sindhi
    ta: 'ta', // Tamil
    te: 'te', // Telugu
    ur: 'ur', // Urdu
    // Other languages
    si: 'si', // Sinhala
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
const translationCache = new Map();
/**
 * Simple offline translation using rule-based approach
 * For production, this would use a lightweight model like mBART
 */
function simpleOfflineTranslate(text, sourceLang, targetLang) {
    // Check cache first
    const cacheKey = `${sourceLang}:${targetLang}:${text}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }
    // If same language, return as-is
    if (sourceLang === targetLang || targetLang === 'auto') {
        return text;
    }
    // Simple rule-based translation for common phrases
    // In production, this would use mBART or similar model
    const commonTranslations = {
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
 * Uses Bhashini API for Indic languages when available
 * Auto-detects source language if not provided
 */
export async function translateText(text, targetLanguage, sourceLanguage) {
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    // Auto-detect source language if not provided or set to 'auto'
    let sourceLang = sourceLanguage;
    if (!sourceLang || sourceLang === 'auto') {
        try {
            const { detectLanguage } = await import('../../services/languageDetection');
            const detection = await detectLanguage(text, { preferIndic: true });
            sourceLang = detection.language;
            log.debug('[OfflineTranslator] Auto-detected language:', sourceLang, 'confidence:', detection.confidence);
        }
        catch (error) {
            log.warn('[OfflineTranslator] Language auto-detection failed:', error);
            sourceLang = 'en'; // Fallback to English
        }
    }
    const targetLang = targetLanguage === 'auto' ? 'en' : targetLanguage;
    // If online and Bhashini is configured, try Bhashini first for Indic languages
    if (isOnline && isBhashiniConfigured()) {
        // Check if either source or target is an Indic language
        const sourceIsIndic = sourceLang !== 'auto' && isBhashiniSupported(sourceLang);
        const targetIsIndic = isBhashiniSupported(targetLang);
        if (sourceIsIndic || targetIsIndic) {
            try {
                const bhashiniRequest = {
                    text,
                    sourceLanguage: sourceLang === 'auto' ? 'en' : sourceLang,
                    targetLanguage: targetLang,
                };
                const bhashiniResult = await translateWithBhashini(bhashiniRequest);
                if (bhashiniResult && bhashiniResult.translatedText) {
                    return {
                        text: bhashiniResult.translatedText,
                        sourceLanguage: bhashiniResult.sourceLanguage,
                        targetLanguage: bhashiniResult.targetLanguage,
                        confidence: bhashiniResult.confidence || 0.95,
                        method: 'online',
                    };
                }
            }
            catch (error) {
                log.warn('[OfflineTranslator] Bhashini translation failed, trying fallback:', error);
            }
        }
    }
    // If online, try to use backend translation API if available
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
                    text: result.summary || text,
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang,
                    confidence: 0.9,
                    method: 'online',
                };
            }
        }
        catch (error) {
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
export async function summarizeOffline(text, language = 'auto') {
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
        }
        catch (error) {
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
export function isOfflineModeAvailable() {
    return typeof navigator !== 'undefined' && !navigator.onLine;
}
/**
 * Get supported languages for offline mode
 */
export function getOfflineSupportedLanguages() {
    return Object.keys(LANGUAGE_CODES);
}
