import Pino from 'pino';
import { config } from './config.js';
import { FrontierQueue } from './frontier.js';
import { runFetcher } from './fetcher.js';
import { runScheduler } from './scheduler.js';

const logger = Pino({ name: 'fetcher-main' });

async function main() {
  const frontier = new FrontierQueue(config.redis.url);

  runScheduler(frontier).catch(error => {
    logger.error({ error }, 'scheduler error');
    process.exit(1);
  });

  runFetcher().catch(error => {
    logger.error({ error }, 'fetcher crashed');
    process.exit(1);
  });

  process.on('SIGINT', async () => {
    logger.info('shutting down...');
    await frontier.close();
    process.exit(0);
  });
}

main().catch(error => {
  logger.error({ error }, 'fatal error');
  process.exit(1);
});

