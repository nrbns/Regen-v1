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
declare class TaskQueue {
    private queue;
    private running;
    private maxConcurrent;
    private processing;
    /**
     * Add a task to the queue
     */
    enqueue<T>(fn: () => Promise<T>, priority?: TaskPriority): Promise<T>;
    /**
     * Process the queue
     */
    private processQueue;
    /**
     * Get queue status
     */
    getStatus(): {
        queued: number;
        running: number;
    };
    /**
     * Clear queue
     */
    clear(): void;
}
export declare const taskQueue: TaskQueue;
export {};
