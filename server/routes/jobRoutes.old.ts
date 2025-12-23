/**
 * Job Routes
 * REST API for job lifecycle management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * In-memory job store (replace with DB)
 */
const jobStore = new Map<string, any>();

let sequence = 0;

function _getNextSequence(): number {
  return ++sequence;
}

export function createJobRoutes(): Router {
  const router = Router();

  /**
   * POST /api/jobs
   * Create a new job
   */
  router.post('/jobs', (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const jobId = uuidv4();
      const job = {
        id: jobId,
        userId,
        type: req.body.type || 'generic',
        query: req.body.query,
        state: 'created',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        completedAt: null,
        result: null,
        error: null,
        checkpoint: null,
      };

      jobStore.set(jobId, job);

      console.log(`[JobRoutes] Created job ${jobId} for user ${userId}`);

      res.json({
        jobId,
        state: job.state,
        createdAt: job.createdAt,
      });
    } catch (error: any) {
      console.error('[JobRoutes] Error creating job:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/jobs/:jobId
   * Get job status
   */
  router.get('/jobs/:jobId', (req: AuthRequest, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = jobStore.get(jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.json({
        jobId: job.id,
        state: job.state,
        progress: job.progress,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        result: job.result,
        error: job.error,
        checkpoint: job.checkpoint?.length ? 'available' : null,
      });
    } catch (error: any) {
      console.error('[JobRoutes] Error getting job:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PATCH /api/jobs/:jobId/cancel
   * Cancel a job
   */
  router.patch('/jobs/:jobId/cancel', (req: AuthRequest, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = jobStore.get(jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (['completed', 'failed', 'cancelled'].includes(job.state)) {
        return res.status(400).json({ error: `Cannot cancel job in state: ${job.state}` });
      }

      job.state = 'cancelled';
      job.updatedAt = new Date();

      console.log(`[JobRoutes] Cancelled job ${jobId}`);

      res.json({
        jobId: job.id,
        state: job.state,
        updatedAt: job.updatedAt,
      });
    } catch (error: any) {
      console.error('[JobRoutes] Error cancelling job:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/jobs/:jobId/resume
   * Resume a paused job
   */
  router.post('/jobs/:jobId/resume', (req: AuthRequest, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = jobStore.get(jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (job.state !== 'paused') {
        return res.status(400).json({ error: `Cannot resume job in state: ${job.state}` });
      }

      job.state = 'running';
      job.updatedAt = new Date();

      console.log(`[JobRoutes] Resumed job ${jobId}`);

      res.json({
        jobId: job.id,
        state: job.state,
        updatedAt: job.updatedAt,
      });
    } catch (error: any) {
      console.error('[JobRoutes] Error resuming job:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/jobs
   * List user's jobs
   */
  router.get('/jobs', (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userJobs = Array.from(jobStore.values())
        .filter(job => job.userId === userId)
        .map(job => ({
          jobId: job.id,
          type: job.type,
          state: job.state,
          progress: job.progress,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        }));

      res.json({ jobs: userJobs });
    } catch (error: any) {
      console.error('[JobRoutes] Error listing jobs:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/jobs/:jobId/progress
   * Server endpoint for workers to update job progress
   * (Called by workers, not clients)
   */
  router.post('/jobs/:jobId/progress', (req: AuthRequest, res: Response) => {
    try {
      const { jobId } = req.params;
      const { state, progress, step: _step, partial: _partial, checkpoint } = req.body;

      const job = jobStore.get(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      job.state = state || job.state;
      job.progress = progress ?? job.progress;
      job.updatedAt = new Date();

      if (state === 'running' && !job.startedAt) {
        job.startedAt = new Date();
      }

      if (['completed', 'failed'].includes(state)) {
        job.completedAt = new Date();
      }

      if (checkpoint) {
        job.checkpoint = checkpoint;
      }

      console.log(`[JobRoutes] Updated job ${jobId}: ${state} (${progress}%)`);

      res.json({
        jobId: job.id,
        state: job.state,
        progress: job.progress,
      });
    } catch (error: any) {
      console.error('[JobRoutes] Error updating progress:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
