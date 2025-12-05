/**
 * WebSocket Server for Real-Time Communication
 * Handles browser connections and forwards Redis events
 */

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { subscribe as subscribePubSub } from '../../pubsub.js';
// Redis client reserved for future use

const log = {
  info: (msg, meta) => console.log(`[WebSocketServer] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[WebSocketServer] ERROR: ${msg}`, meta || ''),
};

// Map clientId -> WebSocket
const wsClients = new Map();

// Map jobId -> Set of WebSocket clients (for research events)
const jobClients = new Map();

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

  // Initialize Redis subscriber (optional - fails gracefully if Redis unavailable)
  try {
    initRedisSubscriber();
  } catch (error) {
    log.warn('[WS] Redis subscriber init failed (optional)', { error: error.message });
  }

  // Subscribe to research events channel (fails gracefully if Redis unavailable)
  try {
    subscribePubSub('research.event', event => {
      const jobId = event.jobId;
    if (!jobId) {
      log.warn('[WS-FORWARDER] Event missing jobId', { event });
      return;
    }

    log.info('[WS-FORWARDER] Got event', {
      eventType: event.eventType || event.type,
      jobId,
      hasClients: jobClients.has(jobId),
    });

    const clients = jobClients.get(jobId);
    if (!clients || clients.size === 0) {
      log.warn('[WS-FORWARDER] No clients subscribed to job', {
        jobId,
        totalJobs: jobClients.size,
      });
      return;
    }

    // Ensure event has ID for deduplication
    if (!event.id) {
      event.id = uuidv4();
    }

    const payload = JSON.stringify(event);
    let forwardedCount = 0;

    // Forward to all subscribed clients
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
          forwardedCount++;
        } catch (error) {
          log.warn('[WS-FORWARDER] Failed to send to client', {
            jobId,
            error: error.message,
          });
        }
      } else {
        log.debug('[WS-FORWARDER] Client not open', {
          jobId,
          readyState: ws.readyState,
        });
      }
    }

    if (forwardedCount > 0) {
      log.info('[WS-FORWARDER] Forwarded event to clients', {
        jobId,
        eventType: event.eventType || event.type,
        count: forwardedCount,
      });
    }
    });
  } catch (error) {
    log.warn('[WS] Redis subscription failed (optional)', { error: error.message });
  }

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

        // Handle research job subscription
        if (message.type === 'subscribe' && message.jobId) {
          log.info('[WS] Client subscribed to job', { clientId, jobId: message.jobId });
          const set = jobClients.get(message.jobId) || new Set();
          set.add(ws);
          jobClients.set(message.jobId, set);
          ws.__sub_jobId = message.jobId;

          log.info('[WS] Job clients count', { jobId: message.jobId, count: set.size });

          // Send confirmation
          ws.send(
            JSON.stringify({
              id: uuidv4(),
              type: 'subscribed',
              jobId: message.jobId,
              timestamp: Date.now(),
            })
          );
          return;
        }

        handleClientMessage(clientId, sessionId, message);
      } catch (error) {
        log.error('Failed to parse client message', { clientId, error: error.message });
      }
    });

    // Handle connection close
    ws.on('close', () => {
      log.info('WebSocket disconnected', { clientId });
      wsClients.delete(clientId);

      // Clean up job subscriptions
      const jobId = ws.__sub_jobId;
      if (jobId) {
        const set = jobClients.get(jobId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) {
            jobClients.delete(jobId);
          }
        }
      }
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
    const IORedis = (await import('ioredis')).default;
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

    redisSub = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // BullMQ requirement
      enableOfflineQueue: false,
      retryStrategy: () => {
        // Don't retry - Redis is optional
        return null;
      },
      connectTimeout: 5000,
      lazyConnect: true, // Don't connect immediately - connect on first use
      showFriendlyErrorStack: false,
    });

    // Handle connection events
    redisSub.on('connect', () => {
      log.info('Redis subscriber connected');
    });

    // Completely suppress all Redis errors - Redis is optional
    redisSub.on('error', () => {
      // Silently ignore all Redis errors - Redis is optional
      // Do nothing - errors are expected when Redis is unavailable
    });

    // Try to connect, but don't fail if Redis is unavailable
    try {
      await redisSub.connect().catch(() => {
        // Silently ignore connection failures - Redis is optional
      });

      // Subscribe to all client channels with pattern (only if connected)
      if (redisSub.status === 'ready') {
        await redisSub.psubscribe('regen:out:*').catch(() => {
          // Silently ignore subscription failures - Redis is optional
        });
        log.info('Redis subscriber subscribed to regen:out:*');
      }
    } catch {
      // Silently ignore - Redis is optional
    }

    redisSub.on('pmessage', (pattern, channel, message) => {
      try {
        const clientId = channel.replace('regen:out:', '');
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

        // Parse message to ensure it has an ID
        let parsedMessage;
        try {
          parsedMessage = JSON.parse(message);
          // Ensure message has unique ID for deduplication
          if (!parsedMessage.id) {
            parsedMessage.id = uuidv4();
          }
          message = JSON.stringify(parsedMessage);
        } catch {
          // If not JSON, wrap it
          parsedMessage = { id: uuidv4(), data: message };
          message = JSON.stringify(parsedMessage);
        }

        // Forward event to WebSocket
        client.ws.send(message);
        log.debug('Forwarded Redis event to WebSocket', {
          clientId,
          channel,
          messageId: parsedMessage.id,
        });
      } catch (error) {
        log.error('Failed to forward Redis event to WebSocket', { channel, error: error.message });
      }
    });

    log.info('Redis subscriber initialized and subscribed to regen:out:*');
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
      const { redisPub } = await import('../../config/redis-client.js');
      if (redisPub && redisPub.status === 'ready') {
        const channel = `regen:out:${event.clientId}`;
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

export {
  initWebSocketServer,
  sendToClient,
  getConnectedClientsCount,
  isClientConnected,
  closeClient,
};
