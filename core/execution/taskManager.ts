import { eventBus } from "./eventBus";
import { Task, TaskStatus } from "./task";

/**
 * Global task registry - maps task IDs to Task objects
 */
export const tasks = new Map<string, Task>();

/**
 * Create a new task and emit creation event
 * @param intent Human-readable description of what the task will do
 * @returns The newly created task
 */
export function createTask(intent: string): Task {
  const task: Task = {
    id: crypto.randomUUID(),
    intent,
    status: "CREATED",
    output: [],
    logs: [],
    createdAt: Date.now(),
  };

  tasks.set(task.id, task);
  eventBus.emit("task:created", task);

  log(task, `Task created: ${intent}`);
  return task;
}

/**
 * Stream a chunk of output to the task
 * @param task The task to stream to
 * @param chunk The output chunk to append
 */
export function stream(task: Task, chunk: string) {
  task.output.push(chunk);
  updateTaskStatus(task, "PARTIAL");
  eventBus.emit("task:updated", task);
}

/**
 * Add a log message to the task
 * @param task The task to log to
 * @param message The log message
 */
export function log(task: Task, message: string) {
  task.logs.push(`[${new Date().toISOString()}] ${message}`);
  eventBus.emit("task:log", { id: task.id, message: task.logs[task.logs.length - 1] });
}

/**
 * Mark a task as completed successfully
 * @param task The task to complete
 */
export function complete(task: Task) {
  task.status = "DONE";
  task.completedAt = Date.now();
  eventBus.emit("task:updated", task);
}

/**
 * Mark a task as failed
 * @param task The task that failed
 * @param error Optional error message
 */
export function fail(task: Task, error?: string) {
  task.status = "FAILED";
  task.error = error;
  task.completedAt = Date.now();
  eventBus.emit("task:updated", task);
}

/**
 * Cancel a running task
 * @param task The task to cancel
 */
export function cancel(task: Task) {
  task.status = "CANCELLED";
  task.completedAt = Date.now();
  log(task, "Task cancelled by user");
  eventBus.emit("task:updated", task);
}

/**
 * Pause a running task
 * @param task The task to pause
 */
export function pause(task: Task) {
  if (task.status === "RUNNING" || task.status === "PARTIAL") {
    task.status = "PAUSED";
    log(task, "Task paused by user");
    eventBus.emit("task:updated", task);
  }
}

/**
 * Resume a paused task
 * @param task The task to resume
 */
export function resume(task: Task) {
  if (task.status === "PAUSED") {
    task.status = "RUNNING";
    log(task, "Task resumed by user");
    eventBus.emit("task:updated", task);
  }
}

/**
 * Start executing a task
 * @param task The task to start
 */
export function start(task: Task) {
  task.status = "RUNNING";
  task.startedAt = Date.now();
  log(task, "Task execution started");
  eventBus.emit("task:updated", task);
}

/**
 * Update task progress
 * @param task The task to update
 * @param progress Progress percentage (0-100)
 */
export function updateProgress(task: Task, progress: number) {
  task.progress = Math.max(0, Math.min(100, progress));
  eventBus.emit("task:updated", task);
}

/**
 * Get a task by ID
 * @param id Task ID
 * @returns Task object or undefined if not found
 */
export function getTask(id: string): Task | undefined {
  return tasks.get(id);
}

/**
 * Get all tasks
 * @returns Array of all tasks
 */
export function getAllTasks(): Task[] {
  return Array.from(tasks.values());
}

/**
 * Get tasks by status
 * @param status Task status to filter by
 * @returns Array of tasks with the specified status
 */
export function getTasksByStatus(status: TaskStatus): Task[] {
  return getAllTasks().filter(task => task.status === status);
}

/**
 * Internal function to update task status and emit events
 */
function updateTaskStatus(task: Task, status: TaskStatus) {
  const oldStatus = task.status;
  task.status = status;

  if (oldStatus !== status) {
    eventBus.emit("task:status-changed", { task, oldStatus, newStatus: status });
  }
}

/**
 * Clean up old completed tasks (memory management)
 * @param maxAge Maximum age in milliseconds for completed tasks to keep
 */
export function cleanupOldTasks(maxAge: number = 24 * 60 * 60 * 1000) { // 24 hours default
  const now = Date.now();
  const toDelete: string[] = [];

  for (const [id, task] of tasks) {
    if ((task.status === "DONE" || task.status === "FAILED" || task.status === "CANCELLED") &&
        task.completedAt && (now - task.completedAt) > maxAge) {
      toDelete.push(id);
    }
  }

  toDelete.forEach(id => tasks.delete(id));
  if (toDelete.length > 0) {
    eventBus.emit("tasks:cleaned", { deletedCount: toDelete.length });
  }
}
