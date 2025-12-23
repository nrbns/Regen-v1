/**
 * EmbeddingService - orchestrates local + remote embedding providers
 * Falls back automatically so SuperMemory stays local-first.
 */

type EmbeddingProvider = 'openai' | 'huggingface' | 'local';

interface ProviderStatus {
  provider: EmbeddingProvider;
  available: boolean;
  latencyMs?: number;
  lastChecked?: number;
  error?: string;
}

interface GenerateOptions {
  provider?: EmbeddingProvider;
  signal?: AbortSignal;
}

const DEFAULT_DIMENSIONS = 384;
const CHECK_INTERVAL_MS = 60_000;
const API_BASE =
  (typeof window !== 'undefined' && (window as any).__superMemoryApiBase) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPER_MEMORY_API_BASE) ||
  'http://localhost:8000';

export class EmbeddingService {
  private statusCache: Record<EmbeddingProvider, ProviderStatus> = {
    openai: { provider: 'openai', available: false },
    huggingface: { provider: 'huggingface', available: false },
    local: { provider: 'local', available: true },
  };

  private preferredOrder: EmbeddingProvider[] = ['openai', 'huggingface', 'local'];

  async generateEmbedding(text: string, options?: GenerateOptions): Promise<number[]> {
    const provider = options?.provider || (await this.getPreferredProvider());
    switch (provider) {
      case 'openai':
        return this.generateOpenAIEmbedding(text, options?.signal);
      case 'huggingface':
        return this.generateHuggingFaceEmbedding(text, options?.signal);
      case 'local':
      default:
        return this.generateLocalEmbedding(text);
    }
  }

  async getPreferredProvider(): Promise<EmbeddingProvider> {
    // Skip backend checks in web mode - use local only
    const isWebMode =
      typeof window !== 'undefined' && !(window as any).__ELECTRON__ && !(window as any).__TAURI__;

    if (isWebMode) {
      return 'local';
    }

    for (const provider of this.preferredOrder) {
      const status = await this.checkProvider(provider);
      if (status.available) {
        return provider;
      }
    }
    return 'local';
  }

  private async checkProvider(provider: EmbeddingProvider): Promise<ProviderStatus> {
    const cached = this.statusCache[provider];
    const now = Date.now();
    if (cached.lastChecked && now - cached.lastChecked < CHECK_INTERVAL_MS) {
      return cached;
    }

    try {
      if (provider === 'openai') {
        const status = await this.checkOpenAI();
        this.statusCache[provider] = status;
        return status;
      }
      if (provider === 'huggingface') {
        const status = await this.checkHuggingFace();
        this.statusCache[provider] = status;
        return status;
      }
      this.statusCache[provider] = {
        provider: 'local',
        available: true,
        lastChecked: now,
      };
      return this.statusCache[provider];
    } catch (error) {
      this.statusCache[provider] = {
        provider,
        available: false,
        lastChecked: now,
        error: error instanceof Error ? error.message : String(error),
      };
      return this.statusCache[provider];
    }
  }

  private async checkOpenAI(): Promise<ProviderStatus> {
    // Skip backend checks in web mode - no backend available
    const isWebMode =
      typeof window !== 'undefined' && !(window as any).__ELECTRON__ && !(window as any).__TAURI__;

    if (isWebMode) {
      return {
        provider: 'openai',
        available: false,
        lastChecked: Date.now(),
      };
    }

    const start = performance.now();
    try {
      const response = await fetch(`${API_BASE}/openai/status`, { method: 'GET' });
      const latencyMs = performance.now() - start;
      if (!response.ok) {
        throw new Error(`OpenAI status ${response.status}`);
      }
      const data = await response.json();
      return {
        provider: 'openai',
        available: data.available ?? true,
        latencyMs,
        lastChecked: Date.now(),
      };
    } catch (error) {
      return {
        provider: 'openai',
        available: false,
        error: error instanceof Error ? error.message : String(error),
        lastChecked: Date.now(),
      };
    }
  }

  private async checkHuggingFace(): Promise<ProviderStatus> {
    // Skip backend checks in web mode - no backend available
    const isWebMode =
      typeof window !== 'undefined' && !(window as any).__ELECTRON__ && !(window as any).__TAURI__;

    if (isWebMode) {
      return {
        provider: 'huggingface',
        available: false,
        lastChecked: Date.now(),
      };
    }

    const start = performance.now();
    try {
      const response = await fetch(`${API_BASE}/huggingface/status`, { method: 'GET' });
      const latencyMs = performance.now() - start;
      if (!response.ok) {
        throw new Error(`HuggingFace status ${response.status}`);
      }
      const data = await response.json();
      return {
        provider: 'huggingface',
        available: data.available ?? true,
        latencyMs,
        lastChecked: Date.now(),
      };
    } catch (error) {
      return {
        provider: 'huggingface',
        available: false,
        error: error instanceof Error ? error.message : String(error),
        lastChecked: Date.now(),
      };
    }
  }

  private async generateOpenAIEmbedding(text: string, signal?: AbortSignal): Promise<number[]> {
    try {
      const response = await fetch(`${API_BASE}/openai/embedding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model: 'text-embedding-3-small' }),
        signal,
      });
      if (!response.ok) {
        throw new Error(`OpenAI embedding failed: ${response.status}`);
      }
      const data = await response.json();
      const vector = data.embedding as number[];
      if (!Array.isArray(vector)) {
        throw new Error('OpenAI embedding malformed');
      }
      return vector;
    } catch (error) {
      this.statusCache.openai = {
        provider: 'openai',
        available: false,
        error: error instanceof Error ? error.message : String(error),
        lastChecked: Date.now(),
      };
      return this.generateHuggingFaceEmbedding(text, signal);
    }
  }

  private async generateHuggingFaceEmbedding(
    text: string,
    _signal?: AbortSignal
  ): Promise<number[]> {
    try {
      // Use browser-based Transformers.js (offline)
      const { getLocalHFServer } = await import('../../services/huggingface/localHFServer');
      const hfServer = getLocalHFServer();

      // Generate embeddings using local HF server
      const embeddings = await hfServer.generateEmbeddings([text]);
      if (embeddings && embeddings.length > 0) {
        return embeddings[0];
      }

      throw new Error('HF embeddings returned empty');
    } catch (error) {
      console.warn('[EmbeddingService] HF failed, falling back to local:', error);
      this.statusCache.huggingface = {
        provider: 'huggingface',
        available: false,
        error: error instanceof Error ? error.message : String(error),
        lastChecked: Date.now(),
      };
      return this.generateLocalEmbedding(text);
    }
  }

  private async generateLocalEmbedding(text: string): Promise<number[]> {
    const normalized = text.toLowerCase();
    const words = normalized.split(/\s+/).filter(Boolean);
    const vector = new Array(DEFAULT_DIMENSIONS).fill(0);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = (hash << 5) - hash + word.charCodeAt(j);
        hash |= 0; // Convert to 32-bit int
      }
      const dim = Math.abs(hash) % DEFAULT_DIMENSIONS;
      vector[dim] += 1 / Math.sqrt(i + 1);
    }

    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] = vector[i] / magnitude;
      }
    }

    return vector;
  }
}

export const embeddingService = new EmbeddingService();

export const generateEmbeddingVector = (text: string, options?: GenerateOptions) =>
  embeddingService.generateEmbedding(text, options);
