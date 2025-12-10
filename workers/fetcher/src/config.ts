import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('regen-fetcher'),
  RAW_PAGES_TOPIC: z.string().default('raw.pages'),
  FRONTIER_REDIS_URL: z.string().default('redis://localhost:6379'),
  MAX_CONCURRENCY: z.coerce.number().default(4),
  USER_AGENT: z.string().default('RegenFetcher/0.1 (+https://regen.dev)'),
  SNAPSHOT_BUCKET: z.string(),
  AWS_REGION: z.string().default('us-east-1'),
  FETCH_TIMEOUT_MS: z.coerce.number().default(10000),
  MAX_BODY_BYTES: z.coerce.number().default(2_000_000),
});

const env = envSchema.parse(process.env);

export const config = {
  kafka: {
    brokers: env.KAFKA_BROKERS.split(',').map(b => b.trim()),
    clientId: env.KAFKA_CLIENT_ID,
    topic: env.RAW_PAGES_TOPIC,
  },
  redis: {
    url: env.FRONTIER_REDIS_URL,
  },
  fetcher: {
    concurrency: env.MAX_CONCURRENCY,
    userAgent: env.USER_AGENT,
    fetchTimeoutMs: env.FETCH_TIMEOUT_MS,
    maxBodyBytes: env.MAX_BODY_BYTES,
  },
  storage: {
    bucket: env.SNAPSHOT_BUCKET,
    region: env.AWS_REGION,
  },
} as const;
