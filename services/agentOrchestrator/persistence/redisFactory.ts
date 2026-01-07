/**
 * Redis connection factory for PlanStore
 * Handles connection pooling, configuration, and graceful shutdown
 *
 * Usage:
 * const redis = createRedisConnection();
 * const planStore = new RedisPlanStore(redis);
 */

import Redis, { RedisOptions } from 'ioredis';

let redisInstance: Redis | null = null;

/**
 * Create or retrieve Redis connection singleton
 * Respects environment configuration
 */
export function createRedisConnection(options?: RedisOptions): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  const config: RedisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),

    // Connection pooling
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,

    // Reconnection strategy
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },

    // Timeouts
    connectTimeout: 10000,
    commandTimeout: 5000,

    // Custom settings
    ...options,
  };

  redisInstance = new Redis(config);

  // Log connection events
  redisInstance.on('connect', () => {
    console.log('[Redis] Connected to Redis server');
  });

  redisInstance.on('ready', () => {
    console.log('[Redis] Redis client ready');
  });

  redisInstance.on('error', (err: Error) => {
    console.error('[Redis] Redis client error:', err.message);
  });

  redisInstance.on('close', () => {
    console.log('[Redis] Redis connection closed');
  });

  return redisInstance;
}

/**
 * Get existing Redis connection without creating new one
 */
export function getRedisConnection(): Redis | null {
  return redisInstance;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisInstance) {
    try {
      await redisInstance.quit();
      redisInstance = null;
      console.log('[Redis] Connection closed gracefully');
    } catch (err) {
      console.error('[Redis] Error closing connection:', err);
      // Force disconnect if graceful quit fails
      redisInstance?.disconnect();
      redisInstance = null;
    }
  }
}

/**
 * Test Redis connectivity
 * Returns true if Redis is available and responsive
 */
export async function testRedisConnection(timeoutMs: number = 5000): Promise<boolean> {
  try {
    const redis = createRedisConnection();
    const result = await Promise.race([
      redis.ping(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Ping timeout')), timeoutMs)
      ),
    ]);
    return result === 'PONG';
  } catch (error) {
    console.error(
      '[Redis] Connection test failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return false;
  }
}

/**
 * Get Redis connection info
 */
export async function getRedisInfo(): Promise<{
  connected: boolean;
  host: string;
  port: number;
  db: number;
  version?: string;
}> {
  const redis = getRedisConnection();
  if (!redis) {
    return {
      connected: false,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      db: parseInt(process.env.REDIS_DB || '0', 10),
    };
  }

  try {
    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    const version = versionMatch ? versionMatch[1] : undefined;

    return {
      connected: redis.status === 'ready',
      host: redis.options.host || 'localhost',
      port: redis.options.port || 6379,
      db: redis.options.db || 0,
      version,
    };
  } catch {
    return {
      connected: false,
      host: redis.options.host || 'localhost',
      port: redis.options.port || 6379,
      db: redis.options.db || 0,
    };
  }
}

export default {
  createRedisConnection,
  getRedisConnection,
  closeRedisConnection,
  testRedisConnection,
  getRedisInfo,
};
