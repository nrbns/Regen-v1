/**
 * Production-Grade Sync Service
 * Multi-tab synchronization with conflict resolution
 * Uses Redis for distributed state management
 */

const EventEmitter = require('events');
const { getRedisClient } = require('../../config/redis-client');
const Pino = require('pino');

const logger = Pino({ name: 'sync-service' });

class SyncService extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.activeSessions = new Map(); // sessionId -> { lastHeartbeat, workerId, tabs }
    this.heartbeatInterval = null;
    this.cleanupInterval = null;
  }

  /**
   * Initialize sync service
   */
  async initialize() {
    this.redis = getRedisClient();
    
    if (!this.redis) {
      logger.warn('Redis not available - sync service will be limited');
      return;
    }

    // Start heartbeat cleanup
    this.startHeartbeatCleanup();
    
    // Start stale session cleanup
    this.startStaleSessionCleanup();

    logger.info('Sync service initialized');
  }

  /**
   * Record heartbeat for active session
   */
  async recordHeartbeat(sessionId, workerId, tabs = []) {
    if (!this.redis) {
      return;
    }

    try {
      const now = Date.now();
      const heartbeatKey = `sync:heartbeat:${sessionId}`;
      const sessionKey = `sync:session:${sessionId}`;

      // Update heartbeat
      await this.redis.set(heartbeatKey, JSON.stringify({
        sessionId,
        workerId,
        timestamp: now,
        tabs: tabs.map(t => ({ id: t.id, url: t.url, title: t.title })),
      }), 'EX', 120); // 2 minute TTL

      // Update session metadata
      await this.redis.hset(sessionKey, {
        lastHeartbeat: now,
        workerId,
        tabCount: tabs.length,
      });
      await this.redis.expire(sessionKey, 300); // 5 minute TTL

      // Update in-memory cache
      this.activeSessions.set(sessionId, {
        lastHeartbeat: now,
        workerId,
        tabs,
      });

      this.emit('heartbeat', { sessionId, workerId, tabs });
    } catch (error) {
      logger.error({ sessionId, error: error.message }, 'Error recording heartbeat');
    }
  }

  /**
   * Get active sessions
   */
  async getActiveSessions() {
    if (!this.redis) {
      return Array.from(this.activeSessions.entries()).map(([id, data]) => ({
        sessionId: id,
        ...data,
      }));
    }

    try {
      const pattern = 'sync:session:*';
      const keys = await this.redis.keys(pattern);
      const sessions = [];

      for (const key of keys) {
        const sessionId = key.replace('sync:session:', '');
        const metadata = await this.redis.hgetall(key);
        const heartbeatKey = `sync:heartbeat:${sessionId}`;
        const heartbeatData = await this.redis.get(heartbeatKey);

        sessions.push({
          sessionId,
          ...metadata,
          heartbeat: heartbeatData ? JSON.parse(heartbeatData) : null,
        });
      }

      return sessions;
    } catch (error) {
      logger.error({ error: error.message }, 'Error getting active sessions');
      return [];
    }
  }

  /**
   * Sync tab state across multiple tabs
   */
  async syncTabState(sessionId, tabId, state) {
    if (!this.redis) {
      throw new Error('Redis not available');
    }

    try {
      const tabKey = `sync:tab:${sessionId}:${tabId}`;
      const stateData = {
        ...state,
        sessionId,
        tabId,
        timestamp: Date.now(),
      };

      await this.redis.set(tabKey, JSON.stringify(stateData), 'EX', 300);
      
      // Publish sync event
      await this.redis.publish(`sync:events:${sessionId}`, JSON.stringify({
        type: 'tab:update',
        tabId,
        state: stateData,
      }));

      this.emit('tab:sync', { sessionId, tabId, state: stateData });
    } catch (error) {
      logger.error({ sessionId, tabId, error: error.message }, 'Error syncing tab state');
      throw error;
    }
  }

  /**
   * Get tab state
   */
  async getTabState(sessionId, tabId) {
    if (!this.redis) {
      return null;
    }

    try {
      const tabKey = `sync:tab:${sessionId}:${tabId}`;
      const data = await this.redis.get(tabKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error({ sessionId, tabId, error: error.message }, 'Error getting tab state');
      return null;
    }
  }

  /**
   * Resolve conflicts between tabs
   */
  async resolveConflict(sessionId, tabId1, tabId2) {
    if (!this.redis) {
      return null;
    }

    try {
      const state1 = await this.getTabState(sessionId, tabId1);
      const state2 = await this.getTabState(sessionId, tabId2);

      if (!state1 || !state2) {
        return state1 || state2;
      }

      // Last-write-wins with timestamp comparison
      if (state1.timestamp > state2.timestamp) {
        await this.syncTabState(sessionId, tabId2, state1);
        return state1;
      } else {
        await this.syncTabState(sessionId, tabId1, state2);
        return state2;
      }
    } catch (error) {
      logger.error({ sessionId, tabId1, tabId2, error: error.message }, 'Error resolving conflict');
      return null;
    }
  }

  /**
   * Start heartbeat cleanup (runs every 30 seconds)
   */
  startHeartbeatCleanup() {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(async () => {
      if (!this.redis) {
        return;
      }

      try {
        const pattern = 'sync:heartbeat:*';
        const keys = await this.redis.keys(pattern);
        const now = Date.now();
        const staleThreshold = 120000; // 2 minutes

        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            const heartbeat = JSON.parse(data);
            if (now - heartbeat.timestamp > staleThreshold) {
              await this.redis.del(key);
              logger.debug({ sessionId: heartbeat.sessionId }, 'Removed stale heartbeat');
            }
          }
        }
      } catch (error) {
        logger.error({ error: error.message }, 'Error in heartbeat cleanup');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Start stale session cleanup (runs every 5 minutes)
   */
  startStaleSessionCleanup() {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(async () => {
      if (!this.redis) {
        return;
      }

      try {
        const pattern = 'sync:session:*';
        const keys = await this.redis.keys(pattern);
        const now = Date.now();
        const staleThreshold = 300000; // 5 minutes

        for (const key of keys) {
          const metadata = await this.redis.hgetall(key);
          const lastHeartbeat = parseInt(metadata.lastHeartbeat || '0', 10);

          if (now - lastHeartbeat > staleThreshold) {
            const sessionId = key.replace('sync:session:', '');
            await this.redis.del(key);
            await this.redis.del(`sync:heartbeat:${sessionId}`);
            
            // Clean up tab states
            const tabPattern = `sync:tab:${sessionId}:*`;
            const tabKeys = await this.redis.keys(tabPattern);
            if (tabKeys.length > 0) {
              await this.redis.del(...tabKeys);
            }

            logger.info({ sessionId }, 'Cleaned up stale session');
            this.emit('session:stale', { sessionId });
          }
        }
      } catch (error) {
        logger.error({ error: error.message }, 'Error in stale session cleanup');
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Shutdown sync service
   */
  async shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.activeSessions.clear();
    logger.info('Sync service shut down');
  }
}

// Singleton instance
let syncServiceInstance = null;

function getSyncService() {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
}

module.exports = { SyncService, getSyncService };
