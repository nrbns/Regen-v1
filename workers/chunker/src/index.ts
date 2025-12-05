import Pino from 'pino';
import { startKafka, shutdownKafka, consumer, publishChunk } from './kafka.js';
import { buildChunks } from './chunker.js';

const logger = Pino({ name: 'chunker' });

async function processMessage(message: any) {
  if (!message?.value) return;
  const payload = JSON.parse(message.value.toString());
  const { text } = payload;
  if (!text || typeof text !== 'string') {
    return;
  }
  const chunks = buildChunks(payload);
  for (const chunk of chunks) {
    await publishChunk({
      ...chunk,
      request_id: payload.request_id,
      license: payload.license ?? null,
    });
  }
  logger.info({ url: payload.url, chunks: chunks.length }, 'chunked');
}

async function run() {
  await startKafka();
  logger.info('chunker started');

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        await processMessage(message);
      } catch (error) {
        logger.error({ error }, 'failed to chunk document');
      }
    },
  });
}

process.on('SIGINT', async () => {
  logger.info('chunker shutting down');
  await shutdownKafka();
  process.exit(0);
});

run().catch(async error => {
  logger.error({ error }, 'chunker crashed');
  await shutdownKafka();
  process.exit(1);
});



