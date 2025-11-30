/**
 * Cleanup utilities for memory leak prevention
 * DAY 5-6 FIX: Ensures proper cleanup of timers, listeners, and subscriptions
 */

export class CleanupManager {
  private timers: Set<ReturnType<typeof setTimeout>> = new Set();
  private intervals: Set<ReturnType<typeof setInterval>> = new Set();
  private listeners: Array<{ element: EventTarget; event: string; handler: EventListener }> = [];
  private abortControllers: Set<AbortController> = new Set();

  /**
   * Track a timeout for cleanup
   */
  setTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
    return timer;
  }

  /**
   * Track an interval for cleanup
   */
  setInterval(callback: () => void, delay: number): ReturnType<typeof setInterval> {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  /**
   * Track an event listener for cleanup
   */
  addEventListener(
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    element.addEventListener(event, handler, options);
    this.listeners.push({ element, event, handler });
  }

  /**
   * Track an AbortController for cleanup
   */
  addAbortController(controller: AbortController): AbortController {
    this.abortControllers.add(controller);
    return controller;
  }

  /**
   * Clear a specific timeout
   */
  clearTimeout(timer: ReturnType<typeof setTimeout>): void {
    clearTimeout(timer);
    this.timers.delete(timer);
  }

  /**
   * Clear a specific interval
   */
  clearInterval(interval: ReturnType<typeof setInterval>): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  /**
   * Remove a specific event listener
   */
  removeEventListener(element: EventTarget, event: string, handler: EventListener): void {
    element.removeEventListener(event, handler);
    this.listeners = this.listeners.filter(
      l => !(l.element === element && l.event === event && l.handler === handler)
    );
  }

  /**
   * Abort a specific controller
   */
  abort(controller: AbortController): void {
    controller.abort();
    this.abortControllers.delete(controller);
  }

  /**
   * Clean up all tracked resources
   */
  cleanup(): void {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();

    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];

    // Abort all controllers
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }
}

/**
 * React hook for automatic cleanup
 */
export function useCleanup() {
  const manager = new CleanupManager();
  
  // Cleanup on unmount
  if (typeof window !== 'undefined') {
    const originalCleanup = manager.cleanup.bind(manager);
    // Return cleanup function for useEffect
    return () => {
      originalCleanup();
    };
  }
  
  return () => {};
}

