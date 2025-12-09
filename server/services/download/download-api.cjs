/**
 * Download API
 * REST endpoints for download management
 */

const express = require('express');
const { getDownloadManager } = require('./download-manager.cjs');
const Pino = require('pino');

const logger = Pino({ name: 'download-api' });
const router = express.Router();

/**
 * POST /api/download/start
 * Start a download
 */
router.post('/start', async (req, res) => {
  const { url, filename, destination } = req.body;

  if (!url) {
    return res.status(400).json({
      error: 'URL required',
    });
  }

  try {
    const manager = getDownloadManager();
    const downloadId = await manager.download(url, {
      filename,
      destination,
    });

    res.json({
      success: true,
      downloadId,
      message: 'Download started',
    });
  } catch (error) {
    logger.error({ url, error: error.message }, 'Start download failed');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/download/:downloadId
 * Get download info
 */
router.get('/:downloadId', (req, res) => {
  const { downloadId } = req.params;

  try {
    const manager = getDownloadManager();
    const download = manager.getDownload(downloadId);

    if (!download) {
      return res.status(404).json({
        error: 'Download not found',
      });
    }

    res.json({
      success: true,
      download,
    });
  } catch (error) {
    logger.error({ downloadId, error: error.message }, 'Get download failed');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/download
 * Get all downloads
 */
router.get('/', (req, res) => {
  try {
    const manager = getDownloadManager();
    const downloads = manager.getAllDownloads();
    const active = manager.getActiveDownloads();

    res.json({
      success: true,
      downloads,
      active: active.length,
      total: downloads.length,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Get downloads failed');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/download/:downloadId/cancel
 * Cancel a download
 */
router.post('/:downloadId/cancel', (req, res) => {
  const { downloadId } = req.params;

  try {
    const manager = getDownloadManager();
    const cancelled = manager.cancel(downloadId);

    if (!cancelled) {
      return res.status(404).json({
        error: 'Download not found or cannot be cancelled',
      });
    }

    res.json({
      success: true,
      message: 'Download cancelled',
    });
  } catch (error) {
    logger.error({ downloadId, error: error.message }, 'Cancel download failed');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/download/clear-completed
 * Clear completed downloads
 */
router.post('/clear-completed', (req, res) => {
  try {
    const manager = getDownloadManager();
    const count = manager.clearCompleted();

    res.json({
      success: true,
      count,
      message: `Cleared ${count} completed downloads`,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Clear completed failed');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/download/stats
 * Get download statistics
 */
router.get('/stats', (req, res) => {
  try {
    const manager = getDownloadManager();
    const stats = manager.getStats();

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
 * GET /api/download/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'download-manager',
    timestamp: Date.now(),
  });
});

module.exports = router;








