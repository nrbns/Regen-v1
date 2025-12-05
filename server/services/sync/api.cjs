/**
 * Sync Service API
 * REST endpoints for sync service
 */

const express = require('express');
const { getSyncService } = require('./sync-service.cjs');
const Pino = require('pino');

const logger = Pino({ name: 'sync-api' });
const router = express.Router();

// Initialize sync service
const syncService = getSyncService();
syncService.initialize().catch(err => {
  logger.error({ error: err.message }, 'Failed to initialize sync service');
});

/**
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sync',
    timestamp: Date.now(),
  });
});

/**
 * Record heartbeat
 */
router.post('/heartbeat', async (req, res) => {
  const { sessionId, workerId, tabs } = req.body;

  if (!sessionId || !workerId) {
    return res.status(400).json({
      error: 'sessionId and workerId required',
    });
  }

  try {
    await syncService.recordHeartbeat(sessionId, workerId, tabs || []);
    res.json({
      success: true,
      sessionId,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error({ sessionId, error: error.message }, 'Error recording heartbeat');
    res.status(500).json({
      error: 'Failed to record heartbeat',
      message: error.message,
    });
  }
});

/**
 * Get active sessions
 */
router.get('/active-sessions', async (req, res) => {
  try {
    const sessions = await syncService.getActiveSessions();
    res.json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Error getting active sessions');
    res.status(500).json({
      error: 'Failed to get active sessions',
      message: error.message,
    });
  }
});

/**
 * Sync tab state
 */
router.post('/tab/:sessionId/:tabId', async (req, res) => {
  const { sessionId, tabId } = req.params;
  const state = req.body;

  try {
    await syncService.syncTabState(sessionId, tabId, state);
    res.json({
      success: true,
      sessionId,
      tabId,
    });
  } catch (error) {
    logger.error({ sessionId, tabId, error: error.message }, 'Error syncing tab state');
    res.status(500).json({
      error: 'Failed to sync tab state',
      message: error.message,
    });
  }
});

/**
 * Get tab state
 */
router.get('/tab/:sessionId/:tabId', async (req, res) => {
  const { sessionId, tabId } = req.params;

  try {
    const state = await syncService.getTabState(sessionId, tabId);
    if (!state) {
      return res.status(404).json({
        error: 'Tab state not found',
      });
    }

    res.json({
      success: true,
      state,
    });
  } catch (error) {
    logger.error({ sessionId, tabId, error: error.message }, 'Error getting tab state');
    res.status(500).json({
      error: 'Failed to get tab state',
      message: error.message,
    });
  }
});

/**
 * Resolve conflict
 */
router.post('/resolve-conflict/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { tabId1, tabId2 } = req.body;

  if (!tabId1 || !tabId2) {
    return res.status(400).json({
      error: 'tabId1 and tabId2 required',
    });
  }

  try {
    const resolved = await syncService.resolveConflict(sessionId, tabId1, tabId2);
    res.json({
      success: true,
      resolved,
    });
  } catch (error) {
    logger.error({ sessionId, tabId1, tabId2, error: error.message }, 'Error resolving conflict');
    res.status(500).json({
      error: 'Failed to resolve conflict',
      message: error.message,
    });
  }
});

module.exports = router;
