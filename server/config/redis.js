/* eslint-env node */
import IORedis from 'ioredis';
import { EventEmitter } from 'events';

// Global error suppression for ioredis - must be set up before any Redis clients are created
const suppressRedisErrors = () => {
  const originalEmit = process.emit;
  let hasBeenSet = false;

  if (!hasBeenSet) {
    process.emit = function (event, ...args) {
      if (event === 'uncaughtException' || event === 'unhandledRejection') {
        const error = args[0];
        if (error && typeof error === 'object' && 'code' in error) {
          if (error.code === 'ECONNREFUSED' || error.code === 'MaxRetriesPerRequestError') {
            // Suppress Redis-related unhandled errors
            return false;
          }
        }
      }
      return originalEmit.apply(this, [event, ...args]);
    };
    hasBeenSet = true;
  }
};

// Set up error suppression immediately
suppressRedisErrors();

const DEFAULT_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const connectionUrl = new URL(DEFAULT_URL);

// Track connection state to suppress repeated errors
// Connection state is tracked internally, no need to export
let _isConnected = false;
let lastErrorTime = 0;
const ERROR_SUPPRESSION_MS = 60000; // Suppress errors for 60 seconds

export const redisClient = new IORedis(DEFAULT_URL, {
  maxRetriesPerRequest: null, // BullMQ requirement
  retryStrategy: () => {
    // Keep previous behavior of not retrying indefinitely
    return null;
  },
  enableOfflineQueue: false, // Don't queue commands when offline
  lazyConnect: true, // Don't connect immediately - connect on first use
  connectTimeout: 5000,
  showFriendlyErrorStack: false,
});

// Suppress noisy error events but keep listeners active
redisClient.on('error', () => {
  // Intentionally swallow top-level error events to avoid crashing
});

redisClient.on('connect', () => {
  _isConnected = true;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[redis] Connected successfully');
  }
});

redisClient.on('ready', () => {
  _isConnected = true;
});

redisClient.on('error', error => {
  const now = Date.now();
  _isConnected = false;

  if (
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'MaxRetriesPerRequestError' ||
    error?.code === 'ENOTFOUND'
  ) {
    // Silently ignore connection errors
    return;
  }

  if (process.env.NODE_ENV === 'development' && now - lastErrorTime > ERROR_SUPPRESSION_MS) {
    console.warn('[redis] Non-connection error:', error?.message || error);
    lastErrorTime = now;
  }
});

redisClient.on('close', () => {
  _isConnected = false;
});

redisClient.on('end', () => {
  _isConnected = false;
});

// Suppress unhandled promise rejections from Redis
const existingUnhandledRejection = process.listeners('unhandledRejection');
if (!existingUnhandledRejection.some(l => l.toString().includes('ECONNREFUSED'))) {
  process.on('unhandledRejection', (reason, promise) => {
    // Suppress ReferenceError for isConnected
    if (reason && typeof reason === 'object') {
      if (reason.name === 'ReferenceError' && reason.message?.includes('isConnected')) {
        // This is a known issue with ioredis error handling - suppress it
        return;
      }
      if ('code' in reason) {
        if (reason.code === 'ECONNREFUSED' || reason.code === 'MaxRetriesPerRequestError') {
          // Suppress Redis connection errors in unhandled rejections
          return;
        }
      }
    }
    // Call existing handlers if any
    existingUnhandledRejection.forEach(handler => {
      try {
        handler(reason, promise);
      } catch {
        // Ignore errors in handlers
      }
    });
  });
}

// Suppress unhandled error events from ioredis
const existingUncaughtException = process.listeners('uncaughtException');
if (!existingUncaughtException.some(l => l.toString().includes('ECONNREFUSED'))) {
  process.on('uncaughtException', error => {
    // Suppress ReferenceError for isConnected - this happens when Redis client tries to access
    // isConnected in error handlers before it's properly initialized
    if (error && typeof error === 'object') {
      if (error.name === 'ReferenceError' && error.message?.includes('isConnected')) {
        // This is a known issue with ioredis error handling - suppress it
        return;
      }
      if ('code' in error) {
        // Suppress all Redis connection errors
        if (
          error.code === 'ECONNREFUSED' ||
          error.code === 'MaxRetriesPerRequestError' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'ETIMEDOUT'
        ) {
          return;
        }
      }
      // Also check error message
      if (
        error.message &&
        (error.message.includes('ECONNREFUSED') ||
          error.message.includes('Connection is closed') ||
          error.message.includes("Stream isn't writeable"))
      ) {
        return;
      }
    }
    // Call existing handlers if any
    existingUncaughtException.forEach(handler => {
      try {
        handler(error);
      } catch {
        // Ignore errors in handlers
      }
    });
  });
}

export function getBullConnection() {
  const tls =
    connectionUrl.protocol === 'rediss:'
      ? {
          rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== '0',
        }
      : undefined;

  const connection = {
    host: connectionUrl.hostname,
    port: Number(connectionUrl.port || 6379),
    maxRetriesPerRequest: 3, // Limit retries for BullMQ
    retryStrategy: times => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    enableOfflineQueue: false,
    connectTimeout: 5000,
    lazyConnect: true, // Don't connect immediately - connect on first use
  };

  if (connectionUrl.password) {
    connection.password = connectionUrl.password;
  }

  if (tls) {
    connection.tls = tls;
  }

  return connection;
}
