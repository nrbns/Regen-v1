import { config } from './config.js';

export interface EmbeddedChunk {
  chunk: ChunkPayload;
  vector: number[];
  model: string;
  dim: number;
  createdAt: number;
}

export interface ChunkPayload {
  chunk_id: string;
  request_id?: string;
  url: string;
  text: string;
  offset_start: number;
  offset_end: number;
  source_type: string;
  fetched_at?: number;
  metadata?: Record<string, unknown>;
}

interface IndexWriter {
  name: string;
  upsert(items: EmbeddedChunk[]): Promise<void>;
}

class NoopIndexWriter implements IndexWriter {
  name = 'noop';
  async upsert(): Promise<void> {
    // intentionally empty
  }
}

class QdrantIndexWriter implements IndexWriter {
  name = 'qdrant';
  private url: string;
  private apiKey?: string;
  private collection: string;

  constructor(url: string, collection: string, apiKey?: string) {
    this.url = url.replace(/\/$/, '');
    this.collection = collection;
    this.apiKey = apiKey;
  }

  async upsert(items: EmbeddedChunk[]): Promise<void> {
    if (!items.length) return;
    const points = items.map(entry => ({
      id: entry.chunk.chunk_id,
      vector: entry.vector,
      payload: {
        chunk_id: entry.chunk.chunk_id,
        url: entry.chunk.url,
        source_type: entry.chunk.source_type,
        offset_start: entry.chunk.offset_start,
        offset_end: entry.chunk.offset_end,
        fetched_at: entry.chunk.fetched_at,
        metadata: entry.chunk.metadata,
        text: entry.chunk.text,
        model: entry.model,
      },
    }));

    const response = await fetch(`${this.url}/collections/${this.collection}/points?wait=true`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'api-key': this.apiKey } : {}),
      },
      body: JSON.stringify({ points }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upsert into Qdrant: ${error}`);
    }
  }
}

export function createIndexWriter(): IndexWriter {
  if (config.indexWriter.kind === 'qdrant') {
    const { url, collection, apiKey } = config.indexWriter.qdrant;
    if (!url) {
      throw new Error('QDRANT_URL is required when INDEX_WRITER=qdrant');
    }
    return new QdrantIndexWriter(url, collection, apiKey);
  }
  return new NoopIndexWriter();
}







