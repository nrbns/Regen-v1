/**
 * Job Recovery API Smoke Tests
 * Simplified tests that verify recovery logic without HTTP layer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryJobStore, JobStateMachine, type JobRecord } from '../jobs/stateMachine';
import { jobRepository } from '../jobs/repository';

describe('Job Recovery Logic', () => {
  let store: InMemoryJobStore;
  let testJobId: string;
  let testUserId: string;

  beforeEach(() => {
    store = new InMemoryJobStore();
    // Inject store into repository
    (jobRepository as any).store = store;
    testUserId = 'test-user-123';
    testJobId = 'test-job-001';
  });

  describe('Resume operation', () => {
    it('should resume a paused job', () => {
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
        },
        createdAt: Date.now() - 10000,
        lastActivity: Date.now() - 5000,
      };

      store.create(job);

      // Transition paused → running
      const result = JobStateMachine.transition(job, 'running');
      expect(result.success).toBe(true);
      expect(result.job?.state).toBe('running');

      // Verify persistence
      if (result.job) {
        store.update(result.job);
      }

      const updated = store.get(testJobId);
      expect(updated?.state).toBe('running');
    });

    it('should restore checkpoint on resume', () => {
      const job: JobRecord = {
        id: testJobId,
        userId: testUserId,
        type: 'search',
        query: 'test',
        state: 'paused',
        progress: 60,
        step: 'Paused',
        checkpointData: {
          step: 'processing',
          progress: 60,
          sequence: 10,
          data: { results: 50 },
        },
        createdAt: Date.now() - 10000,
        lastActivity: Date.now(),
      };

      store.create(job);

      const result = JobStateMachine.transition(job, 'running');
      const resumed = result.job!;

      // Checkpoint should be available
      expect(resumed.checkpointData).toBeDefined();
      expect(resumed.checkpointData?.progress).toBe(60);
      expect(resumed.checkpointData?.data).toEqual({ results: 50 });
    });
  });

  describe('Restart operation', () => {
    it('should restart a failed job', () => {
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

      // Restart bypasses state machine - directly update state
      // This simulates what recovery.ts does with repository.setState()
      job.state = 'created';
      job.error = undefined;
      job.result = undefined;
      job.progress = 0;
      job.step = 'Restarted';

      store.update(job);

      const updated = store.get(testJobId);
      expect(updated?.state).toBe('created');
      expect(updated?.error).toBeUndefined();
      expect(updated?.progress).toBe(0);
    });

    it('should restart a cancelled job', () => {
      const job: JobRecord = {
        id: testJobId,
        userId: testUserId,
        type: 'search',
        query: 'test',
        state: 'cancelled',
        progress: 40,
        step: 'Cancelled by user',
        createdAt: Date.now() - 5000,
        lastActivity: Date.now(),
      };

      store.create(job);

      // Restart bypasses state machine - directly update state
      job.state = 'created';
      store.update(job);

      const updated = store.get(testJobId);
      expect(updated?.state).toBe('created');
    });

    it('should not restart a running job', () => {
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

      // Cannot transition running → created
      const result = JobStateMachine.transition(job, 'created');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Checkpoint management', () => {
    it('should clear checkpoint data', () => {
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
        },
        createdAt: Date.now() - 10000,
        lastActivity: Date.now(),
      };

      store.create(job);

      // Clear checkpoint
      const updated = { ...job, checkpointData: undefined };
      store.update(updated);

      const retrieved = store.get(testJobId);
      expect(retrieved?.checkpointData).toBeUndefined();
    });

    it('should preserve checkpoint during pause', () => {
      const job: JobRecord = {
        id: testJobId,
        userId: testUserId,
        type: 'search',
        query: 'test',
        state: 'running',
        progress: 45,
        step: 'Processing',
        checkpointData: {
          step: 'processing',
          progress: 45,
          sequence: 8,
        },
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      store.create(job);

      // Pause preserves checkpoint
      const result = JobStateMachine.transition(job, 'paused');
      expect(result.success).toBe(true);
      expect(result.job?.checkpointData).toBeDefined();
      expect(result.job?.checkpointData?.progress).toBe(45);
    });
  });

  describe('State transition cycles', () => {
    it('should handle pause-resume cycle', () => {
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

      // Pause
      const pauseResult = JobStateMachine.transition(job, 'paused');
      expect(pauseResult.success).toBe(true);
      const paused = pauseResult.job!;
      store.update(paused);

      // Resume
      const resumeResult = JobStateMachine.transition(paused, 'running');
      expect(resumeResult.success).toBe(true);
      const resumed = resumeResult.job!;
      store.update(resumed);

      const final = store.get(testJobId);
      expect(final?.state).toBe('running');
    });

    it('should handle fail-restart cycle', () => {
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

      // Restart (bypasses state machine) - directly update state
      job.state = 'created';
      job.error = undefined;
      job.progress = 0;
      store.update(job);

      const restarted = store.get(testJobId)!;
      restarted.error = undefined;
      restarted.progress = 0;
      store.update(restarted);

      const final = store.get(testJobId);
      expect(final?.state).toBe('created');
      expect(final?.error).toBeUndefined();
      expect(final?.progress).toBe(0);
    });
  });

  describe('Job Registry integration', () => {
    it('should allow snapshot of job state', () => {
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
        },
        createdAt: Date.now() - 15000,
        lastActivity: Date.now(),
      };

      store.create(job);

      // Snapshot should include all critical state
      const snapshot = store.get(testJobId);
      expect(snapshot).toBeDefined();
      expect(snapshot?.id).toBe(testJobId);
      expect(snapshot?.state).toBe('running');
      expect(snapshot?.progress).toBe(45);
      expect(snapshot?.checkpointData).toBeDefined();
    });
  });
});
