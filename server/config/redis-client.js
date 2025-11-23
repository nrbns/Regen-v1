/**
 * Redis Client Adapter
 * CommonJS wrapper for Redis connection
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const IORedis = require('ioredis');

const DEFAULT_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let client = null;
let isConnected = false;

/**
 * Get or create Redis client
 */
function getClient() {
  if (client && client.status === 'ready') {
    return client;
  }

  if (!client) {
    client = new IORedis(DEFAULT_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: times => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableOfflineQueue: false,
      lazyConnect: true, // Don't connect immediately - connect on first use
      connectTimeout: 5000,
    });

    client.on('connect', () => {
      isConnected = true;
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Redis] Connected successfully');
      }
    });

    client.on('ready', () => {
      isConnected = true;
    });

    client.on('error', error => {
      isConnected = false;
      if (error?.code !== 'ECONNREFUSED' && error?.code !== 'MaxRetriesPerRequestError') {
        console.error('[Redis] Connection error', error?.message || error);
      }
    });

    client.on('close', () => {
      isConnected = false;
    });

    client.on('end', () => {
      isConnected = false;
    });
  }

  return client;
}

/**
 * Check if client is connected
 */
function isClientConnected() {
  return isConnected && client && client.status === 'ready';
}

module.exports = {
  getClient,
  isClientConnected,
};
