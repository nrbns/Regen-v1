/**
 * Ollama Pre-connect Service - Telepathy Upgrade Phase 3
 * Pre-connect Ollama on app start to eliminate first-request latency
 */

import { invoke } from '@tauri-apps/api/core';

let preconnectPromise: Promise<boolean> | null = null;
let isPreconnected = false;

/**
 * Pre-connect to Ollama on app startup
 * This eliminates the first-request latency when embedding is needed
 */
export async function preconnectOllama(): Promise<boolean> {
  // Return cached promise if already connecting
  if (preconnectPromise) {
    return preconnectPromise;
  }

  // Return immediately if already connected
  if (isPreconnected) {
    return true;
  }

  preconnectPromise = (async () => {
    try {
      console.log('[OllamaPreconnect] Starting pre-connection...');

      // Check if Ollama is available
      const isAvailable = await invoke<boolean>('check_ollama_status').catch(() => false);

      if (!isAvailable) {
        console.warn('[OllamaPreconnect] Ollama not available, skipping pre-connect');
        return false;
      }

      // Warm up connection by calling a lightweight endpoint
      // This primes the connection pool and loads the model into memory if needed
      await invoke<number[]>('embed_text', {
        text: 'warmup',
        model: 'nomic-embed-text:4bit',
      }).catch(() => {
        // Ignore errors - this is just a warmup
        // If model doesn't exist, that's okay
      });

      isPreconnected = true;
      console.log('[OllamaPreconnect] Pre-connection complete');
      return true;
    } catch (error) {
      console.warn('[OllamaPreconnect] Pre-connection failed (non-critical)', error);
      return false;
    } finally {
      preconnectPromise = null;
    }
  })();

  return preconnectPromise;
}

/**
 * Check if Ollama is pre-connected
 */
export function isOllamaPreconnected(): boolean {
  return isPreconnected;
}
