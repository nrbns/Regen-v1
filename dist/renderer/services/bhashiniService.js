/**
 * Bhashini API Service
 * Integration with Bhashini API for 22 Indic languages
 * Supports translation, text-to-speech (TTS), and speech-to-text (STT)
 *
 * Documentation: https://bhashini.gov.in/
 * API: https://api.bhashini.gov.in/
 */
import { log } from '../utils/logger';
// Bhashini API configuration
const BHASHINI_BASE_URL = 'https://api.bhashini.gov.in';
const BHASHINI_API_KEY = import.meta.env.VITE_BHASHINI_API_KEY || window.__BHASHINI_API_KEY;
// 22 Indic languages supported by Bhashini
export const BHASHINI_SUPPORTED_LANGUAGES = [
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
];
// Language code mapping for Bhashini API
const BHASHINI_LANGUAGE_MAP = {
    as: 'as',
    bn: 'bn',
    brx: 'brx',
    doi: 'doi',
    gom: 'gom',
    gu: 'gu',
    hi: 'hi',
    kn: 'kn',
    ks: 'ks',
    mai: 'mai',
    ml: 'ml',
    mni: 'mni',
    mr: 'mr',
    ne: 'ne',
    or: 'or',
    pa: 'pa',
    sa: 'sa',
    sat: 'sat',
    sd: 'sd',
    ta: 'ta',
    te: 'te',
    ur: 'ur',
    // Common aliases
    assamese: 'as',
    bengali: 'bn',
    bodo: 'brx',
    dogri: 'doi',
    konkani: 'gom',
    gujarati: 'gu',
    hindi: 'hi',
    kannada: 'kn',
    kashmiri: 'ks',
    maithili: 'mai',
    malayalam: 'ml',
    manipuri: 'mni',
    marathi: 'mr',
    nepali: 'ne',
    odia: 'or',
    punjabi: 'pa',
    sanskrit: 'sa',
    santali: 'sat',
    sindhi: 'sd',
    tamil: 'ta',
    telugu: 'te',
    urdu: 'ur',
};
/**
 * Normalize language code to Bhashini format
 */
function normalizeLanguageCode(lang) {
    const normalized = lang.toLowerCase().trim();
    return BHASHINI_LANGUAGE_MAP[normalized] || null;
}
/**
 * Check if language is supported by Bhashini
 */
export function isBhashiniSupported(language) {
    return normalizeLanguageCode(language) !== null;
}
/**
 * Translate text using Bhashini API
 */
export async function translateWithBhashini(request) {
    if (!BHASHINI_API_KEY || BHASHINI_API_KEY === 'your_bhashini_api_key_here') {
        log.warn('[Bhashini] API key not configured. Skipping Bhashini translation.');
        return null;
    }
    const sourceLang = normalizeLanguageCode(request.sourceLanguage);
    const targetLang = normalizeLanguageCode(request.targetLanguage);
    if (!sourceLang || !targetLang) {
        log.warn(`[Bhashini] Unsupported language pair: ${request.sourceLanguage} -> ${request.targetLanguage}`);
        return null;
    }
    if (!request.text || request.text.trim().length === 0) {
        return null;
    }
    try {
        // Bhashini Translation API endpoint
        // Note: Actual endpoint may vary - check Bhashini documentation
        const url = `${BHASHINI_BASE_URL}/services/translation`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${BHASHINI_API_KEY}`,
                Accept: 'application/json',
            },
            body: JSON.stringify({
                text: request.text,
                sourceLanguage: sourceLang,
                targetLanguage: targetLang,
            }),
        });
        if (!response.ok) {
            log.warn(`[Bhashini] Translation API request failed: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        // Parse response based on Bhashini API format
        // Note: Actual response format may vary - adjust based on documentation
        if (data.translatedText || data.output) {
            return {
                translatedText: data.translatedText || data.output || request.text,
                sourceLanguage: sourceLang,
                targetLanguage: targetLang,
                confidence: data.confidence || 0.9,
            };
        }
        return null;
    }
    catch (error) {
        log.error('[Bhashini] Translation failed:', error);
        return null;
    }
}
/**
 * Text-to-Speech using Bhashini API
 */
export async function textToSpeechWithBhashini(request) {
    if (!BHASHINI_API_KEY || BHASHINI_API_KEY === 'your_bhashini_api_key_here') {
        log.warn('[Bhashini] API key not configured. Skipping Bhashini TTS.');
        return null;
    }
    const lang = normalizeLanguageCode(request.language);
    if (!lang) {
        log.warn(`[Bhashini] Unsupported language for TTS: ${request.language}`);
        return null;
    }
    if (!request.text || request.text.trim().length === 0) {
        return null;
    }
    try {
        // Bhashini TTS API endpoint
        const url = `${BHASHINI_BASE_URL}/services/tts`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${BHASHINI_API_KEY}`,
                Accept: 'audio/mpeg, audio/wav, */*',
            },
            body: JSON.stringify({
                text: request.text,
                language: lang,
                voice: request.voice || 'default',
            }),
        });
        if (!response.ok) {
            log.warn(`[Bhashini] TTS API request failed: ${response.status} ${response.statusText}`);
            return null;
        }
        // Check if response is audio or contains audio URL
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('audio')) {
            const audioData = await response.arrayBuffer();
            return {
                audioUrl: '', // Audio returned directly
                audioData,
                format: contentType.includes('mp3') ? 'mp3' : contentType.includes('wav') ? 'wav' : 'ogg',
            };
        }
        // If response is JSON with audio URL
        const data = await response.json();
        if (data.audioUrl || data.url) {
            return {
                audioUrl: data.audioUrl || data.url,
                format: 'mp3',
            };
        }
        return null;
    }
    catch (error) {
        log.error('[Bhashini] TTS failed:', error);
        return null;
    }
}
/**
 * Speech-to-Text using Bhashini API
 */
export async function speechToTextWithBhashini(request) {
    if (!BHASHINI_API_KEY || BHASHINI_API_KEY === 'your_bhashini_api_key_here') {
        log.warn('[Bhashini] API key not configured. Skipping Bhashini STT.');
        return null;
    }
    const lang = normalizeLanguageCode(request.language);
    if (!lang) {
        log.warn(`[Bhashini] Unsupported language for STT: ${request.language}`);
        return null;
    }
    try {
        // Bhashini STT API endpoint
        const url = `${BHASHINI_BASE_URL}/services/stt`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${BHASHINI_API_KEY}`,
                Accept: 'application/json',
            },
            body: JSON.stringify({
                audioUrl: request.audioUrl,
                language: lang,
            }),
        });
        if (!response.ok) {
            log.warn(`[Bhashini] STT API request failed: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        if (data.transcribedText || data.text || data.output) {
            return {
                transcribedText: data.transcribedText || data.text || data.output || '',
                language: lang,
                confidence: data.confidence || 0.9,
            };
        }
        return null;
    }
    catch (error) {
        log.error('[Bhashini] STT failed:', error);
        return null;
    }
}
/**
 * Get list of supported languages
 */
export function getBhashiniSupportedLanguages() {
    return [...BHASHINI_SUPPORTED_LANGUAGES];
}
/**
 * Check if Bhashini API is configured
 */
export function isBhashiniConfigured() {
    return !!(BHASHINI_API_KEY &&
        BHASHINI_API_KEY !== 'your_bhashini_api_key_here' &&
        BHASHINI_API_KEY.trim().length > 0);
}
