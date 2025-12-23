/**
 * Model Manager - Smart model selection and quantization for low-resource devices
 * Auto-detects RAM, selects optimal models, manages quantization
 * Works in Tauri, Electron, and Web modes with proper fallbacks
 */

import { isDevEnv } from '../../lib/env';

export type ModelSize = 'tiny' | 'small' | 'medium' | 'large';
export type Quantization = 'Q2_K' | 'Q3_K_M' | 'Q4_K_M' | 'Q5_K_M' | 'Q8_0';

export interface ModelConfig {
  name: string;
  size: ModelSize;
  ramUsageMB: number;
  quantization?: Quantization;
  tokensPerSecond?: number;
  quality: 'low' | 'medium' | 'high';
  languages: string[];
}

export interface SystemResources {
  totalRAMGB: number;
  availableRAMGB: number;
  cpuCores: number;
  isLowPowerMode: boolean;
}

// Predefined model configurations optimized for low-resource devices
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'phi3:mini': {
    name: 'phi3:mini',
    size: 'small',
    ramUsageMB: 2400, // ~2.4GB
    quantization: 'Q4_K_M',
    tokensPerSecond: 25,
    quality: 'high',
    languages: ['en'],
  },
  'phi3:mini-4k': {
    name: 'phi3:mini-4k',
    size: 'tiny',
    ramUsageMB: 2000, // ~2GB
    quantization: 'Q4_K_M',
    tokensPerSecond: 30,
    quality: 'high',
    languages: ['en'],
  },
  'gemma2:2b': {
    name: 'gemma2:2b',
    size: 'tiny',
    ramUsageMB: 1500, // ~1.5GB
    quantization: 'Q4_K_M',
    tokensPerSecond: 35,
    quality: 'medium',
    languages: ['en'],
  },
  'qwen2:1.5b': {
    name: 'qwen2:1.5b',
    size: 'tiny',
    ramUsageMB: 1000, // ~1GB
    quantization: 'Q4_K_M',
    tokensPerSecond: 40,
    quality: 'medium',
    languages: ['en', 'zh', 'hi'],
  },
  tinyllava: {
    name: 'tinyllava',
    size: 'tiny',
    ramUsageMB: 1200, // ~1.2GB
    quantization: 'Q3_K_M',
    tokensPerSecond: 20,
    quality: 'low',
    languages: ['en'],
  },
};

class ModelManager {
  private systemResources: SystemResources | null = null;
  private recommendedModel: string | null = null;
  private maxConcurrentModels = 2;
  private maxParallelRequests = 4;

  /**
   * Detect system resources (RAM, CPU cores)
   */
  async detectSystemResources(): Promise<SystemResources> {
    if (this.systemResources) {
      return this.systemResources;
    }

    try {
      // Try to get system info via Tauri with safe fallback
      const { getSystemInfoSafe } = await import('../../utils/tauriCompatibility');
      const info = await getSystemInfoSafe();

      if (info && typeof info.total_ram_gb === 'number') {
        this.systemResources = {
          totalRAMGB: info.total_ram_gb,
          availableRAMGB: info.available_ram_gb || info.total_ram_gb * 0.5,
          cpuCores: info.cpu_cores || 4,
          isLowPowerMode: info.total_ram_gb < 8,
        };
        return this.systemResources;
      }
    } catch (error) {
      // Not in Tauri or import failed, use defaults
      if (isDevEnv()) {
        console.warn('[ModelManager] System detection failed, using defaults:', error);
      }
    }

    // Fallback: Assume low-spec device (common in target markets)
    this.systemResources = {
      totalRAMGB: 8, // Conservative default
      availableRAMGB: 4,
      cpuCores: 4,
      isLowPowerMode: true,
    };

    return this.systemResources;
  }

  /**
   * Get recommended model based on system resources
   */
  async getRecommendedModel(): Promise<string> {
    if (this.recommendedModel) {
      return this.recommendedModel;
    }

    const resources = await this.detectSystemResources();

    // Auto-select model based on available RAM
    if (resources.availableRAMGB < 4) {
      // Ultra-low RAM: use smallest model
      this.recommendedModel = 'qwen2:1.5b';
    } else if (resources.availableRAMGB < 6) {
      // Low RAM: use tiny model
      this.recommendedModel = 'gemma2:2b';
    } else if (resources.availableRAMGB < 8) {
      // Medium RAM: use small model
      this.recommendedModel = 'phi3:mini-4k';
    } else {
      // Adequate RAM: use standard model
      this.recommendedModel = 'phi3:mini';
    }

    console.log(
      `[ModelManager] Recommended model: ${this.recommendedModel} (RAM: ${resources.availableRAMGB}GB available)`
    );
    return this.recommendedModel;
  }

  /**
   * Get model configuration
   */
  getModelConfig(modelName: string): ModelConfig | null {
    return MODEL_CONFIGS[modelName] || null;
  }

  /**
   * Calculate max concurrent agents based on RAM
   */
  async getMaxConcurrentAgents(): Promise<number> {
    const resources = await this.detectSystemResources();
    const model = await this.getRecommendedModel();
    const config = this.getModelConfig(model);

    if (!config) {
      return 2; // Safe default
    }

    // Reserve 2GB for system + browser
    const availableForModels = resources.availableRAMGB - 2;
    const agentsPerGB = Math.floor(availableForModels / (config.ramUsageMB / 1024));

    // Cap at reasonable limits
    return Math.min(Math.max(agentsPerGB, 1), 10);
  }

  /**
   * Get Ollama environment variables for optimization
   */
  async getOllamaEnvVars(): Promise<Record<string, string>> {
    const resources = await this.detectSystemResources();
    await this.getMaxConcurrentAgents(); // Ensure limits are calculated

    // Calculate optimal thread count (use 75% of cores)
    const optimalThreads = Math.max(2, Math.floor(resources.cpuCores * 0.75));

    return {
      OLLAMA_MAX_LOADED_MODELS: this.maxConcurrentModels.toString(),
      OLLAMA_NUM_PARALLEL: this.maxParallelRequests.toString(),
      OLLAMA_NUM_THREAD: optimalThreads.toString(),
      OLLAMA_FLASH_ATTENTION: '1', // Use flash attention for efficiency
      OLLAMA_KEEP_ALIVE: '5m', // Unload models after 5min idle
    };
  }

  /**
   * Check if model needs quantization
   */
  shouldUseQuantization(modelName: string): boolean {
    const resources = this.systemResources;
    if (!resources) {
      return true; // Default to quantized for safety
    }

    // Always use quantization for low-RAM devices
    if (resources.totalRAMGB < 8) {
      return true;
    }

    const config = this.getModelConfig(modelName);
    return config?.quantization !== undefined;
  }

  /**
   * Get quantized model name
   */
  getQuantizedModelName(modelName: string): string {
    const config = this.getModelConfig(modelName);
    if (!config?.quantization) {
      return modelName;
    }

    // Ollama handles quantization automatically, but we can specify in pull
    return modelName;
  }
}

export const modelManager = new ModelManager();
