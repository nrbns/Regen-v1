/**
 * WebSocket Server for Real-Time Communication
 * Handles browser connections and forwards Redis events
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
// Redis client reserved for future use

const log = {
  info: (msg, meta) => console.log(`[WebSocketServer] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[WebSocketServer] ERROR: ${msg}`, meta || ''),
};

// Map clientId -> WebSocket
const wsClients = new Map();

// Redis subscriber for Pub/Sub
let redisSub = null;

/**
 * Initialize WebSocket server
 */
function initWebSocketServer(httpServer) {
  if (!httpServer) {
    log.error('Cannot initialize WebSocket server: httpServer is null');
    return null;
  }

  const wss = new WebSocket.Server({
    server: httpServer,
    path: '/agent/stream',
    perMessageDeflate: false, // Disable compression for lower latency
    clientTracking: true,
  });

  // Initialize Redis subscriber
  initRedisSubscriber();

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const clientId = url.searchParams.get('clientId');
    const sessionId = url.searchParams.get('sessionId') || `session-${uuidv4()}`;

    if (!clientId) {
      log.error('WebSocket connection rejected: missing clientId');
      ws.close(1008, 'Missing clientId');
      return;
    }

    log.info('WebSocket connected', { clientId, sessionId });

    // Store connection
    wsClients.set(clientId, { ws, sessionId, connectedAt: Date.now() });

    // Send welcome message
    sendToClient({
      id: uuidv4(),
      clientId,
      sessionId,
      type: 'status',
      phase: 'idle',
      timestamp: Date.now(),
      version: 1,
    });

    // Handle incoming messages from browser
    ws.on('message', raw => {
      try {
        const message = JSON.parse(raw.toString());
        handleClientMessage(clientId, sessionId, message);
      } catch (error) {
        log.error('Failed to parse client message', { clientId, error: error.message });
      }
    });

    // Handle connection close
    ws.on('close', () => {
      log.info('WebSocket disconnected', { clientId });
      wsClients.delete(clientId);
    });

    // Handle errors
    ws.on('error', error => {
      log.error('WebSocket error', { clientId, error: error.message });
      wsClients.delete(clientId);
    });
  });

  log.info('WebSocket server initialized', { path: '/agent/stream' });
  return wss;
}

/**
 * Initialize Redis subscriber to listen for events
 */
async function initRedisSubscriber() {
  // Only initialize if Redis is available
  if (process.env.DISABLE_REDIS === '1') {
    log.info('Redis subscriber disabled via DISABLE_REDIS=1');
    return;
  }

  try {
    const IORedis = require('ioredis');
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

    redisSub = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      retryStrategy: times => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      connectTimeout: 5000,
      lazyConnect: true, // Don't connect immediately - connect on first use
    });

    // Handle connection events
    redisSub.on('connect', () => {
      log.info('Redis subscriber connected');
    });

    redisSub.on('error', error => {
      // Completely suppress all Redis connection errors - Redis is optional
      if (
        error?.code === 'ECONNREFUSED' ||
        error?.code === 'MaxRetriesPerRequestError' ||
        error?.code === 'ENOTFOUND' ||
        error?.code === 'ETIMEDOUT' ||
        error?.message?.includes('Connection is closed')
      ) {
        // Silently ignore - Redis is optional
        return;
      }
      // Only log non-connection errors in debug mode
      if (log.level === 'debug') {
        log.debug('Redis subscriber non-connection error', { error: error.message });
      }
    });

    // Try to connect, but don't fail if Redis is unavailable
    try {
      await redisSub.connect();

      // Subscribe to all client channels with pattern (only if connected)
      if (redisSub.status === 'ready') {
        try {
          await redisSub.psubscribe('omnibrowser:out:*');
        } catch (error) {
          if (
            error?.code === 'ECONNREFUSED' ||
            error?.code === 'ENOTFOUND' ||
            error?.code === 'MaxRetriesPerRequestError' ||
            error?.message?.includes("Stream isn't writeable")
          ) {
            // Silently ignore - Redis is optional
            return;
          }
          if (log.level === 'debug') {
            log.debug('Redis subscription failed (non-critical)', { error: error.message });
          }
        }
      }
    } catch (error) {
      if (
        error?.code === 'ECONNREFUSED' ||
        error?.code === 'ENOTFOUND' ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'MaxRetriesPerRequestError'
      ) {
        // Silently ignore - Redis is optional
        return;
      }
      // Only log non-connection errors
      if (log.level === 'debug') {
        log.debug('Redis connection failed (non-critical)', { error: error.message });
      }
    }

    redisSub.on('pmessage', (pattern, channel, message) => {
      try {
        const clientId = channel.replace('omnibrowser:out:', '');
        const client = wsClients.get(clientId);

        if (!client) {
          log.debug('Client not found for Redis message', { clientId });
          return;
        }

        if (client.ws.readyState !== WebSocket.OPEN) {
          log.debug('WebSocket not open for client', {
            clientId,
            readyState: client.ws.readyState,
          });
          return;
        }

        // Forward event to WebSocket
        client.ws.send(message);
        log.debug('Forwarded Redis event to WebSocket', { clientId, channel });
      } catch (error) {
        log.error('Failed to forward Redis event to WebSocket', { channel, error: error.message });
      }
    });

    log.info('Redis subscriber initialized and subscribed to omnibrowser:out:*');
  } catch (error) {
    // Don't fail if Redis is unavailable - continue with direct WebSocket
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      log.info(
        'Redis not available, continuing without Pub/Sub. Events will be sent directly via WebSocket.'
      );
    } else {
      log.error('Failed to initialize Redis subscriber', { error: error.message });
    }
  }
}

/**
 * Handle incoming message from client
 */
function handleClientMessage(clientId, sessionId, message) {
  log.info('Client message received', { clientId, sessionId, type: message.type });

  // Handle different message types
  switch (message.type) {
    case 'ping':
      // Respond to ping
      sendToClient({
        id: uuidv4(),
        clientId,
        sessionId,
        type: 'status',
        phase: 'idle',
        timestamp: Date.now(),
        version: 1,
      });
      break;

    case 'query':
      // Forward to Regen handler (will be handled by API endpoint)
      // This is just for real-time status updates
      break;

    default:
      log.warn('Unknown client message type', { clientId, type: message.type });
  }
}

/**
 * Send event to client via Redis Pub/Sub or direct WebSocket
 */
async function sendToClient(event) {
  if (!event || !event.clientId) {
    log.error('Invalid event: missing clientId', { event });
    return false;
  }

  // Try direct WebSocket first (faster, no Redis dependency)
  const wsClient = wsClients.get(event.clientId);
  if (wsClient && wsClient.ws.readyState === WebSocket.OPEN) {
    try {
      const message = JSON.stringify(event);
      wsClient.ws.send(message);
      log.debug('Event sent directly to WebSocket', { clientId: event.clientId, type: event.type });
      return true;
    } catch (wsError) {
      log.error('Failed to send via direct WebSocket', {
        clientId: event.clientId,
        error: wsError.message,
      });
    }
  } else {
    log.debug('WebSocket client not available', {
      clientId: event.clientId,
      hasClient: !!wsClient,
      readyState: wsClient?.ws?.readyState,
    });
  }

  // Fallback: try Redis Pub/Sub if available
  if (redisSub && redisSub.status === 'ready') {
    try {
      const { redisPub } = require('../../config/redis-client');
      if (redisPub && redisPub.status === 'ready') {
        const channel = `omnibrowser:out:${event.clientId}`;
        await redisPub.publish(channel, JSON.stringify(event));
        log.debug('Event sent via Redis Pub/Sub', { clientId: event.clientId, type: event.type });
        return true;
      }
    } catch (error) {
      log.debug('Redis Pub/Sub not available', { error: error.message });
    }
  }

  log.warn('Failed to send event to client - no available transport', {
    clientId: event.clientId,
    type: event.type,
  });
  return false;
}

/**
 * Get connected clients count
 */
function getConnectedClientsCount() {
  return wsClients.size;
}

/**
 * Check if client is connected
 */
function isClientConnected(clientId) {
  const client = wsClients.get(clientId);
  return client && client.ws.readyState === WebSocket.OPEN;
}

/**
 * Close connection for a client
 */
function closeClient(clientId) {
  const client = wsClients.get(clientId);
  if (client) {
    client.ws.close();
    wsClients.delete(clientId);
    log.info('Client connection closed', { clientId });
  }
}

module.exports = {
  initWebSocketServer,
  sendToClient,
  getConnectedClientsCount,
  isClientConnected,
  closeClient,
};
