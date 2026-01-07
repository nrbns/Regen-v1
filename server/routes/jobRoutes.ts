/**
 * Job Routes (Updated with State Machine)
 * REST API for job lifecycle management with state validation
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JobStateMachine, InMemoryJobStore, type JobRecord } from '../jobs/stateMachine';
import { CheckpointManager } from '../jobs/checkpoint';
import { JobLogManager } from '../jobs/logManager';
import type Redis from 'ioredis';
import { EVENTS } from '../../packages/shared/events';
import { jobRegistry, configureJobRegistry } from '../jobs/jobRegistry';
import { ReasoningLogManager } from '../jobs/reasoningLogManager';
import { configureRecoveryReasoning } from '../jobs/recovery';

interface AuthRequest extends Request {
  userId?: string;
}

// Will be injected from server/index.ts
let jobStore: InMemoryJobStore | null = null;
let checkpointManager: CheckpointManager | null = null;
let logManager: JobLogManager | null = null;
let redisClient: Redis | null = null;
let reasoningLogManager: ReasoningLogManager | null = null;

async function publishJobEvent(
  jobId: string,
  userId: string,
  event: (typeof EVENTS)[keyof typeof EVENTS],
  payload: Record<string, any>
): Promise<void> {
  if (!redisClient) return;

  const sequenceKey = `job:seq:${jobId}`;
  const sequence = await redisClient.incr(sequenceKey);

  const message = {
    event,
    userId,
    jobId,
    payload,
    sequence,
    timestamp: Date.now(),
  };

  await redisClient.publish(`job:event:${jobId}`, JSON.stringify(message));
}

export function createJobRoutes(store?: InMemoryJobStore, redis?: Redis): Router {
  // Initialize with injected dependencies
  if (store) jobStore = store;
  if (redis) {
    checkpointManager = new CheckpointManager(redis);
    logManager = new JobLogManager(redis);
    reasoningLogManager = new ReasoningLogManager(redis);
    redisClient = redis;
  }

  // Fallback
  if (!jobStore) jobStore = new InMemoryJobStore();
  if (!checkpointManager) checkpointManager = new CheckpointManager(null);
  if (!logManager) logManager = new JobLogManager(null);
  if (!reasoningLogManager) reasoningLogManager = new ReasoningLogManager(null);

  // Configure recovery reasoning
  configureRecoveryReasoning(reasoningLogManager);

  // Ensure the JobRegistry reads from the same store used by routes
  configureJobRegistry({
    get: async (jobId: string) => Promise.resolve(jobStore!.get(jobId)),
  });

  const router = Router();

  /**
   * POST /api/jobs
   * Create a new job
   */
  router.post('/', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId || 'anonymous';

      const jobId = uuidv4();
      const job: JobRecord = {
        id: jobId,
        userId,
        type: req.body.type || 'generic',
        query: req.body.query,
        state: 'created',
        progress: 0,
        step: 'Initializing',
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      jobStore!.create(job);

      // Update registry
      await jobRegistry.update(job);

      // Append an initial structured reasoning entry
      reasoningLogManager
        ?.append(jobId, {
          step: 'created',
          decision: 'initialize-job',
          reasoning: 'User requested new job creation',
          confidence: 0.1,
          timestamp: Date.now(),
          metadata: { type: job.type },
        })
        .catch(() => undefined);

      // Broadcast creation so UI can attach immediately
      publishJobEvent(jobId, userId, EVENTS.JOB_CREATED, {
        state: job.state,
        progress: job.progress,
        step: job.step,
        createdAt: job.createdAt,
      }).catch(err => console.error('[JobRoutes] Failed to publish creation event', err));

      res.status(201).json({
        jobId,
        state: job.state,
        progress: 0,
        message: 'Job created successfully',
      });
    } catch (error) {
      console.error('[JobRoutes] Error creating job:', error);
      res.status(500).json({ error: 'Failed to create job' });
    }
  });

  /**
   * GET /api/jobs/:jobId/snapshot
   * Returns authoritative snapshot for resume/rebuild
   */
  router.get('/:jobId/snapshot', async (req: AuthRequest, res: Response) => {
    try {
      const jobId = req.params.jobId;
      const snapshot = await jobRegistry.getSnapshot(jobId);

      if (!snapshot) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Basic auth check aligned with other routes
      if (snapshot.userId !== (req.userId || 'anonymous')) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.json({ snapshot });
    } catch (error) {
      console.error('[JobRoutes] Error getting job snapshot:', error);
      res.status(500).json({ error: 'Failed to get job snapshot' });
    }
  });

  /**
   * GET /api/jobs/:jobId
   * Get job status
   */
  router.get('/:jobId', async (req: AuthRequest, res: Response) => {
    try {
      const job = jobStore!.get(req.params.jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Auth check
      if (job.userId !== (req.userId || 'anonymous')) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const checkpoint = checkpointManager ? await checkpointManager.loadCheckpoint(job.id) : null;

      res.json({
        id: job.id,
        state: job.state,
        progress: job.progress,
        step: job.step,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
        result: job.state === 'completed' ? job.result : null,
        checkpointAvailable: Boolean(checkpoint),
        checkpointSequence: checkpoint?.sequence,
        checkpointStep: checkpoint?.step,
        checkpointProgress: checkpoint?.progress,
      });
    } catch (error) {
      console.error('[JobRoutes] Error getting job:', error);
      res.status(500).json({ error: 'Failed to get job' });
    }
  });

  /**
   * GET /api/jobs/:jobId/logs
   * Returns recent job logs (placeholder until persistent logging is added)
   */
  router.get('/:jobId/logs', async (req: AuthRequest, res: Response) => {
    try {
      const job = jobStore!.get(req.params.jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.userId !== (req.userId || 'anonymous')) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const structured = String(req.query.structured || '') === '1';
      // Get logs from appropriate manager
      const logs = structured
        ? reasoningLogManager
          ? await reasoningLogManager.get(req.params.jobId, 100)
          : []
        : logManager
          ? await logManager.getLogs(req.params.jobId)
          : [];

      res.json({
        logs,
        message: logs.length === 0 ? 'No logs available yet' : undefined,
      });
    } catch (error) {
      console.error('[JobRoutes] Error fetching job logs:', error);
      res.status(500).json({ error: 'Failed to fetch job logs' });
    }
  });

  /**
   * GET /api/jobs/:jobId/actionLog
   * Returns structured reasoning/action log for the job
   */
  router.get('/:jobId/actionLog', async (req: AuthRequest, res: Response) => {
    try {
      const job = jobStore!.get(req.params.jobId);

      if (!job) return res.status(404).json({ error: 'Job not found' });
      if (job.userId !== (req.userId || 'anonymous'))
        return res.status(403).json({ error: 'Forbidden' });

      const entries = reasoningLogManager
        ? await reasoningLogManager.get(req.params.jobId, 200)
        : [];
      res.json({ entries });
    } catch (error) {
      console.error('[JobRoutes] Error fetching action log:', error);
      res.status(500).json({ error: 'Failed to fetch action log' });
    }
  });

  /**
   * GET /api/jobs
   * List user's jobs
   */
  router.get('/', (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId || 'anonymous';
      const jobs = jobStore!.getUserJobs(userId);

      const filtered = jobs.map(j => ({
        id: j.id,
        type: j.type,
        state: j.state,
        progress: j.progress,
        step: j.step,
        createdAt: j.createdAt,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
      }));

      res.json({ jobs: filtered });
    } catch (error) {
      console.error('[JobRoutes] Error listing jobs:', error);
      res.status(500).json({ error: 'Failed to list jobs' });
    }
  });

  /**
   * GET /api/jobs/recent
   * Return user's recent jobs, sorted by activity
   */
  router.get('/recent', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId || 'anonymous';
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 25));

      const jobs = jobStore!
        .getUserJobs(userId)
        .sort((a, b) => (b.lastActivity || b.createdAt) - (a.lastActivity || a.createdAt))
        .slice(0, limit)
        .map(j => ({
          id: j.id,
          state: j.state,
          progress: j.progress,
          step: j.step,
          updatedAt: j.lastActivity || j.createdAt,
        }));

      res.json(jobs);
    } catch (error) {
      console.error('[JobRoutes] Error listing recent jobs:', error);
      res.status(500).json({ error: 'Failed to list recent jobs' });
    }
  });

  /**
   * GET /api/jobs/resumable
   * Return user's jobs that can be resumed (paused/failed with checkpoint)
   */
  router.get('/resumable', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId || 'anonymous';
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 25));

      const userJobs = jobStore!.getUserJobs(userId);

      // Check checkpoint availability via manager if present
      const result: Array<{
        id: string;
        state: string;
        progress?: number;
        step?: string;
        updatedAt?: number;
      }> = [];
      for (const j of userJobs) {
        const isCandidate = j.state === 'paused' || j.state === 'failed';
        if (!isCandidate) continue;

        let hasCheckpoint = false;
        try {
          if (checkpointManager) {
            const cp = await checkpointManager.loadCheckpoint(j.id);
            hasCheckpoint = Boolean(cp);
          } else {
            hasCheckpoint = Boolean(j.checkpointData);
          }
        } catch {
          hasCheckpoint = Boolean(j.checkpointData);
        }

        if (hasCheckpoint) {
          result.push({
            id: j.id,
            state: j.state,
            progress: j.progress,
            step: j.step,
            updatedAt: j.lastActivity || j.createdAt,
          });
        }
      }

      // Sort and limit
      const sorted = result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, limit);

      res.json(sorted);
    } catch (error) {
      console.error('[JobRoutes] Error listing resumable jobs:', error);
      res.status(500).json({ error: 'Failed to list resumable jobs' });
    }
  });

  /**
   * PATCH /api/jobs/:jobId/cancel
   * Cancel a job
   */
  router.patch('/:jobId/cancel', async (req: AuthRequest, res: Response) => {
    try {
      const job = jobStore!.get(req.params.jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.userId !== (req.userId || 'anonymous')) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Use state machine
      const result = JobStateMachine.transition(job, 'cancelled');

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const updated = result.job!;
      jobStore!.update(updated);

      // Update registry
      await jobRegistry.update(updated);

      // Clean up checkpoint
      if (checkpointManager) {
        await checkpointManager.deleteCheckpoint(job.id);
      }

      publishJobEvent(job.id, job.userId, EVENTS.JOB_CANCELLED, {
        state: updated.state,
        progress: updated.progress,
        step: updated.step,
      }).catch(err => console.error('[JobRoutes] Failed to publish cancel event', err));

      res.json({
        id: updated.id,
        state: updated.state,
        message: 'Job cancelled successfully',
      });
    } catch (error) {
      console.error('[JobRoutes] Error cancelling job:', error);
      res.status(500).json({ error: 'Failed to cancel job' });
    }
  });

  /**
   * POST /api/jobs/:jobId/pause
   * Pause a running job
   */
  router.post('/:jobId/pause', async (req: AuthRequest, res: Response) => {
    try {
      const job = jobStore!.get(req.params.jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.userId !== (req.userId || 'anonymous')) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const result = JobStateMachine.transition(job, 'paused');

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const updated = result.job!;
      jobStore!.update(updated);

      // Update registry
      await jobRegistry.update(updated);

      res.json({
        id: updated.id,
        state: updated.state,
        message: 'Job paused successfully',
      });

      publishJobEvent(job.id, job.userId, EVENTS.JOB_PAUSED, {
        state: updated.state,
        progress: updated.progress,
        step: updated.step,
      }).catch(err => console.error('[JobRoutes] Failed to publish pause event', err));
    } catch (error) {
      console.error('[JobRoutes] Error pausing job:', error);
      res.status(500).json({ error: 'Failed to pause job' });
    }
  });

  /**
   * POST /api/jobs/:jobId/resume
   * Resume a paused job
   */
  router.post('/:jobId/resume', async (req: AuthRequest, res: Response) => {
    try {
      const job = jobStore!.get(req.params.jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.userId !== (req.userId || 'anonymous')) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (job.state !== 'paused') {
        return res.status(400).json({ error: `Cannot resume job in state ${job.state}` });
      }

      // Load checkpoint
      let checkpoint = null;
      if (checkpointManager) {
        checkpoint = await checkpointManager.loadCheckpoint(job.id);
      }

      const result = JobStateMachine.transition(job, 'running');

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const updated = result.job!;

      // Restore from checkpoint
      if (checkpoint) {
        updated.step = checkpoint.step;
        updated.progress = checkpoint.progress;
        updated.checkpointData = checkpoint;
      }

      jobStore!.update(updated);

      // Update registry
      await jobRegistry.update(updated);

      res.json({
        id: updated.id,
        state: updated.state,
        step: updated.step,
        progress: updated.progress,
        checkpoint: checkpoint ? 'Restored' : 'No checkpoint',
        checkpointAvailable: Boolean(checkpoint),
        checkpointSequence: checkpoint?.sequence,
        checkpointStep: checkpoint?.step,
        checkpointProgress: checkpoint?.progress,
        message: 'Job resumed successfully',
      });

      publishJobEvent(job.id, job.userId, EVENTS.JOB_RESUMED, {
        state: updated.state,
        progress: updated.progress,
        step: updated.step,
        checkpointSequence: checkpoint?.sequence,
      }).catch(err => console.error('[JobRoutes] Failed to publish resume event', err));
    } catch (error) {
      console.error('[JobRoutes] Error resuming job:', error);
      res.status(500).json({ error: 'Failed to resume job' });
    }
  });

  /**
   * POST /api/jobs/:jobId/restart
   * Restart a failed or cancelled job from scratch
   */
  router.post('/:jobId/restart', async (req: AuthRequest, res: Response) => {
    try {
      const job = jobStore!.get(req.params.jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.userId !== (req.userId || 'anonymous')) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (!['failed', 'cancelled'].includes(job.state)) {
        return res
          .status(400)
          .json({
            error: `Cannot restart job in state ${job.state}. Expected 'failed' or 'cancelled'.`,
          });
      }

      // Transition to created to allow restart
      const result = JobStateMachine.transition(job, 'created');

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const updated = result.job!;

      // Clear error and result
      updated.error = undefined;
      updated.result = undefined;

      // Reset progress
      updated.progress = 0;
      updated.step = 'Restarted';

      jobStore!.update(updated);

      // Update registry
      await jobRegistry.update(updated);

      res.json({
        id: updated.id,
        state: updated.state,
        step: updated.step,
        progress: updated.progress,
        message: 'Job restarted successfully',
      });

      publishJobEvent(job.id, job.userId, EVENTS.JOB_PROGRESS, {
        state: updated.state,
        progress: updated.progress,
        step: updated.step,
      }).catch(err => console.error('[JobRoutes] Failed to publish restart event', err));
    } catch (error) {
      console.error('[JobRoutes] Error restarting job:', error);
      res.status(500).json({ error: 'Failed to restart job' });
    }
  });

  /**
   * POST /api/jobs/:jobId/clearCheckpoint
   * Clear checkpoint data for a job (discards recovery option)
   */
  router.post('/:jobId/clearCheckpoint', async (req: AuthRequest, res: Response) => {
    try {
      const job = jobStore!.get(req.params.jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.userId !== (req.userId || 'anonymous')) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Clear checkpoint from job record
      job.checkpointData = undefined;
      jobStore!.update(job);

      // Clear from checkpoint manager if available
      if (checkpointManager) {
        try {
          await checkpointManager.deleteCheckpoint(job.id);
        } catch (err) {
          console.warn('[JobRoutes] Failed to delete checkpoint from manager:', err);
        }
      }

      res.json({
        id: job.id,
        message: 'Checkpoint cleared successfully',
      });
    } catch (error) {
      console.error('[JobRoutes] Error clearing checkpoint:', error);
      res.status(500).json({ error: 'Failed to clear checkpoint' });
    }
  });

  return router;
}

export { JobStateMachine, InMemoryJobStore, JobLogManager };
