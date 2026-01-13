import { eventBus } from './eventBus';
import type { Task, TaskStatus } from './task';
import { requireTask, trackExecution, backupTasksState } from '../runtime/enforcement';
import { executeInWorker, shouldUseWorker } from '../runtime/workerBridge';

const tasks = new Map<string, Task>();
const runningTasks = new Map<string, { 
  abortController: AbortController; 
  promise: Promise<void>;
  startTime: number;
}>();

// Watchdog for frozen tasks
let watchdogInterval: ReturnType<typeof setInterval> | null = null;
const WATCHDOG_INTERVAL = 5000; // Check every 5 seconds
const MAX_TASK_DURATION = 300000; // 5 minutes max

/**
 * Initialize watchdog - kills frozen tasks
 * 
 * REAL-TIME LAUNCH REQUIREMENT: Watchdog & recovery
 * Monitors running tasks and kills any that exceed MAX_TASK_DURATION
 */
function startWatchdog(): void {
  if (watchdogInterval) return; // Already running
  
  watchdogInterval = setInterval(() => {
    const now = Date.now();
    for (const [taskId, running] of runningTasks.entries()) {
      const duration = now - running.startTime;
      if (duration > MAX_TASK_DURATION) {
        console.warn(`[Watchdog] Task ${taskId} exceeded max duration (${Math.round(duration / 1000)}s), killing...`);
        killTask(taskId, 'Task exceeded maximum duration (frozen)');
      }
    }
  }, WATCHDOG_INTERVAL);
  
  // Clean up on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (watchdogInterval) {
        clearInterval(watchdogInterval);
        watchdogInterval = null;
      }
    });
  }
  
  console.log('[TaskManager] Watchdog started');
}

/**
 * Kill a frozen task
 * 
 * REAL-TIME LAUNCH REQUIREMENT: Watchdog & recovery
 * Kills a task that has frozen/exceeded time limit
 */
function killTask(taskId: string, reason: string): void {
  const running = runningTasks.get(taskId);
  if (running) {
    running.abortController.abort();
    runningTasks.delete(taskId);
  }
  
  const task = tasks.get(taskId);
  if (task) {
    task.status = 'FAILED';
    task.endedAt = Date.now();
    const logEntry = `[Watchdog] ${reason}`;
    task.logs.push(`[${new Date().toISOString()}] ${logEntry}`);
    updateTask(task);
    eventBus.emit('task:failed', task);
    console.log(`[TaskManager] Task ${taskId} killed by watchdog: ${reason}`);
  }
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id);
}

export function listTasks(): Task[] {
  return Array.from(tasks.values());
}

/**
 * Create a task - ALL execution must go through this
 */
export function createTask(type: string, meta?: Record<string, any>): Task {
  const id = (globalThis as any).crypto?.randomUUID?.() ?? String(Date.now()) + Math.random();
  const abortController = new AbortController();
  
  const task: Task = {
    id,
    type,
    status: 'CREATED',
    output: [],
    logs: [],
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
    cancelToken: abortController.signal,
    meta: meta ?? {},
  };

  tasks.set(id, task);
  
  // ENFORCEMENT: UI updates BEFORE work starts
  eventBus.emit('task:created', task);
  
  // Backup state immediately
  backupTasksState();
  
  return task;
}

/**
 * Execute a task - MANDATORY for all user actions
 */
export async function executeTask(
  taskId: string,
  executor: (task: Task, signal: AbortSignal) => Promise<void>
): Promise<void> {
  const task = tasks.get(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  if (task.status === 'RUNNING') {
    throw new Error(`Task ${taskId} is already running`);
  }

  if (task.status === 'CANCELED' || task.status === 'DONE' || task.status === 'FAILED') {
    throw new Error(`Task ${taskId} is already ${task.status}`);
  }

  // Create abort controller if not exists
  const abortController = task.cancelToken?.aborted 
    ? new AbortController()
    : new AbortController();
  task.cancelToken = abortController.signal;

  // ENFORCEMENT: Track execution attempt
  trackExecution(`task:${taskId}`, taskId);
  
  // ENFORCEMENT: UI updates BEFORE work starts (instant feedback)
  task.status = 'RUNNING';
  task.startedAt = Date.now();
  updateTask(task);
  
  // Backup state immediately
  backupTasksState();

  const promise = (async () => {
    try {
      // ENFORCEMENT: Use worker for heavy operations
      if (shouldUseWorker(task.type)) {
        await executeInWorker(taskId, task.type, task.meta || {}, abortController.signal);
      } else {
        // Light operations can run on main thread
        await executor(task, abortController.signal);
      }
      
      if (!abortController.signal.aborted) {
        task.status = 'DONE';
        task.endedAt = Date.now();
        updateTask(task);
        backupTasksState();
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        task.status = 'CANCELED';
        logTask(taskId, 'Task cancelled by user');
      } else {
        task.status = 'FAILED';
        logTask(taskId, `Failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      task.endedAt = Date.now();
      updateTask(task);
      backupTasksState();
    } finally {
      runningTasks.delete(taskId);
    }
  })();

  // REAL-TIME LAUNCH: Start watchdog on first task execution
  if (runningTasks.size === 0) {
    startWatchdog();
  }
  
  const startTime = Date.now();
  runningTasks.set(taskId, { abortController, promise, startTime });

  return promise;
}

/**
 * Cancel a task - MUST work instantly
 */
export function cancelTask(taskId: string): boolean {
  const task = tasks.get(taskId);
  if (!task) {
    return false;
  }

  const running = runningTasks.get(taskId);
  if (running) {
    running.abortController.abort();
    runningTasks.delete(taskId);
  }

  task.status = 'CANCELED';
  task.endedAt = Date.now();
  logTask(taskId, 'Cancelled by user');
  updateTask(task);

  // Emit cancelled event (not 'cancelled' - match event name)
  eventBus.emit('task:cancelled', task);
  return true;
}

export function updateTask(task: Task) {
  tasks.set(task.id, task);
  eventBus.emit('task:updated', task);
}

export function setTaskStatus(id: string, status: TaskStatus) {
  const t = tasks.get(id);
  if (!t) return;
  t.status = status;
  updateTask(t);
}

export function logTask(id: string, message: string) {
  const t = tasks.get(id);
  if (!t) return;
  const ts = `[${new Date().toISOString()}] ${message}`;
  t.logs.push(ts);
  eventBus.emit('task:log', { id, message: ts });
}

export function streamOutput(id: string, data: string) {
  const t = tasks.get(id);
  if (!t) return;
  t.output.push(data);
  eventBus.emit('task:output', { id, data });
}

export function completeTask(id: string) {
  setTaskStatus(id, 'DONE');
  const t = tasks.get(id);
  if (t) eventBus.emit('task:completed', t);
}

export function failTask(id: string, reason?: string) {
  const t = tasks.get(id);
  if (!t) return;
  
  setTaskStatus(id, 'FAILED');
  t.endedAt = Date.now();
  if (reason) logTask(id, `Failed: ${reason}`);
  eventBus.emit('task:completed', t);
}

export function getRunningTasks(): Task[] {
  return Array.from(tasks.values()).filter(t => t.status === 'RUNNING');
}

export function getSystemState(): 'idle' | 'running' {
  return getRunningTasks().length > 0 ? 'running' : 'idle';
}

/**
 * Clean up tasks on restart - marks all running tasks as FAILED
 * 
 * REAL-TIME LAUNCH REQUIREMENT: Restart safety
 * Called during app initialization to handle tasks that were running when app restarted
 */
export function cleanupTasksOnRestart(): void {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const task of tasks.values()) {
    if (task.status === 'RUNNING') {
      task.status = 'FAILED';
      task.endedAt = now;
      const logEntry = `[Recovery] Task marked as FAILED due to app restart`;
      task.logs.push(`[${new Date(now).toISOString()}] ${logEntry}`);
      eventBus.emit('task:failed', task);
      cleanedCount++;
    }
  }
  
  // Clear running tasks
  runningTasks.clear();
  
  if (cleanedCount > 0) {
    console.log(`[TaskManager] Cleaned up ${cleanedCount} running task(s) on restart`);
  }
}

export { tasks, runningTasks };
