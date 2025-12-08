import Pino from 'pino';
import { startKafka, shutdownKafka, consumer, publishEmbedding } from './kafka.js';
import { config } from './config.js';
import { createEmbeddingProvider } from './providers.js';
import { ChunkPayload, EmbeddedChunk, createIndexWriter } from './indexers.js';

const logger = Pino({ name: 'embedder' });
const provider = createEmbeddingProvider();
const indexWriter = createIndexWriter();

const buffer: ChunkPayload[] = [];
let flushTimer: NodeJS.Timeout | undefined;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    flushBatch().catch(error => logger.error({ error }, 'flush failed'));
  }, config.batching.flushIntervalMs);
}

async function handleChunk(messageValue: Buffer) {
  const payload = JSON.parse(messageValue.toString());
  if (!payload?.chunk_id || !payload?.text) {
    logger.warn({ payload }, 'chunk missing required fields');
    return;
  }
  buffer.push(payload);

  const approxBytes = JSON.stringify(payload).length;
  const shouldFlush =
    buffer.length >= config.batching.size || approxBytes >= config.batching.maxBytes;

  if (shouldFlush) {
    await flushBatch();
  } else {
    scheduleFlush();
  }
}

async function flushBatch() {
  if (!buffer.length) return;
  const batch = buffer.splice(0, buffer.length);
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = undefined;
  }
  logger.info({ count: batch.length, provider: provider.name }, 'embedding batch');
  try {
    const embeddings = await provider.embed(
      batch.map(item => ({
        chunk_id: item.chunk_id,
        text: item.text,
      }))
    );
    const timestamp = Date.now();
    const enriched: EmbeddedChunk[] = embeddings.map((embedding, index) => ({
      chunk: batch[index],
      vector: embedding.vector,
      model: embedding.model,
      dim: embedding.dim,
      createdAt: timestamp,
    }));

    await Promise.all(
      enriched.map(entry =>
        publishEmbedding({
          chunk_id: entry.chunk.chunk_id,
          vector: entry.vector,
          model: entry.model,
          dim: entry.dim,
          created_at: entry.createdAt,
        })
      )
    );

    await indexWriter
      .upsert(enriched)
      .catch(error => logger.error({ error }, 'index writer failed'));

    logger.info({ count: enriched.length }, 'embedded chunks published');
  } catch (error) {
    logger.error({ error }, 'embedding batch failed');
    // requeue batch for retry
    buffer.unshift(...batch);
    scheduleFlush();
  }
}

async function run() {
  await startKafka();
  logger.info(
    {
      provider: provider.name,
      indexWriter: indexWriter.name,
      batchSize: config.batching.size,
    },
    'embedder started'
  );

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      await handleChunk(message.value);
    },
  });
}

process.on('SIGINT', async () => {
  logger.info('embedder shutting down');
  await flushBatch().catch(error => logger.error({ error }, 'flush on shutdown failed'));
  await shutdownKafka();
  process.exit(0);
});

run().catch(async error => {
  logger.error({ error }, 'embedder crashed');
  await shutdownKafka();
  process.exit(1);
});






