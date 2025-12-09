/**
 * Browser Automation API
 * REST and WebSocket endpoints for browser automation
 */

const express = require('express');
const { WebSocketServer } = require('ws');
const { getBrowserEventBridge } = require('./browser-event-bridge.cjs');
const Pino = require('pino');

const logger = Pino({ name: 'browser-automation-api' });
const router = express.Router();

// Store active browser automation sessions
const activeSessions = new Map(); // sessionId -> { ws, iframeId, tabId }

/**
 * GET /api/browser-automation/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'browser-automation',
    activeSessions: activeSessions.size,
    timestamp: Date.now(),
  });
});

/**
 * POST /api/browser-automation/execute
 * Execute browser automation action
 */
router.post('/execute', async (req, res) => {
  const { sessionId, action, params } = req.body;

  if (!sessionId || !action) {
    return res.status(400).json({
      error: 'sessionId and action required',
    });
  }

  try {
    const eventBridge = getBrowserEventBridge({ sessionId });
    
    // Record the action
    eventBridge.recordEvent({
      type: 'automation:execute',
      action,
      params,
    });

    // Emit event for WebSocket clients
    const session = activeSessions.get(sessionId);
    if (session && session.ws && session.ws.readyState === 1) {
      session.ws.send(JSON.stringify({
        type: 'action:executed',
        action,
        params,
        timestamp: Date.now(),
      }));
    }

    res.json({
      success: true,
      action,
      message: `Browser action ${action} executed`,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error({ sessionId, action, error: error.message }, 'Execute failed');
    res.status(500).json({
      error: 'Execute failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/browser-automation/events/:sessionId
 * Get recent events for a session
 */
router.get('/events/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { limit = 10 } = req.query;

  try {
    const eventBridge = getBrowserEventBridge({ sessionId });
    const events = eventBridge.getRecentEvents(parseInt(limit));
    const stats = eventBridge.getEventStats();

    res.json({
      success: true,
      events,
      stats,
    });
  } catch (error) {
    logger.error({ sessionId, error: error.message }, 'Get events failed');
    res.status(500).json({
      error: 'Get events failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/browser-automation/stats/:sessionId
 * Get event statistics
 */
router.get('/stats/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  try {
    const eventBridge = getBrowserEventBridge({ sessionId });
    const stats = eventBridge.getEventStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error({ sessionId, error: error.message }, 'Get stats failed');
    res.status(500).json({
      error: 'Get stats failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/browser-automation/clear/:sessionId
 * Clear event history
 */
router.post('/clear/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  try {
    const eventBridge = getBrowserEventBridge({ sessionId });
    eventBridge.clearHistory();

    res.json({
      success: true,
      message: 'Event history cleared',
    });
  } catch (error) {
    logger.error({ sessionId, error: error.message }, 'Clear failed');
    res.status(500).json({
      error: 'Clear failed',
      message: error.message,
    });
  }
});

/**
 * Create Browser Automation WebSocket Server
 */
function createBrowserAutomationWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/browser-automation' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const sessionId = url.searchParams.get('sessionId') || `browser-automation-${Date.now()}`;
    const tabId = url.searchParams.get('tabId') || null;
    const iframeId = url.searchParams.get('iframeId') || null;

    logger.info({ sessionId, tabId, iframeId }, 'Browser automation WebSocket connected');

    // Store session
    activeSessions.set(sessionId, {
      ws,
      tabId,
      iframeId,
      connectedAt: Date.now(),
    });

    // Get event bridge for this session
    const eventBridge = getBrowserEventBridge({ sessionId });

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      sessionId,
      tabId,
      iframeId,
      message: 'Connected to browser automation',
    }));

    // Listen for browser events and forward to WebSocket
    const eventHandler = (event) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'browser:event',
          event,
        }));
      }
    };
    eventBridge.on('browser:event', eventHandler);

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const { type, action, params } = data;

        switch (type) {
          case 'execute': {
            // Record action
            eventBridge.recordEvent({
              type: 'automation:execute',
              action,
              params,
            });

            // Send confirmation
            ws.send(JSON.stringify({
              type: 'action:executed',
              action,
              params,
              timestamp: Date.now(),
            }));
            break;
          }

          case 'get_events': {
            const limit = params?.limit || 10;
            const events = eventBridge.getRecentEvents(limit);
            ws.send(JSON.stringify({
              type: 'events',
              events,
            }));
            break;
          }

          case 'get_stats': {
            const stats = eventBridge.getEventStats();
            ws.send(JSON.stringify({
              type: 'stats',
              stats,
            }));
            break;
          }

          case 'clear': {
            eventBridge.clearHistory();
            ws.send(JSON.stringify({
              type: 'cleared',
              message: 'Event history cleared',
            }));
            break;
          }

          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: `Unknown message type: ${type}`,
            }));
        }
      } catch (error) {
        logger.error({ sessionId, error: error.message }, 'WebSocket message error');
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
        }));
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      logger.info({ sessionId }, 'Browser automation WebSocket disconnected');
      eventBridge.off('browser:event', eventHandler);
      activeSessions.delete(sessionId);
    });

    ws.on('error', (error) => {
      logger.error({ sessionId, error: error.message }, 'WebSocket error');
      eventBridge.off('browser:event', eventHandler);
      activeSessions.delete(sessionId);
    });
  });

  logger.info('Browser automation WebSocket server created');
  return wss;
}

module.exports = {
  router,
  createBrowserAutomationWebSocket,
};








