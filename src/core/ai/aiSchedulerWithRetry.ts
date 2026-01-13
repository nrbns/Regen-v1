/**
 * AI Scheduler with Timeout and Retry Support
 * 
 * Enhanced AI scheduler with:
 * - Configurable timeouts per action type
 * - Automatic retry logic for failed actions
 * - Pattern detection integration (idle time triggers)
 * - Exponential backoff for retries
 */

import { regenEventBus } from "../events/eventBus";
import { getAIConfig, getTimeoutForActionType, getMaxRetriesForActionType } from "./aiConfig";

export interface AITaskOptions {
  /** Timeout in milliseconds (uses config default if not specified) */
  timeout?: number;
  /** Maximum number of retries (uses config default if not specified) */
  maxRetries?: number;
  /** Retry delay in milliseconds (uses config default if not specified) */
  retryDelay?: number;
  /** Whether to use exponential backoff (uses config default if not specified) */
  exponentialBackoff?: boolean;
  /** Action type for pattern-based timeout configuration */
  actionType?: 'pattern-detection' | 'command' | 'automation' | 'idle-trigger';
}

export interface AITaskResult {
  success: boolean;
  error?: Error;
  attemptCount: number;
  duration: number;
}

// Default timeouts per action type
const DEFAULT_TIMEOUTS: Record<string, number> = {
  'pattern-detection': 5000,  // 5s for pattern detection (fast)
  'command': 10000,           // 10s for commands (standard)
  'automation': 30000,        // 30s for automations (longer)
  'idle-trigger': 8000,       // 8s for idle triggers (medium)
  'default': 10000,           // 10s default
};

let running = false;
let currentTask: Promise<AITaskResult> | null = null;
let currentAbortController: AbortController | null = null;
let lastActivity = Date.now();

// Track activity
if (typeof window !== 'undefined') {
  regenEventBus.subscribe((e) => {
    if (e.type !== "IDLE") {
      lastActivity = Date.now();
    }
  });
}

/**
 * Run AI task with timeout and retry support
 */
export async function runAIWithRetry(
  task: (signal: AbortSignal) => Promise<void>,
  options: AITaskOptions = {}
): Promise<AITaskResult> {
  const config = getAIConfig();
  const actionType = options.actionType || 'default';
  
  const {
    timeout = options.timeout ?? getTimeoutForActionType(actionType),
    maxRetries = options.maxRetries ?? getMaxRetriesForActionType(actionType),
    retryDelay = options.retryDelay ?? config.defaultRetryDelay,
    exponentialBackoff = options.exponentialBackoff ?? config.useExponentialBackoff,
  } = options;

  let attemptCount = 0;
  let lastError: Error | undefined;
  const startTime = Date.now();

  // Cancel any running task
  if (running) {
    console.log("[AIScheduler] Task already running, cancelling previous");
    cancelAI();
  }

  while (attemptCount <= maxRetries) {
    attemptCount++;
    running = true;
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`AI task timeout after ${timeout}ms`));
        }, timeout);
      });

      // Race between task and timeout
      await Promise.race([
        task(signal),
        timeoutPromise,
      ]);

      // Success
      running = false;
      currentTask = null;
      currentAbortController = null;

      const duration = Date.now() - startTime;
      console.log(`[AIScheduler] Task completed successfully (attempt ${attemptCount}, ${duration}ms)`);

      return {
        success: true,
        attemptCount,
        duration,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if aborted
      if (signal.aborted) {
        console.log("[AIScheduler] Task cancelled");
        running = false;
        currentTask = null;
        currentAbortController = null;
        return {
          success: false,
          error: new Error('Task cancelled'),
          attemptCount,
          duration: Date.now() - startTime,
        };
      }

      // Check if we should retry
      if (attemptCount <= maxRetries) {
        const delay = exponentialBackoff
          ? retryDelay * Math.pow(2, attemptCount - 1)
          : retryDelay;

        console.warn(
          `[AIScheduler] Task failed (attempt ${attemptCount}/${maxRetries}), retrying in ${delay}ms:`,
          lastError.message
        );

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // Max retries reached
        console.error(
          `[AIScheduler] Task failed after ${attemptCount} attempts:`,
          lastError.message
        );
        running = false;
        currentTask = null;
        currentAbortController = null;

        return {
          success: false,
          error: lastError,
          attemptCount,
          duration: Date.now() - startTime,
        };
      }
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attemptCount,
    duration: Date.now() - startTime,
  };
}

/**
 * Run AI task for pattern detection (optimized for speed)
 */
export async function runAIPatternDetection(
  task: (signal: AbortSignal) => Promise<void>
): Promise<AITaskResult> {
  return runAIWithRetry(task, {
    actionType: 'pattern-detection',
    timeout: DEFAULT_TIMEOUTS['pattern-detection'],
    maxRetries: 2, // Fewer retries for pattern detection
  });
}

/**
 * Run AI task for idle triggers (medium timeout)
 */
export async function runAIIdleTrigger(
  task: (signal: AbortSignal) => Promise<void>
): Promise<AITaskResult> {
  return runAIWithRetry(task, {
    actionType: 'idle-trigger',
    timeout: DEFAULT_TIMEOUTS['idle-trigger'],
    maxRetries: 3,
  });
}

/**
 * Check if AI is currently running
 */
export function isAIRunning(): boolean {
  return running;
}

/**
 * Cancel current AI task - MUST work instantly
 */
export function cancelAI(): void {
  if (currentAbortController) {
    currentAbortController.abort();
    running = false;
    currentTask = null;
    currentAbortController = null;
    console.log("[AIScheduler] Task cancelled");
  }
}

/**
 * Get default timeout for action type (legacy compatibility)
 */
export function getDefaultTimeout(actionType: string): number {
  return getTimeoutForActionType(actionType);
}

/**
 * Update default timeout for action type (legacy compatibility)
 */
export function setDefaultTimeout(actionType: string, timeout: number): void {
  const { updateAIConfig } = require('./aiConfig');
  updateAIConfig({
    timeouts: {
      [actionType]: timeout,
    },
  });
}
