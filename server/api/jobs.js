/**
 * Job API Routes
 * REST endpoints for job state and resume
 *
 * PR 5: Job persistence and resume
 */

const express = require('express');
const { getJobState } = require('../jobs/persistence.js');

const router = express.Router();

/**
 * GET /api/job/:jobId/state
 * Get persisted job state for resume
 */
router.get('/:jobId/state', async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user?.id || req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const state = await getJobState(jobId);

    if (!state) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Verify user owns this job
    if (state.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({
      jobId,
      ...state,
    });
  } catch (error) {
    console.error('[JobAPI] Error getting job state', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/job/:jobId/status
 * Get job status (lightweight)
 */
router.get('/:jobId/status', async (req, res) => {
  try {
    const { jobId } = req.params;
    const state = await getJobState(jobId);

    if (!state) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId,
      status: state.status,
      progress: state.progress,
      updatedAt: state.updatedAt,
    });
  } catch (error) {
    console.error('[JobAPI] Error getting job status', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
