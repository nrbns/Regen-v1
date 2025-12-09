/**
 * Enhanced Agent API
 * REST endpoints for agent management
 */

const express = require('express');
const { getAgentManager } = require('./agent-manager.cjs');
const Pino = require('pino');

const logger = Pino({ name: 'agent-api-enhanced' });
const router = express.Router();

/**
 * POST /api/agent/execute
 * Execute an agent task
 */
router.post('/execute', async (req, res) => {
  const { sessionId, task, options } = req.body;

  if (!sessionId || !task) {
    return res.status(400).json({
      error: 'sessionId and task required',
    });
  }

  try {
    const agentManager = getAgentManager();
    const result = await agentManager.executeTask(sessionId, task, options);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error({ sessionId, task, error: error.message }, 'Task execution failed');
    res.status(500).json({
      error: 'Task execution failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent/cancel
 * Cancel a running task
 */
router.post('/cancel', async (req, res) => {
  const { sessionId, taskId } = req.body;

  if (!sessionId || !taskId) {
    return res.status(400).json({
      error: 'sessionId and taskId required',
    });
  }

  try {
    const agentManager = getAgentManager();
    const cancelled = agentManager.cancelTask(sessionId, taskId);
    
    res.json({
      success: cancelled,
      message: cancelled ? 'Task cancelled' : 'Task not found or not running',
    });
  } catch (error) {
    logger.error({ sessionId, taskId, error: error.message }, 'Cancel failed');
    res.status(500).json({
      error: 'Cancel failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent/status/:sessionId/:taskId
 * Get task status
 */
router.get('/status/:sessionId/:taskId', async (req, res) => {
  const { sessionId, taskId } = req.params;

  try {
    const agentManager = getAgentManager();
    const status = agentManager.getTaskStatus(sessionId, taskId);
    
    if (!status) {
      return res.status(404).json({
        error: 'Task not found',
      });
    }

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    logger.error({ sessionId, taskId, error: error.message }, 'Get status failed');
    res.status(500).json({
      error: 'Get status failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent/tools
 * Get available tools
 */
router.get('/tools', async (req, res) => {
  try {
    const agentManager = getAgentManager();
    const tools = agentManager.getTools();
    
    res.json({
      success: true,
      tools,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Get tools failed');
    res.status(500).json({
      error: 'Get tools failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent/memory/:sessionId
 * Get session memory
 */
router.get('/memory/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const agentManager = getAgentManager();
    const memory = agentManager.getMemory(sessionId);
    
    res.json({
      success: true,
      memory,
    });
  } catch (error) {
    logger.error({ sessionId, error: error.message }, 'Get memory failed');
    res.status(500).json({
      error: 'Get memory failed',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/agent/session/:sessionId
 * Clear session
 */
router.delete('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const agentManager = getAgentManager();
    agentManager.clearSession(sessionId);
    
    res.json({
      success: true,
      message: 'Session cleared',
    });
  } catch (error) {
    logger.error({ sessionId, error: error.message }, 'Clear session failed');
    res.status(500).json({
      error: 'Clear session failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'agent-manager',
    timestamp: Date.now(),
  });
});

module.exports = router;








