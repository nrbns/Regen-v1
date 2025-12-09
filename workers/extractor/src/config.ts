import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const schema = z.object({
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('regen-extractor'),
  RAW_PAGES_TOPIC: z.string().default('raw.pages'),
  CLEAN_DOCS_TOPIC: z.string().default('clean.docs'),
  MAX_BATCH_SIZE: z.coerce.number().default(10),
  MAX_POLL_INTERVAL_MS: z.coerce.number().default(500),
});

const env = schema.parse(process.env);

export const config = {
  kafka: {
    brokers: env.KAFKA_BROKERS.split(',').map(s => s.trim()),
    clientId: env.KAFKA_CLIENT_ID,
    rawTopic: env.RAW_PAGES_TOPIC,
    cleanTopic: env.CLEAN_DOCS_TOPIC,
  },
  consumer: {
    batchSize: env.MAX_BATCH_SIZE,
    pollIntervalMs: env.MAX_POLL_INTERVAL_MS,
  },
} as const;







