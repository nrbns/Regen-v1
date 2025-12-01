import fetch, { RequestInit } from 'node-fetch';
import { setTimeout as delay } from 'timers/promises';
import { randomUUID } from 'crypto';
import { config } from './config.js';
import { publishRawPage } from './kafka.js';
import { storeSnapshot } from './storage.js';
import { FrontierQueue, FrontierTask } from './frontier.js';
import { RobotsFetcher } from 'robots-txt-guard';
import Pino from 'pino';

const logger = Pino({ name: 'fetcher' });
const robots = new RobotsFetcher({ userAgent: config.fetcher.userAgent });

async function canFetch(url: string) {
  try {
    return await robots.canFetch(url, config.fetcher.userAgent);
  } catch (error) {
    logger.warn({ url, error }, 'robots check failed, default allow');
    return true;
  }
}

async function fetchPage(task: FrontierTask) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.fetcher.fetchTimeoutMs);
  try {
    const options: RequestInit = {
      method: 'GET',
      headers: {
        'User-Agent': config.fetcher.userAgent,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    };
    const res = await fetch(task.url, options);
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > config.fetcher.maxBodyBytes) {
      throw new Error(`body too large: ${buffer.byteLength}`);
    }
    const html = Buffer.from(buffer).toString('utf-8');
    const fetchedAt = new Date().toISOString();

    const snapshot = await storeSnapshot({
      url: task.url,
      html,
      headers: Object.fromEntries(res.headers.entries()),
      fetchedAt,
      sourceType: task.sourceType,
      license: task.license,
    });

    await publishRawPage({
      request_id: randomUUID(),
      task_id: task.id,
      url: task.url,
      status_code: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      html,
      source_type: task.sourceType,
      fetched_at: fetchedAt,
      license: task.license ?? null,
      snapshot_id: snapshot.snapshotId,
      s3_path: snapshot.s3Path,
      metadata_path: snapshot.metadataPath,
      metadata: task.metadata ?? {},
    });

    logger.info({ url: task.url, status: res.status }, 'fetched');
  } catch (error) {
    logger.error({ url: task.url, error: String(error) }, 'fetch failed');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function runFetcher() {
  const frontier = new FrontierQueue(config.redis.url);
  const inFlight = new Set<string>();

  const processNext = async () => {
    if (inFlight.size >= config.fetcher.concurrency) {
      return;
    }
    const task = await frontier.next();
    if (!task) {
      await delay(1000);
      return;
    }
    if (!(await canFetch(task.url))) {
      logger.warn({ url: task.url }, 'blocked by robots');
      return;
    }

    inFlight.add(task.id);
    fetchPage(task)
      .catch(err => logger.error({ err, url: task.url }, 'fetch pipeline error'))
      .finally(() => inFlight.delete(task.id));
  };

  logger.info({ concurrency: config.fetcher.concurrency }, 'fetcher started');
  // main loop
  while (true) {
    await processNext();
  }
}



