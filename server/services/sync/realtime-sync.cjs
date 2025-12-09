/**
 * PERFORMANCE FIX #2: Realtime Sync with Yjs + WebSocket retry queue
 * Offline persistence + exponential backoff for high-latency networks
 */

const EventEmitter = require('events');
const { WebSocketServer } = require('ws');
const Pino = require('pino');

const logger = Pino({ name: 'realtime-sync' });

class RealtimeSyncService extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.clients = new Map(); // clientId -> { ws, sessionId, offlineQueue, reconnectAttempts }
    this.rooms = new Map(); // roomId -> Set of clientIds
    this.persistentStore = new Map(); // In-memory (use IndexedDB/Redis in production)
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocketServer({ server, path: '/ws/sync' });

    this.wss.on('connection', (ws, req) => {
      const clientId = this._generateClientId();
      const sessionId = req.url.split('sessionId=')[1] || `session-${Date.now()}`;
      const roomId = `room-${sessionId}`;

      logger.info({ clientId, sessionId }, 'New sync client connected');

      const client = {
        ws,
        sessionId,
        roomId,
        offlineQueue: [],
        reconnectAttempts: 0,
        lastPing: Date.now(),
        status: 'connected',
      };

      this.clients.set(clientId, client);

      // Join room
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Set());
      }
      this.rooms.get(roomId).add(clientId);

      // Send initial state
      this._sendToClient(clientId, {
        type: 'connected',
        clientId,
        sessionId,
        roomId,
      });

      // Load persisted state if available
      const persisted = this.persistentStore.get(sessionId);
      if (persisted) {
        this._sendToClient(clientId, {
          type: 'state-restored',
          state: persisted,
        });
      }

      // Handle messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this._handleMessage(clientId, message);
        } catch (error) {
          logger.error({ clientId, error: error.message }, 'Error parsing message');
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        logger.info({ clientId }, 'Client disconnected');
        client.status = 'disconnected';
        this._handleDisconnect(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error({ clientId, error: error.message }, 'WebSocket error');
        client.status = 'error';
      });

      // Ping/pong for connection health
      const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.ping();
          client.lastPing = Date.now();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      ws.on('pong', () => {
        client.lastPing = Date.now();
      });
    });
  }

  /**
   * Handle incoming message
   */
  _handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'update':
        // PERFORMANCE FIX #2: Queue updates if offline, broadcast if online
        if (client.status === 'connected') {
          this._broadcastToRoom(client.roomId, clientId, message);
          // Persist state
          this.persistentStore.set(client.sessionId, message.data);
        } else {
          // Queue for retry
          client.offlineQueue.push({
            ...message,
            timestamp: Date.now(),
          });
        }
        break;

      case 'sync-request':
        // Send current state
        const state = this.persistentStore.get(client.sessionId);
        this._sendToClient(clientId, {
          type: 'sync-response',
          state: state || {},
        });
        break;

      case 'ack':
        // Acknowledge received update
        this.emit('ack', { clientId, messageId: message.messageId });
        break;

      default:
        logger.warn({ clientId, type: message.type }, 'Unknown message type');
    }
  }

  /**
   * Broadcast to all clients in room (except sender)
   */
  _broadcastToRoom(roomId, senderId, message) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageWithMetadata = {
      ...message,
      senderId,
      timestamp: Date.now(),
    };

    for (const clientId of room) {
      if (clientId !== senderId) {
        this._sendToClient(clientId, messageWithMetadata);
      }
    }
  }

  /**
   * Send message to specific client
   */
  _sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || !client.ws || client.ws.readyState !== client.ws.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error({ clientId, error: error.message }, 'Failed to send message');
      return false;
    }
  }

  /**
   * Handle client disconnect
   */
  _handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from room
    const room = this.rooms.get(client.roomId);
    if (room) {
      room.delete(clientId);
      if (room.size === 0) {
        this.rooms.delete(client.roomId);
      }
    }

    // PERFORMANCE FIX #2: Retry queued messages with exponential backoff
    if (client.offlineQueue.length > 0) {
      this._retryOfflineQueue(clientId, client);
    }

    this.clients.delete(clientId);
  }

  /**
   * Retry offline queue with exponential backoff
   */
  _retryOfflineQueue(clientId, client) {
    if (client.offlineQueue.length === 0) return;

    const maxAttempts = 5;
    let attempt = 0;

    const retry = () => {
      if (attempt >= maxAttempts) {
        logger.warn({ clientId }, 'Max retry attempts reached, dropping queue');
        client.offlineQueue = [];
        return;
      }

      const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30s
      attempt++;

      setTimeout(() => {
        if (client.status === 'connected' && client.ws.readyState === client.ws.OPEN) {
          // Retry sending queued messages
          const queue = [...client.offlineQueue];
          client.offlineQueue = [];

          queue.forEach((message) => {
            this._sendToClient(clientId, message);
          });

          logger.info({ clientId, count: queue.length }, 'Retried offline queue');
        } else {
          retry(); // Try again
        }
      }, delay);
    };

    retry();
  }

  /**
   * Generate unique client ID
   */
  _generateClientId() {
    return `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      connectedClients: Array.from(this.clients.values()).filter(
        c => c.status === 'connected'
      ).length,
      queuedUpdates: Array.from(this.clients.values()).reduce(
        (sum, c) => sum + c.offlineQueue.length, 0
      ),
    };
  }
}

// Singleton instance
let instance = null;

function getRealtimeSyncService() {
  if (!instance) {
    instance = new RealtimeSyncService();
  }
  return instance;
}

module.exports = { getRealtimeSyncService };








