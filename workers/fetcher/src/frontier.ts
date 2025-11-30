import IORedis from 'ioredis';
import { randomUUID } from 'crypto';

export type FrontierTask = {
  id: string;
  url: string;
  priority: number;
  sourceType: string;
  license?: string | null;
  metadata?: Record<string, unknown>;
};

const DEFAULT_TTL_SECONDS = 60 * 60; // prevent duplicates within an hour

export class FrontierQueue {
  private redis: IORedis.Redis;
  private namespace: string;

  constructor(redisUrl: string, namespace = 'regen:frontier') {
    this.redis = new IORedis(redisUrl);
    this.namespace = namespace;
  }

  async schedule(task: Omit<FrontierTask, 'id'>) {
    const id = randomUUID();
    const key = `${this.namespace}:queue`;
    const fingerprintKey = `${this.namespace}:fingerprint:${task.url}`;

    // avoid re-enqueueing same URL within TTL
    const exists = await this.redis.exists(fingerprintKey);
    if (exists) {
      return null;
    }

    const payload: FrontierTask = { ...task, id };
    await this.redis
      .multi()
      .zadd(key, payload.priority, JSON.stringify(payload))
      .set(fingerprintKey, '1', 'EX', DEFAULT_TTL_SECONDS)
      .exec();

    return id;
  }

  async next(): Promise<FrontierTask | null> {
    const key = `${this.namespace}:queue`;
    const result = await this.redis.zpopmax(key);
    if (!result || result.length === 0) {
      return null;
    }
    try {
      return JSON.parse(result[0]) as FrontierTask;
    } catch {
      return null;
    }
  }

  async close() {
    await this.redis.quit();
  }
}

