import Pino from 'pino';
import { startKafka, shutdownKafka, consumer, publishCleanDoc } from './kafka.js';
import { cleanHtml } from './cleaner.js';
import { randomUUID } from 'crypto';

const logger = Pino({ name: 'extractor' });

async function processMessage(message: any) {
  if (!message?.value) return;
  const payload = JSON.parse(message.value.toString());
  const { html, url, source_type: sourceType, fetched_at: fetchedAt } = payload;
  if (!html || typeof html !== 'string') {
    return;
  }

  const clean = cleanHtml(html);

  await publishCleanDoc({
    request_id: payload.request_id || randomUUID(),
    snapshot_id: payload.snapshot_id,
    url,
    title: clean.title,
    text: clean.text,
    html: clean.html,
    language: clean.language,
    fetched_at: fetchedAt,
    source_type: sourceType,
    license: payload.license ?? null,
    metadata: {
      ...payload.metadata,
      tokens: clean.text.split(/\s+/).length,
    },
  });

  logger.info({ url }, 'cleaned');
}

async function run() {
  await startKafka();
  logger.info('extractor started');

  await consumer.run({
    eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
      for (const message of batch.messages) {
        if (!isRunning() || isStale()) break;
        try {
          await processMessage(message);
          resolveOffset(message.offset);
        } catch (error) {
          logger.error({ error, offset: message.offset }, 'failed to process raw page');
        }
        await heartbeat();
      }
    },
  });
}

process.on('SIGINT', async () => {
  logger.info('extractor shutting down');
  await shutdownKafka();
  process.exit(0);
});

run().catch(async error => {
  logger.error({ error }, 'extractor crashed');
  await shutdownKafka();
  process.exit(1);
});
