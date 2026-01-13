/**
 * Runtime Enforcement System
 * 
 * NON-NEGOTIABLE RULES:
 * 1. No code runs without a task
 * 2. UI never waits - task appears before work starts
 * 3. Everything is event-driven - no polling
 * 4. No long work on main thread
 * 5. Watchdog kills frozen workers
 * 6. Auto-recovery restores state on crash
 */

import { eventBus } from '../execution/eventBus';
import { getRunningTasks, cancelTask } from '../execution/taskManager';

// Track all execution attempts
const executionAttempts = new Map<string, {
  taskId: string | null;
  timestamp: number;
  stack?: string;
}>();

// Watchdog for frozen tasks
let watchdogInterval: ReturnType<typeof setInterval> | null = null;
const FROZEN_THRESHOLD_MS = 30000; // 30 seconds = frozen
const WATCHDOG_CHECK_INTERVAL_MS = 5000; // Check every 5 seconds

/**
 * ENFORCEMENT RULE 1: No code runs without a task
 * 
 * Call this before ANY async/long operation
 * Throws if no task exists for the operation
 */
export function requireTask(context: string, taskId?: string | null): string {
  if (!taskId) {
    const error = new Error(
      `[ENFORCEMENT] Operation "${context}" attempted without task. ` +
      `All operations MUST go through taskManager.createTask() and taskManager.executeTask().`
    );
    console.error(error);
    // In production, throw to prevent execution
    // In dev, warn but allow (for easier debugging)
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    return '';
  }
  return taskId;
}

/**
 * ENFORCEMENT RULE 2: Track all execution attempts
 * 
 * Logs every execution attempt for audit/debugging
 */
export function trackExecution(context: string, taskId: string | null, stack?: string): void {
  executionAttempts.set(context, {
    taskId,
    timestamp: Date.now(),
    stack: stack || new Error().stack,
  });

  // Emit event for monitoring
  eventBus.emit('execution:attempted', { context, taskId, timestamp: Date.now() });
}

/**
 * ENFORCEMENT RULE 3: Watchdog for frozen tasks
 * 
 * Kills tasks that have been running > FROZEN_THRESHOLD_MS
 * This prevents UI freeze and zombie processes
 */
export function startWatchdog(): void {
  if (watchdogInterval) {
    return; // Already running
  }

  watchdogInterval = setInterval(() => {
    const running = getRunningTasks();
    const now = Date.now();

    for (const task of running) {
      const runtime = task.startedAt ? (now - task.startedAt) : 0;

      if (runtime > FROZEN_THRESHOLD_MS) {
        console.warn(
          `[WATCHDOG] Task ${task.id} (${task.type}) has been running for ${runtime}ms - killing`
        );

        // Kill the frozen task
        try {
          cancelTask(task.id);
          eventBus.emit('task:frozen', { taskId: task.id, runtime });
        } catch (error) {
          console.error(`[WATCHDOG] Failed to kill frozen task ${task.id}:`, error);
        }
      }
    }
  }, WATCHDOG_CHECK_INTERVAL_MS);

  console.log('[ENFORCEMENT] Watchdog started');
}

export function stopWatchdog(): void {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
    console.log('[ENFORCEMENT] Watchdog stopped');
  }
}

/**
 * ENFORCEMENT RULE 4: Auto-recovery on crash
 * 
 * Restores task state from localStorage on app reload
 * Marks running tasks as FAILED (they were interrupted)
 */
export function restoreTasksOnReload(): void {
  try {
    const savedTasks = localStorage.getItem('regen:tasks:backup');
    if (!savedTasks) {
      return;
    }

    const tasks = JSON.parse(savedTasks);
    const now = Date.now();

    // Mark any running tasks as FAILED (they were interrupted by reload)
    for (const task of tasks) {
      if (task.status === 'RUNNING') {
        task.status = 'FAILED';
        task.endedAt = now;
        task.logs = [
          ...(task.logs || []),
          `Task interrupted by app reload at ${new Date(now).toISOString()}`,
        ];
      }
    }

    // Emit events for restored tasks
    eventBus.emit('tasks:restored', tasks);

    console.log(`[ENFORCEMENT] Restored ${tasks.length} tasks from crash/reload`);
  } catch (error) {
    console.error('[ENFORCEMENT] Failed to restore tasks:', error);
  }
}

/**
 * ENFORCEMENT RULE 5: Backup task state periodically
 * 
 * Saves current task state to localStorage for crash recovery
 */
export function backupTasksState(): void {
  try {
    const { listTasks } = require('../execution/taskManager');
    const tasks = listTasks();
    localStorage.setItem('regen:tasks:backup', JSON.stringify(tasks));
  } catch (error) {
    console.error('[ENFORCEMENT] Failed to backup tasks:', error);
  }
}

/**
 * ENFORCEMENT RULE 6: Audit execution attempts
 * 
 * Returns report of all execution attempts (for debugging)
 */
export function auditExecution(): {
  total: number;
  withTask: number;
  withoutTask: number;
  attempts: Array<{ context: string; taskId: string | null; timestamp: number }>;
} {
  const attempts = Array.from(executionAttempts.entries()).map(([context, data]) => ({
    context,
    taskId: data.taskId,
    timestamp: data.timestamp,
  }));

  const withTask = attempts.filter(a => a.taskId).length;
  const withoutTask = attempts.filter(a => !a.taskId).length;

  return {
    total: attempts.length,
    withTask,
    withoutTask,
    attempts,
  };
}

// Initialize on load
if (typeof window !== 'undefined') {
  // Restore tasks on reload
  restoreTasksOnReload();

  // Start watchdog
  startWatchdog();

  // Backup tasks every 30 seconds
  setInterval(backupTasksState, 30000);

  // Backup on unload
  window.addEventListener('beforeunload', backupTasksState);
}
