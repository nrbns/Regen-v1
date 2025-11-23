/**
 * Agent Sandbox Runner
 * Executes agent tasks in isolated worker threads with resource limits
 */

import { Worker } from 'worker_threads';
import { join } from 'path';
import { createLogger } from '../utils/logger';

const log = createLogger('agent-sandbox');

// Track active workers for termination
const activeWorkers = new Map<string, Worker>();

export interface AgentTask {
  id: string;
  agentId: string;
  input: unknown;
  timeout: number;
}

export interface AgentTaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}

/**
 * Run agent task in sandboxed worker thread
 */
export function runAgentTask(task: AgentTask): Promise<AgentTaskResult> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const workerPath = join(__dirname, 'agent-worker.js');

    // Check if worker file exists
    const fs = require('fs');
    if (!fs.existsSync(workerPath)) {
      log.warn('Agent worker file not found, using fallback execution', { workerPath });
      // Fallback: execute in main thread with timeout
      const timeout = setTimeout(() => {
        reject(new Error(`Agent task ${task.id} timed out after ${task.timeout}ms`));
      }, task.timeout || 8000);

      try {
        // In fallback mode, we can't actually sandbox, so we'll just timeout
        // This is a placeholder - actual implementation would require the worker file
        setTimeout(() => {
          clearTimeout(timeout);
          resolve({
            success: false,
            error: 'Agent worker not available',
            duration: Date.now() - startTime,
          });
        }, 100);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
      return;
    }

    const worker = new Worker(workerPath, {
      workerData: task,
      // Resource limits per blueprint
      resourceLimits: {
        maxOldGenerationSizeMb: 512,
        maxYoungGenerationSizeMb: 128,
      },
    });

    // Track worker for potential termination
    activeWorkers.set(task.id, worker);

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error(`Agent task ${task.id} timed out after ${task.timeout}ms`));
    }, task.timeout || 8000);

    worker.on('message', (msg: { type: string; data?: unknown; error?: string }) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      if (msg.type === 'result') {
        resolve({
          success: true,
          data: msg.data,
          duration,
        });
      } else if (msg.type === 'error') {
        resolve({
          success: false,
          error: msg.error || 'Unknown error',
          duration,
        });
      }
    });

    worker.on('error', error => {
      clearTimeout(timeout);
      log.error('Worker error', { taskId: task.id, error: error.message });
      resolve({
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      });
    });

    worker.on('exit', code => {
      clearTimeout(timeout);
      activeWorkers.delete(task.id);
      if (code !== 0) {
        log.warn('Worker exited with non-zero code', { taskId: task.id, code });
        resolve({
          success: false,
          error: `Worker exited with code ${code}`,
          duration: Date.now() - startTime,
        });
      }
    });
  });
}

/**
 * Terminate a worker by task ID
 */
export function terminateWorker(taskId: string): void {
  const worker = activeWorkers.get(taskId);
  if (worker) {
    try {
      worker.terminate();
      activeWorkers.delete(taskId);
      log.info('Worker terminated', { taskId });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('Failed to terminate worker', { taskId, error: err.message });
    }
  }
}

/**
 * Agent sandbox manager (for compatibility with existing code)
 */
export const agentSandbox = {
  terminateWorker,
};
