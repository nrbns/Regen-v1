import { randomUUID } from 'crypto';
import { config } from './config.js';

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export function buildChunks(payload: {
  text: string;
  url: string;
  title: string | null;
  source_type: string;
  fetched_at: string;
  snapshot_id: string;
  metadata?: Record<string, unknown>;
}) {
  const tokens = tokenize(payload.text);
  const chunks = [];
  const maxTokens = config.chunking.maxTokens;
  const overlap = config.chunking.overlapTokens;

  let index = 0;
  while (index < tokens.length && chunks.length < config.chunking.maxChunksPerDoc) {
    const chunkTokens = tokens.slice(index, index + maxTokens);
    const chunkText = chunkTokens.join(' ');
    const chunkId = randomUUID();
    const chunk = {
      chunk_id: chunkId,
      snapshot_id: payload.snapshot_id,
      url: payload.url,
      title: payload.title,
      text: chunkText,
      offset_start: index,
      offset_end: index + chunkTokens.length,
      source_type: payload.source_type,
      fetched_at: payload.fetched_at,
      metadata: {
        ...payload.metadata,
        token_count: chunkTokens.length,
      },
    };
    chunks.push(chunk);
    index += maxTokens - overlap;
  }
  return chunks;
}






