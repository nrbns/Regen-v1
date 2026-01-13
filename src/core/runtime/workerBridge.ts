/**
 * Worker Bridge - Offloads heavy work from main thread
 * 
 * ENFORCEMENT: No AI, file I/O, parsing, or network on main thread
 * All heavy work MUST go through workers
 */

import { eventBus } from '../execution/eventBus';

interface WorkerTask {
  taskId: string;
  type: string;
  payload: any;
  signal: AbortSignal;
}

// Worker pool (lazy-loaded)
let workerPool: Worker[] = [];
const MAX_WORKERS = 4;

/**
 * Create worker pool
 */
function createWorkerPool(): Worker[] {
  if (typeof Worker === 'undefined') {
    console.warn('[WorkerBridge] Web Workers not available, falling back to main thread');
    return [];
  }

  const workers: Worker[] = [];
  for (let i = 0; i < MAX_WORKERS; i++) {
    try {
      // Create worker for heavy computation
      // In production, this would load actual worker script
      const worker = new Worker(
        new URL('../../workers/main.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onerror = (error) => {
        console.error(`[WorkerBridge] Worker ${i} error:`, error);
        eventBus.emit('worker:error', { workerId: i, error });
      };

      worker.onmessage = (event) => {
        const { taskId, type, data } = event.data;
        eventBus.emit('worker:result', { taskId, type, data });
      };

      workers.push(worker);
    } catch (error) {
      console.error(`[WorkerBridge] Failed to create worker ${i}:`, error);
    }
  }

  return workers;
}

/**
 * Execute task in worker (non-blocking)
 * 
 * ENFORCEMENT: Long operations must use this
 */
export async function executeInWorker(
  taskId: string,
  type: string,
  payload: any,
  signal: AbortSignal
): Promise<void> {
  // Ensure worker pool exists
  if (workerPool.length === 0) {
    workerPool = createWorkerPool();
  }

  if (workerPool.length === 0) {
    // Fallback to main thread if workers not available
    console.warn('[WorkerBridge] No workers available, executing on main thread (this may freeze UI)');
    throw new Error('Workers not available - cannot execute heavy task safely');
  }

  // Find available worker
  const worker = workerPool[0]; // Simple round-robin (could be improved)

  // Send task to worker
  return new Promise((resolve, reject) => {
    // Handle abort
    if (signal.aborted) {
      worker.postMessage({ type: 'cancel', taskId });
      reject(new Error('Task cancelled'));
      return;
    }

    const abortHandler = () => {
      worker.postMessage({ type: 'cancel', taskId });
      signal.removeEventListener('abort', abortHandler);
      reject(new Error('Task cancelled'));
    };
    signal.addEventListener('abort', abortHandler);

    // Listen for result
    const resultHandler = (event: MessageEvent) => {
      if (event.data.taskId !== taskId) {
        return; // Not our task
      }

      if (event.data.type === 'done') {
        signal.removeEventListener('abort', abortHandler);
        worker.removeEventListener('message', resultHandler);
        resolve();
      } else if (event.data.type === 'error') {
        signal.removeEventListener('abort', abortHandler);
        worker.removeEventListener('message', resultHandler);
        reject(new Error(event.data.error));
      } else if (event.data.type === 'progress') {
        // Stream progress
        eventBus.emit('task:progress', {
          taskId,
          progress: event.data.progress,
          data: event.data.data,
        });
      }
    };

    worker.addEventListener('message', resultHandler);

    // Send task to worker
    worker.postMessage({
      type: 'execute',
      taskId,
      taskType: type,
      payload,
    });

    // Timeout fallback (30 seconds)
    setTimeout(() => {
      worker.removeEventListener('message', resultHandler);
      signal.removeEventListener('abort', abortHandler);
      reject(new Error('Worker task timeout'));
    }, 30000);
  });
}

/**
 * Check if operation should use worker
 * 
 * ENFORCEMENT: Operations that take > 100ms should use worker
 */
export function shouldUseWorker(operationType: string): boolean {
  const heavyOperations = [
    'ai',
    'explain',
    'command',
    'parse',
    'extract',
    'analyze',
    'process',
    'transform',
    'compute',
  ];

  return heavyOperations.some(op => operationType.toLowerCase().includes(op));
}
