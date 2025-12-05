import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const schema = z.object({
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('regen-embedder'),
  CHUNKS_TOPIC: z.string().default('chunks.ready'),
  EMBEDDINGS_TOPIC: z.string().default('embeddings.ready'),
  EMBEDDING_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_EMBED_MODEL: z.string().default('text-embedding-3-small'),
  BATCH_SIZE: z.coerce.number().default(32),
  MAX_BATCH_BYTES: z.coerce.number().default(120_000),
  FLUSH_INTERVAL_MS: z.coerce.number().default(2000),
  INDEX_WRITER: z.enum(['noop', 'qdrant']).default('noop'),
  QDRANT_URL: z.string().optional(),
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_COLLECTION: z.string().default('regen_chunks'),
});

const env = schema.parse(process.env);

export const config = {
  kafka: {
    brokers: env.KAFKA_BROKERS.split(',').map(b => b.trim()),
    clientId: env.KAFKA_CLIENT_ID,
    inputTopic: env.CHUNKS_TOPIC,
    outputTopic: env.EMBEDDINGS_TOPIC,
  },
  batching: {
    size: env.BATCH_SIZE,
    maxBytes: env.MAX_BATCH_BYTES,
    flushIntervalMs: env.FLUSH_INTERVAL_MS,
  },
  embedding: {
    provider: env.EMBEDDING_PROVIDER,
    openai: {
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_EMBED_MODEL,
    },
  },
  indexWriter: {
    kind: env.INDEX_WRITER,
    qdrant: {
      url: env.QDRANT_URL,
      apiKey: env.QDRANT_API_KEY,
      collection: env.QDRANT_COLLECTION,
    },
  },
} as const;



