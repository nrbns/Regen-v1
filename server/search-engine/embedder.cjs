/**
 * Embedding Service
 * Generates embeddings using multiple providers (OpenAI, Ollama, HuggingFace)
 */

const axios = require('axios');
const Pino = require('pino');

const logger = Pino({ name: 'embedder' });

class Embedder {
  constructor() {
    this.provider = process.env.EMBEDDING_PROVIDER || 'openai';
    this.cache = new Map(); // Simple in-memory cache
  }

  /**
   * Generate embedding using OpenAI
   */
  async _embedOpenAI(text) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-3-small', // 1536 dimensions
        input: text,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data[0].embedding;
  }

  /**
   * Generate embedding using Ollama (local)
   */
  async _embedOllama(text) {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

    const response = await axios.post(
      `${ollamaUrl}/api/embeddings`,
      {
        model,
        prompt: text,
      }
    );

    return response.data.embedding;
  }

  /**
   * Generate embedding using HuggingFace Inference API
   */
  async _embedHuggingFace(text) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error('HUGGINGFACE_API_KEY not configured');
    }

    const model = process.env.HF_EMBED_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';

    const response = await axios.post(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`,
      {
        inputs: text,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    return response.data[0]; // Returns array of embeddings, take first
  }

  /**
   * Generate embedding (main method)
   */
  async embed(text, options = {}) {
    const cacheKey = `${this.provider}:${text.substring(0, 100)}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let embedding;

    try {
      switch (this.provider) {
        case 'openai':
          embedding = await this._embedOpenAI(text);
          break;
        case 'ollama':
          embedding = await this._embedOllama(text);
          break;
        case 'huggingface':
        case 'hf':
          embedding = await this._embedHuggingFace(text);
          break;
        default:
          throw new Error(`Unknown embedding provider: ${this.provider}`);
      }

      // Cache result
      this.cache.set(cacheKey, embedding);
      
      // Limit cache size
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      return embedding;
    } catch (error) {
      logger.error({ provider: this.provider, error: error.message }, 'Embedding failed');
      throw error;
    }
  }

  /**
   * Batch embed (for efficiency)
   * PERFORMANCE FIX #4: Parallel batch processing with concurrency limit
   */
  async embedBatch(texts, options = {}) {
    const { concurrency = 5, batchSize = 10 } = options;
    
    // PERFORMANCE FIX #4: Process in parallel batches
    const results = [];
    const batches = [];
    
    // Split into batches
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }
    
    // Process batches with concurrency limit
    const pLimit = require('p-limit');
    const limit = pLimit(concurrency);
    
    const batchPromises = batches.map((batch, batchIdx) =>
      limit(async () => {
        const batchStart = Date.now();
        const batchResults = await Promise.allSettled(
          batch.map(text => this.embed(text, options))
        );
        
        const batchLatency = Date.now() - batchStart;
        if (process.env.LOG_PERFORMANCE !== '0') {
          logger.debug({ 
            batch: batchIdx, 
            size: batch.length, 
            latency: batchLatency 
          }, 'Batch embedding completed');
        }
        
        return batchResults.map((result, idx) => ({
          text: batch[idx],
          embedding: result.status === 'fulfilled' ? result.value : null,
          error: result.status === 'rejected' ? result.reason.message : null,
        }));
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    // Flatten results
    for (const batchResult of batchResults) {
      results.push(...batchResult);
    }
    
    return results;
  }

  /**
   * Get embedding dimensions
   */
  getDimensions() {
    switch (this.provider) {
      case 'openai':
        return 1536; // text-embedding-3-small
      case 'ollama':
        return 768; // nomic-embed-text (default)
      case 'huggingface':
      case 'hf':
        return 384; // all-MiniLM-L6-v2 (default)
      default:
        return 384;
    }
  }
}

// Singleton instance
let embedderInstance = null;

function getEmbedder() {
  if (!embedderInstance) {
    embedderInstance = new Embedder();
  }
  return embedderInstance;
}

module.exports = { Embedder, getEmbedder };

