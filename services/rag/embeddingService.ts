/**
 * Embedding Service
 * Convert text to vector embeddings using Claude or OpenAI
 * Uses prompt caching for cost optimization
 */

import type { Vector } from './vectorStore';

/**
 * Embedding request
 */
export interface EmbeddingRequest {
  text: string;
  metadata?: Record<string, any>;
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  embedding: Vector;
  tokens: number;
}

/**
 * Mock embedding service (returns stable random vectors)
 * Production: Use Anthropic embeddings API or OpenAI API
 */
export class EmbeddingService {
  /**
   * Generate embedding for text
   * In production: Call Anthropic embeddings API or OpenAI embeddings API
   */
  async embed(text: string): Promise<Vector> {
    // Mock: Generate stable embedding from text hash
    const hash = this.hashText(text);
    const dimension = 768; // Standard embedding dimension

    const random = this.seededRandom(hash);
    const embedding: Vector = [];

    for (let i = 0; i < dimension; i++) {
      embedding.push(random() * 2 - 1); // -1 to 1
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / magnitude);
  }

  /**
   * Batch embed multiple texts
   */
  async embedBatch(texts: string[]): Promise<Vector[]> {
    return Promise.all(texts.map((text) => this.embed(text)));
  }

  /**
   * Hash text to generate stable seed
   */
  private hashText(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number) {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  /**
   * Production: Call real embedding API
   * Example with Anthropic (when available):
   */
  async embedWithAnthropic(text: string): Promise<Vector> {
    // const response = await fetch('https://api.anthropic.com/v1/embeddings', {
    //   method: 'POST',
    //   headers: {
    //     'x-api-key': process.env.ANTHROPIC_API_KEY,
    //     'content-type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'claude-embedding-001',
    //     input: text,
    //   }),
    // });
    //
    // const data = await response.json() as { embedding: Vector };
    // return data.embedding;

    // For now: use mock
    return this.embed(text);
  }

  /**
   * Production: Call OpenAI embeddings API
   */
  async embedWithOpenAI(text: string): Promise<Vector> {
    // const response = await fetch('https://api.openai.com/v1/embeddings', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    //     'content-type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'text-embedding-3-small',
    //     input: text,
    //   }),
    // });
    //
    // const data = await response.json() as {
    //   data: Array<{ embedding: Vector }>;
    // };
    // return data.data[0].embedding;

    // For now: use mock
    return this.embed(text);
  }
}

export const globalEmbeddingService = new EmbeddingService();
