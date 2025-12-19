/**
 * Local Hugging Face API Server
 * Runs Transformers.js models entirely in-browser for offline usage
 */

import { pipeline, env } from '@xenova/transformers';

// Configure to use local cache (offline mode)
env.allowLocalModels = true;
env.allowRemoteModels = false; // Disable remote downloads after first cache
env.useBrowserCache = true;

export interface HFModelConfig {
  task: 'text-generation' | 'embeddings' | 'classification' | 'summarization' | 'translation';
  model: string;
  cached: boolean;
}

export class LocalHFServer {
  private pipelines: Map<string, any> = new Map();
  private modelCache: Map<string, boolean> = new Map();

  /**
   * Initialize with pre-cached models for offline use
   */
  async initialize(): Promise<void> {
    console.log('[HF] Initializing local Hugging Face server...');

    // Pre-load common models
    const commonModels = [
      { task: 'embeddings', model: 'Xenova/all-MiniLM-L6-v2' }, // 90MB, fast embeddings
      { task: 'text-generation', model: 'Xenova/gpt2' }, // 500MB, text generation
      { task: 'summarization', model: 'Xenova/distilbart-cnn-6-6' }, // 300MB
    ];

    for (const { task, model } of commonModels) {
      try {
        await this.loadModel(task as any, model);
        console.log(`[HF] ✅ Cached: ${model}`);
      } catch (error) {
        console.warn(`[HF] ⚠️ Failed to cache ${model}:`, error);
      }
    }

    console.log('[HF] Local server ready (offline mode)');
  }

  /**
   * Load a model pipeline
   */
  private async loadModel(task: string, model: string): Promise<any> {
    const key = `${task}:${model}`;

    if (this.pipelines.has(key)) {
      return this.pipelines.get(key);
    }

    console.log(`[HF] Loading ${task} model: ${model}`);
    const pipe = await pipeline(task as any, model);
    this.pipelines.set(key, pipe);
    this.modelCache.set(model, true);

    return pipe;
  }

  /**
   * Generate text embeddings (for semantic search, RAG, etc.)
   */
  async generateEmbeddings(
    texts: string[],
    model: string = 'Xenova/all-MiniLM-L6-v2'
  ): Promise<number[][]> {
    try {
      const pipe = await this.loadModel('feature-extraction', model);
      const outputs = await pipe(texts, { pooling: 'mean', normalize: true });

      // Convert to plain arrays
      return outputs.tolist();
    } catch (error) {
      console.error('[HF] Embedding generation failed:', error);
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  }

  /**
   * Generate text completion (alternative to Ollama)
   */
  async generateText(
    prompt: string,
    options: {
      model?: string;
      maxLength?: number;
      temperature?: number;
      topK?: number;
    } = {}
  ): Promise<string> {
    const { model = 'Xenova/gpt2', maxLength = 100, temperature = 0.9, topK = 50 } = options;

    try {
      const pipe = await this.loadModel('text-generation', model);
      const output = await pipe(prompt, {
        max_new_tokens: maxLength,
        temperature,
        top_k: topK,
        do_sample: true,
      });

      return output[0].generated_text;
    } catch (error) {
      console.error('[HF] Text generation failed:', error);
      throw new Error(`Failed to generate text: ${error}`);
    }
  }

  /**
   * Summarize text
   */
  async summarize(
    text: string,
    options: {
      model?: string;
      maxLength?: number;
      minLength?: number;
    } = {}
  ): Promise<string> {
    const { model = 'Xenova/distilbart-cnn-6-6', maxLength = 130, minLength = 30 } = options;

    try {
      const pipe = await this.loadModel('summarization', model);
      const output = await pipe(text, {
        max_length: maxLength,
        min_length: minLength,
      });

      return output[0].summary_text;
    } catch (error) {
      console.error('[HF] Summarization failed:', error);
      throw new Error(`Failed to summarize: ${error}`);
    }
  }

  /**
   * Translate text
   */
  async translate(
    text: string,
    options: {
      from?: string;
      to?: string;
      model?: string;
    } = {}
  ): Promise<string> {
    const { from = 'en', to = 'hi', model = `Xenova/opus-mt-${from}-${to}` } = options;

    try {
      const pipe = await this.loadModel('translation', model);
      const output = await pipe(text);

      return output[0].translation_text;
    } catch (error) {
      console.error('[HF] Translation failed:', error);
      throw new Error(`Failed to translate: ${error}`);
    }
  }

  /**
   * Classify text (sentiment, intent, etc.)
   */
  async classify(
    text: string,
    options: {
      model?: string;
    } = {}
  ): Promise<{ label: string; score: number }[]> {
    const { model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english' } = options;

    try {
      const pipe = await this.loadModel('text-classification', model);
      const output = await pipe(text);

      return output;
    } catch (error) {
      console.error('[HF] Classification failed:', error);
      throw new Error(`Failed to classify: ${error}`);
    }
  }

  /**
   * Check which models are cached locally
   */
  getCachedModels(): string[] {
    return Array.from(this.modelCache.keys());
  }

  /**
   * Get server status
   */
  getStatus(): {
    online: boolean;
    cachedModels: number;
    offlineReady: boolean;
  } {
    return {
      online: true,
      cachedModels: this.modelCache.size,
      offlineReady: this.modelCache.size > 0,
    };
  }
}

// Singleton instance
let hfServer: LocalHFServer | null = null;

export function getLocalHFServer(): LocalHFServer {
  if (!hfServer) {
    hfServer = new LocalHFServer();
  }
  return hfServer;
}

export async function initializeLocalHF(): Promise<LocalHFServer> {
  const server = getLocalHFServer();
  await server.initialize();
  return server;
}
