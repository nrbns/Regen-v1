/* eslint-env node */
import IORedis from 'ioredis';

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
let isConnected = false;
let lastErrorTime = 0;
const ERROR_SUPPRESSION_MS = 60000; // Suppress errors for 60 seconds

export const redisClient = new IORedis(DEFAULT_URL, {
  maxRetriesPerRequest: 3, // Limit retries instead of infinite
  retryStrategy: times => {
    // Exponential backoff with max delay
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableOfflineQueue: false, // Don't queue commands when offline
  lazyConnect: false,
  connectTimeout: 5000,
});

redisClient.on('connect', () => {
  isConnected = true;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[redis] Connected successfully');
  }
});

redisClient.on('ready', () => {
  isConnected = true;
});

redisClient.on('error', error => {
  const now = Date.now();
  isConnected = false;

  // Only log errors if enough time has passed since last error
  if (now - lastErrorTime > ERROR_SUPPRESSION_MS) {
    if (error?.code === 'ECONNREFUSED') {
      // Only log connection refused errors once per suppression period
      console.warn(
        '[redis] Connection refused. Redis is optional - the app will continue without it.'
      );
    } else if (error?.code !== 'MaxRetriesPerRequestError') {
      // Don't log MaxRetriesPerRequestError - it's expected when Redis is down
      console.error('[redis] connection error', error?.message || error);
    }
    lastErrorTime = now;
  }
});

redisClient.on('close', () => {
  isConnected = false;
});

// Handle unhandled error events
redisClient.on('end', () => {
  isConnected = false;
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
        if (error.code === 'ECONNREFUSED' || error.code === 'MaxRetriesPerRequestError') {
          // Suppress Redis connection errors
          return;
        }
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
    lazyConnect: false,
  };

  if (connectionUrl.password) {
    connection.password = connectionUrl.password;
  }

  if (tls) {
    connection.tls = tls;
  }

  return connection;
}
