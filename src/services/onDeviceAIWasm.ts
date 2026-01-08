/**
 * On-Device AI Service (WASM Fallback for Web Builds)
 * Uses ggml-wasm for browser-based inference when Tauri bridge unavailable
 */

// This module provides WASM-based fallback for web builds
// Actual WASM implementation would use @mlc-ai/web-llm or similar

export interface SummarizeOptions {
  maxLength?: number;
  language?: string;
}

export interface SummarizeResult {
  summary: string;
  method: 'wasm' | 'cloud' | 'fallback';
  confidence: number;
}

/**
 * Check if WASM model is available
 * In production, this would check if WASM model is loaded
 */
export async function checkWasmModel(): Promise<boolean> {
  // TODO: Check if WASM model is loaded in browser
  // For now, return false (WASM implementation pending)
  return false;
}

/**
 * Load WASM model (placeholder for future implementation)
 */
export async function loadWasmModel(_modelUrl: string): Promise<void> {
  // TODO: Implement WASM model loading
  // Would use @mlc-ai/web-llm or similar library
  throw new Error('WASM model loading not yet implemented');
}

/**
 * Summarize using WASM model (placeholder)
 */
export async function summarizeWasm(
  text: string,
  options: SummarizeOptions = {}
): Promise<SummarizeResult> {
  // TODO: Implement WASM-based summarization
  // For now, return fallback
  const words = text.split(/\s+/);
  const maxWords = options.maxLength || 200;
  const summary = words.slice(0, maxWords).join(' ') + (words.length > maxWords ? '...' : '');

  return {
    summary,
    method: 'fallback',
    confidence: 0.5,
  };
}

/**
 * Get unified on-device AI service (chooses Tauri or WASM)
 */
export async function getOnDeviceAIService() {
  const { isTauriRuntime } = await import('../lib/env');

  if (isTauriRuntime()) {
    // Use Tauri native bridge
    return await import('./onDeviceAI');
  } else {
    // Use WASM fallback (when implemented)
    return await import('./onDeviceAIWasm');
  }
}
