/**
 * Unified Model Runner
 * Automatically selects best runtime (WebGPU → WASM → Native → Cloud)
 */

import { detectHardwareCapabilities, getRecommendedRuntime } from '../hardware-detection';
import { getWASMLlamaRunner, type WASMLlamaRunner } from './wasm-llama-runner';
import { getWebGPULlamaRunner, type WebGPULlamaRunner } from './webgpu-llama-runner';
import { isTauriRuntime } from '../env';

export interface ModelConfig {
  modelPath: string;
  modelName: string;
  quantization: 'q4' | 'q8' | 'f16';
  contextSize?: number;
  threads?: number;
}

export interface GenerationOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface GenerationResult {
  text: string;
  tokens: number;
  duration: number;
  method: 'webgpu' | 'wasm' | 'native' | 'cloud';
  fallback?: boolean;
}

type TokenCallback = (token: string) => void;

/**
 * Unified model runner that selects best available runtime
 */
export class UnifiedModelRunner {
  private currentRuntime: 'webgpu' | 'wasm' | 'native' | 'cloud' = 'cloud';
  private modelConfig: ModelConfig | null = null;
  private wasmRunner: WASMLlamaRunner | null = null;
  private webgpuRunner: WebGPULlamaRunner | null = null;

  /**
   * Initialize and select best runtime
   */
  async initialize(): Promise<void> {
    const capabilities = detectHardwareCapabilities();
    this.currentRuntime = getRecommendedRuntime(capabilities);

    console.log('[UnifiedModelRunner] Selected runtime:', this.currentRuntime);

    // Initialize appropriate runner
    switch (this.currentRuntime) {
      case 'webgpu':
        this.webgpuRunner = getWebGPULlamaRunner();
        const webgpuAvailable = await this.webgpuRunner.checkAvailability();
        if (!webgpuAvailable) {
          console.warn('[UnifiedModelRunner] WebGPU not available, falling back to WASM');
          this.currentRuntime = 'wasm';
          this.wasmRunner = getWASMLlamaRunner();
        }
        break;

      case 'wasm':
        this.wasmRunner = getWASMLlamaRunner();
        const wasmAvailable = await this.wasmRunner.checkAvailability();
        if (!wasmAvailable) {
          console.warn('[UnifiedModelRunner] WASM not available, falling back to cloud');
          this.currentRuntime = 'cloud';
        }
        break;

      case 'native':
        // Native runner handled via Tauri
        if (!isTauriRuntime()) {
          console.warn('[UnifiedModelRunner] Tauri not available, falling back');
          this.currentRuntime = capabilities.webgpu ? 'webgpu' : 'wasm';
          if (this.currentRuntime === 'webgpu') {
            this.webgpuRunner = getWebGPULlamaRunner();
          } else {
            this.wasmRunner = getWASMLlamaRunner();
          }
        }
        break;

      default:
        this.currentRuntime = 'cloud';
    }
  }

  /**
   * Load model using best available runtime
   */
  async loadModel(config: ModelConfig): Promise<void> {
    this.modelConfig = config;

    try {
      switch (this.currentRuntime) {
        case 'webgpu':
          if (this.webgpuRunner) {
            await this.webgpuRunner.loadModel(config);
            return;
          }
          // Fallback to WASM
          this.currentRuntime = 'wasm';
          this.wasmRunner = getWASMLlamaRunner();
          await this.wasmRunner.loadModel(config);
          return;

        case 'wasm':
          if (this.wasmRunner) {
            await this.wasmRunner.loadModel(config);
            return;
          }
          throw new Error('WASM runner not available');

        case 'native':
          // Use Tauri native bridge
          if (isTauriRuntime()) {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('load_ondevice_model', { modelPath: config.modelPath });
            return;
          }
          // Fallback
          this.currentRuntime = 'wasm';
          this.wasmRunner = getWASMLlamaRunner();
          await this.wasmRunner.loadModel(config);
          return;

        default:
          throw new Error('No local runtime available. Cloud fallback required.');
      }
    } catch (error) {
      console.error('[UnifiedModelRunner] Failed to load model:', error);
      throw error;
    }
  }

  /**
   * Generate text with automatic fallback
   */
  async generate(
    options: GenerationOptions,
    onToken?: TokenCallback
  ): Promise<GenerationResult> {
    const startTime = performance.now();

    // Try local runtime first
    try {
      switch (this.currentRuntime) {
        case 'webgpu':
          if (this.webgpuRunner) {
            const result = await this.webgpuRunner.generate(options, onToken);
            return {
              ...result,
              method: 'webgpu',
            };
          }
          break;

        case 'wasm':
          if (this.wasmRunner) {
            const result = await this.wasmRunner.generate(options, onToken);
            return {
              ...result,
              method: 'wasm',
            };
          }
          break;

        case 'native':
          if (isTauriRuntime()) {
            const { invoke } = await import('@tauri-apps/api/core');
            const result = await invoke('ondevice_generate', {
              prompt: options.prompt,
              options: {
                max_tokens: options.maxTokens || 256,
                temperature: options.temperature || 0.7,
                top_p: options.topP,
                top_k: options.topK,
              },
            });
            const duration = performance.now() - startTime;
            return {
              text: result as string,
              tokens: (options.maxTokens || 256),
              duration,
              method: 'native',
            };
          }
          break;
      }
    } catch (error) {
      console.warn('[UnifiedModelRunner] Local generation failed, using cloud fallback:', error);
    }

    // Fallback to cloud
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';
      const response = await fetch(`${API_BASE}/api/summarize/v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: options.prompt,
          maxLength: Math.floor((options.maxTokens || 256) / 2),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const duration = performance.now() - startTime;
        return {
          text: data.summary || data.text || '',
          tokens: (options.maxTokens || 256),
          duration,
          method: 'cloud',
          fallback: true,
        };
      }
    } catch (error) {
      console.error('[UnifiedModelRunner] Cloud fallback also failed:', error);
    }

    // Final fallback: simple extraction
    const duration = performance.now() - startTime;
    return {
      text: options.prompt.slice(0, (options.maxTokens || 256) * 4),
      tokens: (options.maxTokens || 256),
      duration,
      method: 'cloud',
      fallback: true,
    };
  }

  /**
   * Get current runtime
   */
  getCurrentRuntime(): 'webgpu' | 'wasm' | 'native' | 'cloud' {
    return this.currentRuntime;
  }

  /**
   * Unload model
   */
  async unloadModel(): Promise<void> {
    if (this.webgpuRunner) {
      await this.webgpuRunner.unloadModel();
    }
    if (this.wasmRunner) {
      await this.wasmRunner.unloadModel();
    }
    if (this.currentRuntime === 'native' && isTauriRuntime()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('unload_ondevice_model').catch(() => {});
    }
    this.modelConfig = null;
  }

  /**
   * Get model info
   */
  getModelInfo(): ModelConfig | null {
    return this.modelConfig;
  }
}

// Singleton instance
let unifiedRunnerInstance: UnifiedModelRunner | null = null;

export function getUnifiedModelRunner(): UnifiedModelRunner {
  if (!unifiedRunnerInstance) {
    unifiedRunnerInstance = new UnifiedModelRunner();
  }
  return unifiedRunnerInstance;
}

/**
 * Quick helper: summarize with automatic runtime selection
 */
export async function summarizeWithLocalOrEdge(
  text: string,
  lang: string = 'en'
): Promise<string> {
  const runner = getUnifiedModelRunner();
  await runner.initialize();

  // Try to use local model if available
  const result = await runner.generate({
    prompt: `Summarize the following text in ${lang}:\n\n${text}\n\nSummary:`,
    maxTokens: 200,
    temperature: 0.3,
  });

  return result.text;
}



