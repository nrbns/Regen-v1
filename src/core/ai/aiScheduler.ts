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
let lastActivity = Date.now();

// Track activity (initialize once when module loads)
if (typeof window !== 'undefined') {
  regenEventBus.subscribe((e) => {
    if (e.type !== "IDLE") {
      lastActivity = Date.now();
    }
  });

  // Check for idle unload periodically
  setInterval(() => {
    if (running && Date.now() - lastActivity > IDLE_UNLOAD_MS) {
      console.log("[AIScheduler] Unloading AI due to idle");
      cancelAI();
    }
  }, IDLE_UNLOAD_MS);
}

export async function runAI(task: () => Promise<void>): Promise<void> {
  if (running) {
    console.log("[AIScheduler] Task already running, skipping");
    return;
  }

  running = true;
  
  // Add timeout
  const timeoutId = setTimeout(() => {
    console.warn("[AIScheduler] Task exceeded max runtime, cancelling");
    cancelAI();
  }, MAX_AI_RUNTIME_MS);

  // Execute task asynchronously (non-blocking)
  currentTask = (async () => {
    try {
      await task();
    } catch (error) {
      console.error("[AIScheduler] Task error:", error);
    } finally {
      clearTimeout(timeoutId);
      running = false;
      currentTask = null;
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
 * Cancel current AI task (placeholder for future abort support)
 */
export function cancelAI(): void {
  // TODO: Implement abort controller for task cancellation
  console.log("[AIScheduler] Cancel requested (not yet implemented)");
}