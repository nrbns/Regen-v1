/**
 * E2E Test: Stream Reconnect and Resume
 *
 * PR D: Tests disconnect + reconnect scenario with job resume
 *
 * Verifies:
 * - Client can disconnect mid-stream
 * - Client can reconnect and resume from last checkpoint
 * - Partial results are preserved
 * - Job state is persisted correctly
 */

import { test, expect } from '@playwright/test';
import { io, Socket } from 'socket.io-client';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const WS_URL = process.env.WS_URL || 'ws://localhost:4000';

test.describe('Stream Reconnect and Resume', () => {
  let socket: Socket;
  let jobId: string;
  let receivedChunks: string[] = [];
  let lastSequence: number = 0;

  test.beforeEach(async () => {
    // Connect to server
    socket = io(BASE_URL, {
      auth: { token: 'test-user-1' },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => resolve());
      socket.on('connect_error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // Join user room
    socket.emit('join', 'user:test-user-1');
  });

  test.afterEach(async () => {
    if (socket) {
      socket.disconnect();
    }
  });

  test('should resume streaming after disconnect', async ({ page }) => {
    // Start a job
    const startPromise = new Promise<string>((resolve, reject) => {
      socket.on('job:started:v1', (data: { jobId: string }) => {
        resolve(data.jobId);
      });
      socket.on('error', reject);
      setTimeout(() => reject(new Error('Job start timeout')), 10000);
    });

    socket.emit('search:start:v1', {
      query: 'Test query for reconnect',
      userId: 'test-user-1',
    });

    jobId = await startPromise;
    expect(jobId).toBeTruthy();

    // Collect chunks
    const chunkPromise = new Promise<void>(resolve => {
      let chunkCount = 0;
      socket.on('model:chunk:v1', (data: { chunk: string; index: number }) => {
        receivedChunks.push(data.chunk);
        lastSequence = data.index;
        chunkCount++;

        // Disconnect after receiving 5 chunks
        if (chunkCount === 5) {
          socket.disconnect();
          resolve();
        }
      });
    });

    await chunkPromise;

    // Verify we received some chunks
    expect(receivedChunks.length).toBeGreaterThan(0);
    expect(lastSequence).toBeGreaterThan(0);

    // Reconnect
    socket = io(BASE_URL, {
      auth: { token: 'test-user-1' },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => resolve());
      socket.on('connect_error', reject);
      setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
    });

    socket.emit('join', 'user:test-user-1');

    // Request job state
    const stateResponse = await fetch(`${BASE_URL}/api/job/${jobId}/state`);
    expect(stateResponse.ok).toBe(true);

    const state = await stateResponse.json();
    expect(state).toHaveProperty('lastSequence');
    expect(state.lastSequence).toBeGreaterThanOrEqual(lastSequence);

    // Resume from last sequence
    const resumePromise = new Promise<void>(resolve => {
      let resumedChunks = 0;
      socket.on('model:chunk:v1', (data: { chunk: string; index: number }) => {
        // Only count chunks after our last sequence
        if (data.index > lastSequence) {
          receivedChunks.push(data.chunk);
          resumedChunks++;
        }

        // Resolve after receiving 3 more chunks
        if (resumedChunks >= 3) {
          resolve();
        }
      });

      socket.on('model:complete:v1', () => {
        resolve();
      });
    });

    // Request resume
    socket.emit('job:resume:v1', { jobId, lastSequence });

    await resumePromise;

    // Verify we received more chunks
    expect(receivedChunks.length).toBeGreaterThan(5);
  });

  test('should handle cancellation mid-stream', async () => {
    // Start a job
    const startPromise = new Promise<string>(resolve => {
      socket.on('job:started:v1', (data: { jobId: string }) => {
        resolve(data.jobId);
      });
    });

    socket.emit('search:start:v1', {
      query: 'Test query for cancellation',
      userId: 'test-user-1',
    });

    jobId = await startPromise;

    // Collect a few chunks
    const chunkPromise = new Promise<void>(resolve => {
      let chunkCount = 0;
      socket.on('model:chunk:v1', () => {
        chunkCount++;
        if (chunkCount === 3) {
          resolve();
        }
      });
    });

    await chunkPromise;

    // Cancel the job
    const cancelPromise = new Promise<void>(resolve => {
      socket.on('task:cancelled', () => {
        resolve();
      });
    });

    socket.emit('task:cancel:v1', { jobId });

    await cancelPromise;

    // Verify job state is cancelled
    const stateResponse = await fetch(`${BASE_URL}/api/job/${jobId}/state`);
    expect(stateResponse.ok).toBe(true);

    const state = await stateResponse.json();
    expect(state.status).toBe('cancelled');
  });
});
