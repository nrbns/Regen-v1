/**
 * Job Recovery API Smoke Tests
 * Tests for resume, restart, clearCheckpoint, and snapshot endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { createJobRoutes } from '../../server/routes/jobRoutes';
import { InMemoryJobStore, type JobRecord } from '../../server/jobs/stateMachine';

describe('Job Recovery API', () => {
  let app: Express;
  let store: InMemoryJobStore;
  let testJobId: string;
  let testUserId: string;

  beforeEach(() => {
    // Reset store and app for each test
    store = new InMemoryJobStore();
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req: any, _res, next) => {
      req.userId = 'test-user-123';
      next();
    });

    app.use('/api/jobs', createJobRoutes(store));

    testUserId = 'test-user-123';
    testJobId = 'test-job-001';
  });

  describe('POST /api/jobs/:jobId/resume', () => {
    it('should resume a paused job', async () => {
      // Create a paused job with checkpoint
      const job: JobRecord = {
        id: testJobId,
        userId: testUserId,
        type: 'search',
        query: 'test query',
        state: 'paused',
        progress: 50,
        step: 'Paused at step 3',
        checkpointData: {
          step: 'processing',
          progress: 50,
          sequence: 5,
          data: { results: 10 },
        },
        createdAt: Date.now() - 10000,
        lastActivity: Date.now() - 5000,
      };

      store.create(job);

      const response = await request(app).post(`/api/jobs/${testJobId}/resume`).expect(200);

      expect(response.body).toMatchObject({
        id: testJobId,
        state: 'running',
        step: 'processing',
        progress: 50,
        checkpointAvailable: true,
        checkpointSequence: 5,
        message: 'Job resumed successfully',
      });

      // Verify state transition in store
      const updated = store.get(testJobId);
      expect(updated?.state).toBe('running');
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app).post('/api/jobs/non-existent/resume').expect(404);

      expect(response.body.error).toBe('Job not found');
    });

    it('should return 400 when resuming non-paused job', async () => {
      const job: JobRecord = {
        id: testJobId,
        userId: testUserId,
        type: 'search',
        query: 'test',
        state: 'running',
        progress: 30,
        step: 'Running',
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      store.create(job);

      const response = await request(app).post(`/api/jobs/${testJobId}/resume`).expect(400);

      expect(response.body.error).toContain('Cannot resume job in state running');
    });
  });

  describe('POST /api/jobs/:jobId/restart', () => {
    it('should restart a failed job', async () => {
      const job: JobRecord = {
        id: testJobId,
        userId: testUserId,
        type: 'search',
        query: 'test query',
        state: 'failed',
        progress: 75,
        step: 'Failed at step 8',
        error: 'Network timeout',
        createdAt: Date.now() - 20000,
        lastActivity: Date.now() - 10000,
      };

      store.create(job);

      const response = await request(app).post(`/api/jobs/${testJobId}/restart`).expect(200);

      expect(response.body).toMatchObject({
        id: testJobId,
        state: 'created',
        step: 'Restarted',
        progress: 0,
        message: 'Job restarted successfully',
      });

      // Verify error and result are cleared
      const updated = store.get(testJobId);
      expect(updated?.state).toBe('created');
      expect(updated?.error).toBeUndefined();
      expect(updated?.result).toBeUndefined();
      expect(updated?.progress).toBe(0);
    });

    it('should restart a cancelled job', async () => {
      const job: JobRecord = {
        id: testJobId,
        userId: testUserId,
        type: 'search',
        query: 'test',
        state: 'cancelled',
        progress: 40,
        step: 'Cancelled by user',
        createdAt: Date.now() - 5000,
        lastActivity: Date.now() - 2000,
      };

      store.create(job);

      const response = await request(app).post(`/api/jobs/${testJobId}/restart`).expect(200);

      expect(response.body.state).toBe('created');
      expect(response.body.progress).toBe(0);
    });

    it('should return 400 when restarting running job', async () => {
      const job: JobRecord = {
        id: testJobId,
        userId: testUserId,
        type: 'search',
        query: 'test',
        state: 'running',
        progress: 50,
        step: 'In progress',
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      store.create(job);

      const response = await request(app).post(`/api/jobs/${testJobId}/restart`).expect(400);

      expect(response.body.error).toContain('Cannot restart job in state running');
    });
  });

  describe('POST /api/jobs/:jobId/clearCheckpoint', () => {
    it('should clear checkpoint data', async () => {
      const job: JobRecord = {
        id: testJobId,
        userId: testUserId,
        type: 'search',
        query: 'test',
        state: 'paused',
        progress: 60,
        step: 'Checkpoint at step 6',
        checkpointData: {
          step: 'processing',
          progress: 60,
          sequence: 10,
          data: { results: 50 },
        },
        createdAt: Date.now() - 10000,
        lastActivity: Date.now() - 3000,
      };

      store.create(job);

      const response = await request(app)
        .post(`/api/jobs/${testJobId}/clearCheckpoint`)
        .expect(200);

      expect(response.body.message).toBe('Checkpoint cleared successfully');

      // Verify checkpoint is removed
      const updated = store.get(testJobId);
      expect(updated?.checkpointData).toBeUndefined();
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .post('/api/jobs/non-existent/clearCheckpoint')
        .expect(404);

      expect(response.body.error).toBe('Job not found');
    });
  });

  describe('GET /api/jobs/:jobId/snapshot', () => {
    it('should return job snapshot', async () => {
      const job: JobRecord = {
        id: testJobId,
        userId: testUserId,
        type: 'search',
        query: 'snapshot test',
        state: 'running',
        progress: 45,
        step: 'Processing results',
        checkpointData: {
          step: 'processing',
          progress: 45,
          sequence: 8,
        },
        createdAt: Date.now() - 15000,
        lastActivity: Date.now(),
      };

      store.create(job);

      const response = await request(app).get(`/api/jobs/${testJobId}/snapshot`).expect(200);

      expect(response.body.snapshot).toMatchObject({
        id: testJobId,
        userId: testUserId,
        state: 'running',
        progress: 45,
        step: 'Processing results',
      });
      expect(response.body.snapshot.checkpointData).toBeDefined();
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app).get('/api/jobs/non-existent/snapshot').expect(404);

      expect(response.body.error).toBe('Job not found');
    });

    it('should return 403 for unauthorized access', async () => {
      const job: JobRecord = {
        id: testJobId,
        userId: 'other-user',
        type: 'search',
        query: 'test',
        state: 'running',
        progress: 10,
        step: 'Starting',
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      store.create(job);

      const response = await request(app).get(`/api/jobs/${testJobId}/snapshot`).expect(403);

      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('GET /api/jobs/:jobId/actionLog', () => {
    it('should return empty action log for new job', async () => {
      const job: JobRecord = {
        id: testJobId,
        userId: testUserId,
        type: 'search',
        query: 'test',
        state: 'created',
        progress: 0,
        step: 'Initializing',
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      store.create(job);

      const response = await request(app).get(`/api/jobs/${testJobId}/actionLog`).expect(200);

      expect(response.body.entries).toEqual([]);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app).get('/api/jobs/non-existent/actionLog').expect(404);

      expect(response.body.error).toBe('Job not found');
    });

    it('should return 403 for unauthorized access', async () => {
      const job: JobRecord = {
        id: testJobId,
        userId: 'other-user',
        type: 'search',
        query: 'test',
        state: 'running',
        progress: 0,
        step: 'Starting',
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      store.create(job);

      const response = await request(app).get(`/api/jobs/${testJobId}/actionLog`).expect(403);

      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('Integration: Resume → Pause → Resume cycle', () => {
    it('should handle resume-pause-resume cycle', async () => {
      // 1. Create running job
      const job: JobRecord = {
        id: testJobId,
        userId: testUserId,
        type: 'search',
        query: 'cycle test',
        state: 'running',
        progress: 30,
        step: 'Processing',
        createdAt: Date.now() - 10000,
        lastActivity: Date.now(),
      };

      store.create(job);

      // 2. Pause it
      await request(app).post(`/api/jobs/${testJobId}/pause`).expect(200);

      let updated = store.get(testJobId);
      expect(updated?.state).toBe('paused');

      // 3. Resume it
      await request(app).post(`/api/jobs/${testJobId}/resume`).expect(200);

      updated = store.get(testJobId);
      expect(updated?.state).toBe('running');

      // 4. Pause again
      await request(app).post(`/api/jobs/${testJobId}/pause`).expect(200);

      updated = store.get(testJobId);
      expect(updated?.state).toBe('paused');

      // 5. Final resume
      const response = await request(app).post(`/api/jobs/${testJobId}/resume`).expect(200);

      expect(response.body.state).toBe('running');
    });
  });

  describe('Integration: Fail → Restart → Run cycle', () => {
    it('should handle fail-restart-run cycle', async () => {
      // 1. Create failed job
      const job: JobRecord = {
        id: testJobId,
        userId: testUserId,
        type: 'search',
        query: 'fail test',
        state: 'failed',
        progress: 80,
        step: 'Failed',
        error: 'Test error',
        createdAt: Date.now() - 20000,
        lastActivity: Date.now() - 10000,
      };

      store.create(job);

      // 2. Restart it
      const restartResponse = await request(app).post(`/api/jobs/${testJobId}/restart`).expect(200);

      expect(restartResponse.body.state).toBe('created');
      expect(restartResponse.body.progress).toBe(0);

      const updated = store.get(testJobId);
      expect(updated?.error).toBeUndefined();
      expect(updated?.result).toBeUndefined();
    });
  });
});
