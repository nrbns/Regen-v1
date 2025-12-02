import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const schema = z.object({
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('regen-chunker'),
  CLEAN_DOCS_TOPIC: z.string().default('clean.docs'),
  CHUNKS_TOPIC: z.string().default('chunks.ready'),
  MAX_TOKENS_PER_CHUNK: z.coerce.number().default(400),
  CHUNK_OVERLAP_TOKENS: z.coerce.number().default(40),
  MAX_CHUNKS_PER_DOC: z.coerce.number().default(32),
});

const env = schema.parse(process.env);

export const config = {
  kafka: {
    brokers: env.KAFKA_BROKERS.split(',').map(b => b.trim()),
    clientId: env.KAFKA_CLIENT_ID,
    inputTopic: env.CLEAN_DOCS_TOPIC,
    outputTopic: env.CHUNKS_TOPIC,
  },
  chunking: {
    maxTokens: env.MAX_TOKENS_PER_CHUNK,
    overlapTokens: env.CHUNK_OVERLAP_TOKENS,
    maxChunksPerDoc: env.MAX_CHUNKS_PER_DOC,
  },
} as const;
