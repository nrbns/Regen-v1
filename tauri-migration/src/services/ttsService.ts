/**
 * Text-to-Speech Service
 * Provides TTS functionality using Bhashini, Google Cloud, or Web Speech API
 */

import { generateTTS, type TTSResponse } from './bhashiniService';

const CACHE_KEY_PREFIX = 'regen:tts:';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface TTSCacheEntry {
  audioData: string; // Base64 encoded
  language: string;
  text: string;
  timestamp: number;
}

/**
 * Generate TTS audio with caching
 */
export async function speakText(
  text: string,
  language: string = 'en',
  voice: 'male' | 'female' = 'female'
): Promise<TTSResponse> {
  try {
    // Check cache first
    const cached = getCachedTTS(text, language);
    if (cached) {
      // Convert base64 back to ArrayBuffer
      const binaryString = atob(cached.audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return { audioData: bytes.buffer };
    }

    // Generate new TTS
    const result = await generateTTS({ text, language, voice });

    // Cache the result
    if (result.audioData) {
      cacheTTS(text, language, result.audioData);
    }

    return result;
  } catch (error) {
    console.error('[TTSService] TTS generation failed:', error);
    // Fallback to Web Speech API
    return speakWithWebAPI(text, language);
  }
}

/**
 * Play TTS audio
 */
export async function playTTS(
  text: string,
  language: string = 'en',
  voice: 'male' | 'female' = 'female'
): Promise<void> {
  try {
    const result = await speakText(text, language, voice);

    if (result.audioData) {
      // Create audio element and play
      const audioBlob = new Blob([result.audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = reject;
        audio.play();
      });
    } else {
      // Fallback to Web Speech API
      await speakWithWebAPI(text, language);
    }
  } catch (error) {
    console.error('[TTSService] Play failed:', error);
    // Final fallback
    await speakWithWebAPI(text, language);
  }
}

/**
 * Speak using Web Speech API (browser fallback)
 */
async function speakWithWebAPI(text: string, language: string): Promise<TTSResponse> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Text-to-Speech not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language || 'en';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => resolve({});
    utterance.onerror = error => reject(error);

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Cache TTS audio data
 */
function cacheTTS(text: string, language: string, audioData: ArrayBuffer): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    // Convert ArrayBuffer to base64 for storage
    const bytes = new Uint8Array(audioData);
    const binaryString = String.fromCharCode(...bytes);
    const base64 = btoa(binaryString);

    const entry: TTSCacheEntry = {
      audioData: base64,
      language,
      text,
      timestamp: Date.now(),
    };

    const cacheKey = `${CACHE_KEY_PREFIX}${hashText(text)}:${language}`;
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.error('[TTSService] Cache failed:', error);
  }
}

/**
 * Get cached TTS audio
 */
function getCachedTTS(text: string, language: string): TTSCacheEntry | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const cacheKey = `${CACHE_KEY_PREFIX}${hashText(text)}:${language}`;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const entry: TTSCacheEntry = JSON.parse(cached);

    // Check if cache is expired
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return entry;
  } catch (error) {
    console.error('[TTSService] Cache read failed:', error);
    return null;
  }
}

/**
 * Hash text for cache key
 */
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Clear TTS cache
 */
export function clearTTSCache(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('[TTSService] Cache clear failed:', error);
  }
}
