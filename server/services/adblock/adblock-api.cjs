/**
 * Adblock API
 * REST endpoints for adblock management
 */

const express = require('express');
const { getAdblockEngine } = require('./adblock-engine.cjs');
const Pino = require('pino');

const logger = Pino({ name: 'adblock-api' });
const router = express.Router();

/**
 * GET /api/adblock/health
 * Health check
 */
router.get('/health', (req, res) => {
  const engine = getAdblockEngine();
  const stats = engine.getStats();
  res.json({
    status: 'ok',
    service: 'adblock-engine',
    enabled: stats.enabled,
    timestamp: Date.now(),
  });
});

/**
 * GET /api/adblock/stats
 * Get adblock statistics
 */
router.get('/stats', (req, res) => {
  try {
    const engine = getAdblockEngine();
    const stats = engine.getStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Get stats failed');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/adblock/check
 * Check if URL should be blocked
 */
router.post('/check', (req, res) => {
  const { url, resourceType } = req.body;

  if (!url) {
    return res.status(400).json({
      error: 'URL required',
    });
  }

  try {
    const engine = getAdblockEngine();
    const blocked = engine.shouldBlock(url, resourceType);
    res.json({
      success: true,
      blocked,
      url,
    });
  } catch (error) {
    logger.error({ url, error: error.message }, 'Check failed');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/adblock/enable
 * Enable/disable adblock
 */
router.post('/enable', (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      error: 'enabled must be boolean',
    });
  }

  try {
    const engine = getAdblockEngine();
    engine.setEnabled(enabled);
    res.json({
      success: true,
      enabled,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Enable/disable failed');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/adblock/allow
 * Add URL to allow list
 */
router.post('/allow', (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      error: 'URL required',
    });
  }

  try {
    const engine = getAdblockEngine();
    engine.allow(url);
    res.json({
      success: true,
      message: 'URL added to allow list',
    });
  } catch (error) {
    logger.error({ url, error: error.message }, 'Allow failed');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/adblock/block
 * Add URL to block list
 */
router.post('/block', (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      error: 'URL required',
    });
  }

  try {
    const engine = getAdblockEngine();
    engine.block(url);
    res.json({
      success: true,
      message: 'URL added to block list',
    });
  } catch (error) {
    logger.error({ url, error: error.message }, 'Block failed');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/adblock/reset-stats
 * Reset statistics
 */
router.post('/reset-stats', (req, res) => {
  try {
    const engine = getAdblockEngine();
    engine.resetStats();
    res.json({
      success: true,
      message: 'Statistics reset',
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Reset stats failed');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;




