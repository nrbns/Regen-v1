import { config } from './config.js';

export interface EmbeddingInput {
  chunk_id: string;
  text: string;
}

export interface EmbeddingVector {
  chunk_id: string;
  vector: number[];
  model: string;
  dim: number;
}

interface EmbeddingProvider {
  name: string;
  embed(batch: EmbeddingInput[]): Promise<EmbeddingVector[]>;
}

class MockEmbeddingProvider implements EmbeddingProvider {
  name = 'mock';

  async embed(batch: EmbeddingInput[]): Promise<EmbeddingVector[]> {
    return batch.map(item => {
      const vector = this.generateVector(item.text);
      return {
        chunk_id: item.chunk_id,
        vector,
        model: 'mock-encoder',
        dim: vector.length,
      };
    });
  }

  private generateVector(text: string, dim = 32): number[] {
    const vector = new Array(dim).fill(0);
    for (let i = 0; i < text.length; i += 1) {
      const idx = i % dim;
      vector[idx] += (text.charCodeAt(i) % 31) / 100;
    }
    return vector.map(value => Number(value.toFixed(6)));
  }
}

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async embed(batch: EmbeddingInput[]): Promise<EmbeddingVector[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: batch.map(item => item.text),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding failed: ${error}`);
    }

    const data = await response.json();
    return batch.map((item, index) => {
      const vector = data.data[index].embedding as number[];
      return {
        chunk_id: item.chunk_id,
        vector,
        model: this.model,
        dim: vector.length,
      };
    });
  }
}

export function createEmbeddingProvider(): EmbeddingProvider {
  if (config.embedding.provider === 'openai') {
    const apiKey = config.embedding.openai.apiKey;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for openai embedding provider');
    }
    return new OpenAIEmbeddingProvider(apiKey, config.embedding.openai.model);
  }
  return new MockEmbeddingProvider();
}
