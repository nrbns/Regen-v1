/**
 * On-Device AI Service
 * Uses Tauri native bridge for llama.cpp inference with cloud fallback
 */

import { isTauriRuntime } from '../lib/env';
import { invoke } from '@tauri-apps/api/core';

export interface SummarizeOptions {
  maxLength?: number;
  language?: string;
  minLength?: number;
}

export interface SummarizeResult {
  summary: string;
  method: 'ondevice' | 'cloud' | 'fallback';
  confidence: number;
  latency?: number;
}

export interface TranslateOptions {
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface TranslateResult {
  translated: string;
  method: 'ondevice' | 'cloud' | 'fallback';
  confidence: number;
}

/**
 * Check if on-device model is available
 */
export async function checkOnDeviceModel(): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false; // Web builds don't have native bridge
  }

  try {
    return await invoke<boolean>('check_ondevice_model');
  } catch (error) {
    console.warn('[OnDeviceAI] Model check failed:', error);
    return false;
  }
}

/**
 * Load on-device model from path
 */
export async function loadOnDeviceModel(modelPath: string): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error('On-device model only available in Tauri builds');
  }

  try {
    await invoke('load_ondevice_model', { modelPath });
  } catch (error: any) {
    throw new Error(`Failed to load model: ${error.message}`);
  }
}

/**
 * Summarize text using on-device model with cloud fallback
 */
export async function summarizeOnDevice(
  text: string,
  options: SummarizeOptions = {}
): Promise<SummarizeResult> {
  const startTime = Date.now();

  // Try on-device model first (if in Tauri)
  if (isTauriRuntime()) {
    try {
      const result = await invoke<{ summary: string; method: string; confidence: number }>(
        'ondevice_summarize',
        {
          request: {
            text,
            max_length: options.maxLength || 200,
            language: options.language || 'en',
          },
        }
      );

      return {
        summary: result.summary,
        method: 'ondevice',
        confidence: result.confidence,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      console.warn('[OnDeviceAI] On-device summarize failed, falling back:', error);
      // Fall through to cloud fallback
    }
  }

  // Fallback to cloud LLM
  try {
    const { sendPrompt } = await import('../core/llm/adapter');
    const response = await sendPrompt(
      `Summarize the following text in ${options.maxLength || 200} words:\n\n${text}\n\nSummary:`,
      {
        maxTokens: (options.maxLength || 200) * 2,
        temperature: 0.3,
      }
    );

    return {
      summary: response.text,
      method: 'cloud',
      confidence: 0.85,
      latency: Date.now() - startTime,
    };
  } catch (error) {
    console.warn('[OnDeviceAI] Cloud summarize failed, using fallback:', error);

    // Final fallback: simple extraction
    const words = text.split(/\s+/);
    const maxWords = options.maxLength || 200;
    const summary = words.slice(0, maxWords).join(' ') + (words.length > maxWords ? '...' : '');

    return {
      summary,
      method: 'fallback',
      confidence: 0.5,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Translate text using on-device model with cloud fallback
 */
export async function translateOnDevice(
  text: string,
  options: TranslateOptions
): Promise<TranslateResult> {
  // Try on-device model first
  if (isTauriRuntime()) {
    try {
      const result = await invoke<{ translated: string; method: string; confidence: number }>(
        'ondevice_translate',
        {
          request: {
            text,
            target_language: options.targetLanguage,
            source_language: options.sourceLanguage,
          },
        }
      );

      return {
        translated: result.translated,
        method: 'ondevice',
        confidence: result.confidence,
      };
    } catch (error) {
      console.warn('[OnDeviceAI] On-device translate failed, falling back:', error);
    }
  }

  // Fallback to cloud translation
  try {
    const { sendPrompt } = await import('../core/llm/adapter');
    const response = await sendPrompt(
      `Translate the following text to ${options.targetLanguage}:\n\n${text}\n\nTranslation:`,
      {
        maxTokens: text.length * 2,
        temperature: 0.4,
      }
    );

    return {
      translated: response.text,
      method: 'cloud',
      confidence: 0.8,
    };
  } catch {
    // Final fallback: return original text
    return {
      translated: text,
      method: 'fallback',
      confidence: 0.3,
    };
  }
}

/**
 * Detect intent/classification using on-device model
 */
export async function detectIntentOnDevice(text: string): Promise<string> {
  if (isTauriRuntime()) {
    try {
      return await invoke<string>('ondevice_detect_intent', { text });
    } catch (error) {
      console.warn('[OnDeviceAI] Intent detection failed:', error);
    }
  }

  // Fallback: simple keyword-based detection
  const lowerText = text.toLowerCase();
  if (lowerText.includes('search') || lowerText.includes('find')) return 'search';
  if (lowerText.includes('summarize') || lowerText.includes('summary')) return 'summarize';
  if (lowerText.includes('translate')) return 'translate';
  if (lowerText.includes('?') || lowerText.startsWith('what') || lowerText.startsWith('how'))
    return 'question';
  if (
    lowerText.includes('do') ||
    lowerText.includes('execute') ||
    lowerText.includes('run') ||
    lowerText.includes('open')
  )
    return 'command';

  return 'unknown';
}

/**
 * Get recommended model path based on system capabilities
 */
export function getRecommendedModelPath(): string {
  // For now, return common model paths
  // In production, this would check system RAM, disk space, etc.
  const models = [
    'models/phi-3-mini.gguf', // ~2GB, good for most systems
    'models/tinyllama.gguf', // ~600MB, for low-RAM systems
    'models/llama-3.2-3b.gguf', // ~2GB, multilingual
  ];

  return models[0]; // Default to phi-3-mini
}
