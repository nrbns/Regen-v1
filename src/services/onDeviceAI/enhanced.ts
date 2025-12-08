/**
 * Enhanced On-Device AI Service
 * Advanced features with better error handling, model management, and fallbacks
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from '../../lib/env';

export interface ModelInfo {
  path: string;
  size_mb?: number;
  loaded_at?: number;
  context_size?: number;
  n_threads?: number;
}

export interface GenerationOptions {
  max_tokens: number;
  temperature: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  stop_sequences?: string[];
}

export interface SummarizeResult {
  summary: string;
  method: 'ondevice' | 'cloud' | 'fallback';
  confidence: number;
  model_info?: ModelInfo;
}

/**
 * Check if on-device model is available and loaded
 */
export async function checkOnDeviceModel(): Promise<{
  available: boolean;
  loaded: boolean;
  model_info?: ModelInfo;
}> {
  if (!isTauriRuntime()) {
    return { available: false, loaded: false };
  }

  try {
    const loaded = await invoke<boolean>('check_ondevice_model');
    if (!loaded) {
      return { available: false, loaded: false };
    }

    // Try to get model info
    try {
      const modelInfo = await invoke<ModelInfo>('get_model_info');
      return {
        available: true,
        loaded: true,
        model_info: modelInfo,
      };
    } catch {
      return { available: true, loaded: true };
    }
  } catch (error) {
    console.warn('[EnhancedOnDeviceAI] Check failed:', error);
    return { available: false, loaded: false };
  }
}

/**
 * Load on-device model with error handling
 */
export async function loadOnDeviceModel(
  modelPath: string,
  options?: {
    context_size?: number;
    n_threads?: number;
  }
): Promise<ModelInfo> {
  if (!isTauriRuntime()) {
    throw new Error('On-device AI only available in Tauri runtime');
  }

  try {
    // Load model
    await invoke('load_ondevice_model', { path: modelPath });

    // Configure if options provided
    if (options?.context_size) {
      await invoke('set_context_size', { contextSize: options.context_size });
    }
    if (options?.n_threads) {
      await invoke('set_threads', { nThreads: options.n_threads });
    }

    // Get model info
    const modelInfo = await invoke<ModelInfo>('get_model_info');
    return modelInfo;
  } catch (error: any) {
    throw new Error(`Failed to load model: ${error.message || error}`);
  }
}

/**
 * Enhanced summarization with multiple fallback strategies
 */
export async function summarizeWithFallbacks(
  text: string,
  options: {
    maxLength?: number;
    language?: string;
    preferOnDevice?: boolean;
  } = {}
): Promise<SummarizeResult> {
  const { maxLength = 200, language = 'en', preferOnDevice = true } = options;

  // Try on-device first if preferred
  if (preferOnDevice) {
    const { loaded } = await checkOnDeviceModel();
    if (loaded) {
      try {
        const result = await summarizeOnDevice(text, { maxLength, language });
        return {
          summary: result.summary,
          method: 'ondevice',
          confidence: 0.85,
          model_info: result.model_info,
        };
      } catch (error) {
        console.warn('[EnhancedOnDeviceAI] On-device summarization failed:', error);
      }
    }
  }

  // Fallback to cloud
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';
    const response = await fetch(`${API_BASE}/api/summarize/v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [],
        text,
        maxLength,
        language,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        summary: data.summary || data.summaries?.[0]?.summary || '',
        method: 'cloud',
        confidence: 0.9,
      };
    }
  } catch (error) {
    console.warn('[EnhancedOnDeviceAI] Cloud summarization failed:', error);
  }

  // Final fallback: extractive summary
  return {
    summary: extractiveSummary(text, maxLength),
    method: 'fallback',
    confidence: 0.5,
  };
}

/**
 * Summarize using on-device model
 */
async function summarizeOnDevice(
  text: string,
  options: { maxLength: number; language: string }
): Promise<{ summary: string; model_info?: ModelInfo }> {
  if (!isTauriRuntime()) {
    throw new Error('On-device AI only available in Tauri runtime');
  }

  const generationOptions: GenerationOptions = {
    max_tokens: options.maxLength * 2, // Rough token estimate
    temperature: 0.3, // Lower temp for summaries
    top_p: 0.9,
    repeat_penalty: 1.1,
  };

  const prompt = `Summarize the following text in ${options.language} in approximately ${options.maxLength} words:\n\n${text}\n\nSummary:`;

  const summary = await invoke<string>('ondevice_generate', {
    prompt,
    options: generationOptions,
  });

  const modelInfo = await invoke<ModelInfo>('get_model_info').catch(() => undefined);

  return {
    summary,
    model_info: modelInfo,
  };
}

/**
 * Extractive summary (simple fallback)
 */
function extractiveSummary(text: string, maxLength: number): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/);
  const targetWords = Math.min(maxLength, Math.floor(words.length * 0.3));

  // Select sentences until we reach target length
  let summary: string[] = [];
  let wordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length;
    if (wordCount + sentenceWords <= targetWords) {
      summary.push(sentence.trim());
      wordCount += sentenceWords;
    } else {
      break;
    }
  }

  return summary.join('. ') + (summary.length < sentences.length ? '...' : '');
}

/**
 * Get model memory usage
 */
export async function getModelMemoryUsageMB(): Promise<number> {
  if (!isTauriRuntime()) {
    return 0;
  }

  try {
    return await invoke<number>('get_model_memory_usage_mb');
  } catch {
    return 0;
  }
}

/**
 * Unload model to free memory
 */
export async function unloadModel(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    await invoke('unload_ondevice_model');
  } catch (error) {
    console.warn('[EnhancedOnDeviceAI] Failed to unload model:', error);
  }
}


