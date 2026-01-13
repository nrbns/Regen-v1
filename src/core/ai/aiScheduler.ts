/**
 * AI Scheduler - Regen-v1
 * 
 * Low RAM guarantee: Only ONE AI job at a time.
 * New requests cancel old ones (abort support can be added later).
 */

import { regenEventBus } from "../events/eventBus";

const MAX_AI_RUNTIME_MS = 10000; // 10 seconds
const IDLE_UNLOAD_MS = 60000; // 60 seconds

let running = false;
let currentTask: Promise<void> | null = null;
let currentAbortController: AbortController | null = null;
let lastActivity = Date.now();

  // Track activity (initialize once when module loads)
  // NOTE: Background intervals removed - only run on user action
  if (typeof window !== 'undefined') {
    regenEventBus.subscribe((e) => {
      if (e.type !== "IDLE") {
        lastActivity = Date.now();
      }
    });

    // Background idle unload removed - only run when user explicitly triggers idle
  }

export async function runAI(task: (signal: AbortSignal) => Promise<void>): Promise<void> {
  if (running) {
    console.log("[AIScheduler] Task already running, cancelling previous");
    cancelAI();
  }

  running = true;
  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;
  
  // Add timeout
  const timeoutId = setTimeout(() => {
    if (!signal.aborted) {
      console.warn("[AIScheduler] Task exceeded max runtime, cancelling");
      cancelAI();
    }
  }, MAX_AI_RUNTIME_MS);

  // Execute task asynchronously (non-blocking)
  currentTask = (async () => {
    try {
      await task(signal);
    } catch (error) {
      if (signal.aborted) {
        console.log("[AIScheduler] Task cancelled");
      } else {
        console.error("[AIScheduler] Task error:", error);
      }
    } finally {
      clearTimeout(timeoutId);
      running = false;
      currentTask = null;
      currentAbortController = null;
    }
  })();

  // Don't await - return immediately for non-blocking behavior
  // The task will run in the background
  return currentTask;
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