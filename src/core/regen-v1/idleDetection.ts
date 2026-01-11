/**
 * Idle Detection - Regen-v1
 * Detects user idle time and emits IDLE events
 */

import { emitIdle } from "./integrationHelpers";

let idleTimeout: ReturnType<typeof setTimeout> | null = null;
let lastActivityTime = Date.now();
let isMonitoring = false;

const IDLE_THRESHOLD_MS = 60 * 1000; // 60 seconds

function resetIdleTimer(): void {
  if (idleTimeout) {
    clearTimeout(idleTimeout);
  }
  
  lastActivityTime = Date.now();
  
  idleTimeout = setTimeout(() => {
    const idleDuration = Date.now() - lastActivityTime;
    emitIdle(idleDuration);
  }, IDLE_THRESHOLD_MS);
}

export function initIdleDetection(): () => void {
  if (isMonitoring) {
    console.warn("[IdleDetection] Already monitoring");
    return () => {};
  }

  isMonitoring = true;
  
  // Track user activity (passive listeners for performance)
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
  
  events.forEach(event => {
    window.addEventListener(event, resetIdleTimer, { 
      passive: true, // Non-blocking
      capture: false // Don't capture, just listen
    });
  });

  // Start timer
  resetIdleTimer();

  return () => {
    isMonitoring = false;
    events.forEach(event => {
      window.removeEventListener(event, resetIdleTimer);
    });
    if (idleTimeout) {
      clearTimeout(idleTimeout);
      idleTimeout = null;
    }
  };
}