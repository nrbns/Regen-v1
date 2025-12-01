/**
 * Task Queue - Graceful degradation for heavy tasks
 * Prevents UI blocking by queuing and throttling heavy operations
 */

export type TaskPriority = 'high' | 'medium' | 'low';

export interface QueuedTask {
  id: string;
  fn: () => Promise<any>;
  priority: TaskPriority;
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: Error;
}

class TaskQueue {
  private queue: QueuedTask[] = [];
  private running: Set<string> = new Set();
  private maxConcurrent = 2; // Max 2 heavy tasks at once
  private processing = false;

  /**
   * Add a task to the queue
   */
  async enqueue<T>(
    fn: () => Promise<T>,
    priority: TaskPriority = 'medium'
  ): Promise<T> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const task: QueuedTask = {
      id: taskId,
      fn,
      priority,
      queuedAt: Date.now(),
    };

    // Insert based on priority
    if (priority === 'high') {
      this.queue.unshift(task);
    } else if (priority === 'low') {
      this.queue.push(task);
    } else {
      // Medium priority - insert after high priority tasks
      const highPriorityCount = this.queue.filter(t => t.priority === 'high').length;
      this.queue.splice(highPriorityCount, 0, task);
    }

    this.processQueue();

    // Wait for task to complete
    return new Promise<T>((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const task = this.queue.find(t => t.id === taskId);
        if (!task) {
          clearInterval(checkInterval);
          return;
        }

        if (task.completedAt) {
          clearInterval(checkInterval);
          if (task.error) {
            reject(task.error);
          } else {
            resolve(task as any);
          }
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!this.queue.find(t => t.id === taskId)?.completedAt) {
          reject(new Error('Task timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.running.size >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const task = this.queue.shift();
      if (!task) break;

      this.running.add(task.id);
      task.startedAt = Date.now();

      // Execute task
      task
        .fn()
        .then(() => {
          task.completedAt = Date.now();
        })
        .catch(error => {
          task.error = error instanceof Error ? error : new Error(String(error));
          task.completedAt = Date.now();
        })
        .finally(() => {
          this.running.delete(task.id);
        });
    }

    this.processing = false;

    // Continue processing if there are more tasks
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Get queue status
   */
  getStatus(): { queued: number; running: number } {
    return {
      queued: this.queue.length,
      running: this.running.size,
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
  }
}

export const taskQueue = new TaskQueue();

