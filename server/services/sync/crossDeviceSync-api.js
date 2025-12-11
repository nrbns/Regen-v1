/**
 * Cross-Device Sync API (Fastify)
 * REST endpoints for history, bookmarks, and settings sync
 */

const { getSyncDatabase } = require('./syncDatabase');
const { SyncQueue } = require('./syncQueue');
const { authenticateSync } = require('./syncAuth');

// Initialize sync components
let syncDb = null;
let syncQueue = null;

async function initializeSyncAPI() {
  syncDb = await getSyncDatabase();
  syncQueue = new SyncQueue(syncDb);
  await syncQueue.initialize();
}

/**
 * Register sync routes
 */
async function registerSyncRoutes(fastifyInstance) {
  // Authentication middleware for sync endpoints
  fastifyInstance.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/sync/health')) {
      return; // Skip auth for health check
    }

    const authResult = await authenticateSync(request);
    if (!authResult.authenticated) {
      return reply.code(401).send({ error: 'Unauthorized', message: authResult.error });
    }

    request.userId = authResult.userId;
    request.deviceId = authResult.deviceId;
  });

  /**
   * Health check
   */
  fastifyInstance.get('/sync/health', async (_request, _reply) => {
    return {
      status: 'ok',
      service: 'cross-device-sync',
      timestamp: Date.now(),
      database: syncDb ? 'connected' : 'disconnected',
    };
  });

  /**
   * Get sync data for user
   */
  fastifyInstance.get('/sync/:userId', async (request, reply) => {
    const { userId } = request.params;

    try {
      const data = await syncDb.getSyncData(userId);
      return {
        success: true,
        data: {
          history: data.history || [],
          bookmarks: data.bookmarks || [],
          bookmarkFolders: data.bookmarkFolders || [],
          settings: data.settings || {},
          lastSynced: data.lastSynced || 0,
        },
      };
    } catch (error) {
      fastifyInstance.log.error({ userId, error: error.message }, 'Error getting sync data');
      return reply.code(500).send({
        success: false,
        error: 'Failed to get sync data',
        message: error.message,
      });
    }
  });

  /**
   * Push sync data to server
   */
  fastifyInstance.post('/sync/:userId', async (request, reply) => {
    const { userId } = request.params;
    const { history, bookmarks, bookmarkFolders, settings, lastSynced } = request.body;

    try {
      await syncDb.saveSyncData(userId, {
        history: history || [],
        bookmarks: bookmarks || [],
        bookmarkFolders: bookmarkFolders || [],
        settings: settings || {},
        lastSynced: lastSynced || Date.now(),
      });

      return {
        success: true,
        message: 'Sync data saved',
      };
    } catch (error) {
      fastifyInstance.log.error({ userId, error: error.message }, 'Error saving sync data');
      return reply.code(500).send({
        success: false,
        error: 'Failed to save sync data',
        message: error.message,
      });
    }
  });

  /**
   * Delta sync - Get changes since timestamp
   */
  fastifyInstance.get('/sync/:userId/delta', async (request, reply) => {
    const { userId } = request.params;
    const since = parseInt(request.query.since || '0', 10);
    const deviceId = request.headers['x-device-id'] || request.deviceId;

    try {
      const changes = await syncDb.getChangesSince(userId, since, deviceId);
      return {
        success: true,
        changes,
      };
    } catch (error) {
      fastifyInstance.log.error({ userId, since, error: error.message }, 'Error getting delta');
      return reply.code(500).send({
        success: false,
        error: 'Failed to get delta',
        message: error.message,
      });
    }
  });

  /**
   * Delta sync - Push local changes
   */
  fastifyInstance.post('/sync/:userId/delta', async (request, reply) => {
    const { userId } = request.params;
    const delta = request.body;
    const deviceId = request.headers['x-device-id'] || request.deviceId;

    try {
      // Apply changes to database
      await syncDb.applyChanges(userId, deviceId, delta);

      // Get remote changes to return
      const remoteChanges = await syncDb.getChangesSince(userId, delta.lastSynced || 0, deviceId);

      return {
        success: true,
        changes: remoteChanges,
      };
    } catch (error) {
      fastifyInstance.log.error({ userId, error: error.message }, 'Error applying delta');
      return reply.code(500).send({
        success: false,
        error: 'Failed to apply delta',
        message: error.message,
      });
    }
  });

  /**
   * Get sync status
   */
  fastifyInstance.get('/sync/:userId/status', async (request, reply) => {
    const { userId } = request.params;

    try {
      const status = await syncDb.getSyncStatus(userId);
      return {
        success: true,
        status,
      };
    } catch (error) {
      fastifyInstance.log.error({ userId, error: error.message }, 'Error getting sync status');
      return reply.code(500).send({
        success: false,
        error: 'Failed to get sync status',
        message: error.message,
      });
    }
  });

  /**
   * Resolve conflicts
   */
  fastifyInstance.post('/sync/:userId/conflicts/resolve', async (request, reply) => {
    const { userId } = request.params;
    const { conflicts, strategy } = request.body;

    try {
      const resolved = await syncDb.resolveConflicts(userId, conflicts, strategy);
      return {
        success: true,
        resolved,
      };
    } catch (error) {
      fastifyInstance.log.error({ userId, error: error.message }, 'Error resolving conflicts');
      return reply.code(500).send({
        success: false,
        error: 'Failed to resolve conflicts',
        message: error.message,
      });
    }
  });
}

// Export for use in main server
module.exports = {
  registerSyncRoutes,
  initializeSyncAPI,
};
