/**
 * Task status lifecycle states
 */
export type TaskStatus =
  | "CREATED"     // Task just created, not yet started
  | "RUNNING"     // Task is actively executing
  | "PARTIAL"     // Task has partial results streaming
  | "PAUSED"      // Task is paused by user
  | "DONE"        // Task completed successfully
  | "FAILED"      // Task failed
  | "CANCELLED";  // Task was cancelled by user

/**
 * Core Task interface - represents any executable action in Regen
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;

  /** Human-readable intent description */
  intent: string;

  /** Current execution status */
  status: TaskStatus;

  /** Streaming output chunks */
  output: string[];

  /** Internal logs for debugging/decisions */
  logs: string[];

  /** Timestamp when task was created */
  createdAt: number;

  /** Optional: timestamp when task started */
  startedAt?: number;

  /** Optional: timestamp when task completed */
  completedAt?: number;

  /** Optional: error message if failed */
  error?: string;

  /** Optional: progress percentage (0-100) */
  progress?: number;
}
