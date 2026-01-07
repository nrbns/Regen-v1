/**
 * Local Model Service
 * Unified service for on-device model management and inference
 * Automatically selects best runtime: WebGPU → WASM → Native → Cloud
 */

import {
  detectHardwareCapabilities,
  getAvailableModels,
  type ModelRecommendation,
} from '../lib/hardware-detection';
import {
  getUnifiedModelRunner,
  summarizeWithLocalOrEdge,
} from '../lib/model-runner/unified-runner';
// import { isTauriRuntime } from '../lib/env'; // Unused

export interface ModelInfo {
  name: string;
  path: string;
  sizeGB: number;
  quantization: string;
  loaded: boolean;
  runtime: 'webgpu' | 'wasm' | 'native' | 'cloud';
}

export interface SummarizeOptions {
  maxLength?: number;
  language?: string;
  preferLocal?: boolean;
}

export interface SummarizeResult {
  summary: string;
  method: 'webgpu' | 'wasm' | 'native' | 'cloud';
  latency: number;
  fallback?: boolean;
}

/**
 * Initialize local model service
 */
export async function initializeLocalModelService(): Promise<{
  capabilities: any;
  recommendedModel: ModelRecommendation;
  runtime: 'webgpu' | 'wasm' | 'native' | 'cloud';
}> {
  const capabilities = detectHardwareCapabilities();
  const runner = getUnifiedModelRunner();
  await runner.initialize();
  const runtime = runner.getCurrentRuntime();

  return {
    capabilities,
    recommendedModel: capabilities.recommendedModel,
    runtime,
  };
}

/**
 * Load recommended model
 */
export async function loadRecommendedModel(): Promise<ModelInfo> {
  const capabilities = detectHardwareCapabilities();
  const recommended = capabilities.recommendedModel;
  const runner = getUnifiedModelRunner();

  await runner.initialize();
  await runner.loadModel({
    modelPath: recommended.downloadUrl || '',
    modelName: recommended.modelName,
    quantization: recommended.quantization,
    contextSize: 2048,
  });

  return {
    name: recommended.modelName,
    path: recommended.downloadUrl || '',
    sizeGB: recommended.sizeGB,
    quantization: recommended.quantization,
    loaded: true,
    runtime: runner.getCurrentRuntime(),
  };
}

/**
 * Load specific model
 */
export async function loadModel(modelPath: string, modelName: string): Promise<ModelInfo> {
  const runner = getUnifiedModelRunner();
  await runner.initialize();

  const model = getAvailableModels().find(m => m.modelName === modelName);
  if (!model) {
    throw new Error(`Model not found: ${modelName}`);
  }

  await runner.loadModel({
    modelPath,
    modelName,
    quantization: model.quantization,
    contextSize: 2048,
  });

  return {
    name: modelName,
    path: modelPath,
    sizeGB: model.sizeGB,
    quantization: model.quantization,
    loaded: true,
    runtime: runner.getCurrentRuntime(),
  };
}

/**
 * Summarize text with automatic runtime selection
 */
export async function summarizeLocalOrEdge(
  text: string,
  options: SummarizeOptions = {}
): Promise<SummarizeResult> {
  const { maxLength = 200, language = 'en', preferLocal = true } = options;

  if (preferLocal) {
    try {
      const summary = await summarizeWithLocalOrEdge(text, language);
      const runner = getUnifiedModelRunner();

      // Measure latency (approximate)
      const startTime = performance.now();
      await runner.generate({
        prompt: `Summarize: ${text}`,
        maxTokens: maxLength,
      });
      const latency = performance.now() - startTime;

      return {
        summary,
        method: runner.getCurrentRuntime(),
        latency,
        fallback: false,
      };
    } catch (error) {
      console.warn('[LocalModelService] Local summarization failed, using cloud:', error);
    }
  }

  // Fallback to cloud
  try {
    const startTime = performance.now();
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';
    const response = await fetch(`${API_BASE}/api/summarize/v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        maxLength,
        language,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const latency = performance.now() - startTime;
      return {
        summary: data.summary || data.text || '',
        method: 'cloud',
        latency,
        fallback: true,
      };
    }
  } catch (error) {
    console.error('[LocalModelService] Cloud fallback failed:', error);
  }

  // Final fallback
  const words = text.split(/\s+/);
  const summary = words.slice(0, maxLength).join(' ') + (words.length > maxLength ? '...' : '');
  return {
    summary,
    method: 'cloud',
    latency: 0,
    fallback: true,
  };
}

/**
 * Get current model info
 */
export async function getCurrentModelInfo(): Promise<ModelInfo | null> {
  const runner = getUnifiedModelRunner();
  const modelConfig = runner.getModelInfo();

  if (!modelConfig) {
    return null;
  }

  return {
    name: modelConfig.modelName,
    path: modelConfig.modelPath,
    sizeGB: 0, // Would be from model recommendation
    quantization: modelConfig.quantization,
    loaded: true,
    runtime: runner.getCurrentRuntime(),
  };
}

/**
 * Unload current model
 */
export async function unloadModel(): Promise<void> {
  const runner = getUnifiedModelRunner();
  await runner.unloadModel();
}

/**
 * Check if local model is available
 */
export async function isLocalModelAvailable(): Promise<boolean> {
  const runner = getUnifiedModelRunner();
  await runner.initialize();
  const runtime = runner.getCurrentRuntime();
  return runtime !== 'cloud';
}
