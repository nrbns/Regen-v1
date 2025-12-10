/**
 * Ollama Pre-connect Service - Telepathy Upgrade Phase 3
 * Pre-connect Ollama on app start to eliminate first-request latency
 */

import { invoke } from '@tauri-apps/api/core';

type OllamaStatus = {
  available: boolean;
  gpu?: {
    detected: boolean;
    name?: string;
  };
};

let preconnectPromise: Promise<OllamaStatus> | null = null;
let cachedStatus: OllamaStatus = { available: false };

/**
 * Pre-connect to Ollama on app startup
 * This eliminates the first-request latency when embedding is needed
 */
export async function preconnectOllama(): Promise<OllamaStatus> {
  // Return cached promise if already connecting
  if (preconnectPromise) {
    return preconnectPromise;
  }

  // Return immediately if already connected
  if (cachedStatus.available) {
    return cachedStatus;
  }

  preconnectPromise = (async () => {
    try {
      console.log('[OllamaPreconnect] Starting pre-connection...');

      // Check if Ollama is available
      const status = await invoke<OllamaStatus>('check_ollama_status').catch(() => ({
        available: false,
      }));
      cachedStatus = status;

      if (!status.available) {
        console.warn('[OllamaPreconnect] Ollama not available, skipping pre-connect');
        return status;
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

      console.log('[OllamaPreconnect] Pre-connection complete');
      return status;
    } catch (error) {
      console.warn('[OllamaPreconnect] Pre-connection failed (non-critical)', error);
      return cachedStatus;
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
  return cachedStatus.available;
}

/**
 * Get the latest Ollama status (includes GPU detection when available)
 */
export function getOllamaStatus(): OllamaStatus {
  return cachedStatus;
}
