import Pino from 'pino';
import { FrontierQueue } from './frontier.js';
import { defaultSeeds } from './seeds.js';

const logger = Pino({ name: 'scheduler' });

export async function seedFrontier(frontier: FrontierQueue) {
  for (const seed of defaultSeeds) {
    await frontier.schedule({
      url: seed.url,
      priority: seed.priority,
      sourceType: seed.sourceType,
      license: seed.license,
    });
  }
  logger.info({ count: defaultSeeds.length }, 'seeded frontier');
}

export async function runScheduler(frontier: FrontierQueue) {
  await seedFrontier(frontier);
  logger.info('scheduler started');

  // placeholder for future logic (RSS polling, connectors)
  // For now, keep process alive.
  process.on('SIGINT', async () => {
    logger.info('scheduler shutting down');
    await frontier.close();
    process.exit(0);
  });
  // Nothing else yet—connectors will push new URLs here.
}
