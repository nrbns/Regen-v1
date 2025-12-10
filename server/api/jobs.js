/**
 * Job API Routes
 * PR 3: Job persistence and resume endpoints
 */

const express = require('express');
const { getJobState, updateJobProgress } = require('../jobs/persistence.js');

const router = express.Router();

/**
 * GET /api/job/:jobId/state
 * Get current job state for resume
 */
router.get('/:jobId/state', async (req, res) => {
  try {
    const { jobId } = req.params;
    const state = await getJobState(jobId);

    if (!state) {
      return res.status(404).json({
        error: 'Job not found',
        jobId,
      });
    }

    res.json({
      jobId: state.jobId,
      userId: state.userId,
      status: state.status,
      progress: state.progress || 0,
      lastSequence: state.lastSequence || 0,
      result: state.result,
      error: state.error,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      completedAt: state.completedAt,
      failedAt: state.failedAt,
    });
  } catch (error) {
    console.error('[JobAPI] Failed to get job state:', error);
    res.status(500).json({
      error: 'Failed to get job state',
      message: error.message,
    });
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
      return res.status(404).json({
        error: 'Job not found',
        jobId,
      });
    }

    res.json({
      jobId: state.jobId,
      status: state.status,
      progress: state.progress || 0,
      lastSequence: state.lastSequence || 0,
    });
  } catch (error) {
    console.error('[JobAPI] Failed to get job status:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      message: error.message,
    });
  }
});

module.exports = router;
