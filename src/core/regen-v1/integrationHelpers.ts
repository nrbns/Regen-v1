/**
 * Integration Helpers - Regen-v1
 * 
 * Helper functions to emit events from existing UI components
 * No rewrites needed - just call these functions.
 */

import { regenEventBus } from "../events/eventBus";

/**
 * Emit TAB_OPEN event
 */
export function emitTabOpen(payload?: any): void {
  regenEventBus.emit({ type: "TAB_OPEN", payload });
}

/**
 * Emit TAB_CLOSE event
 */
export function emitTabClose(payload?: any): void {
  regenEventBus.emit({ type: "TAB_CLOSE", payload });
}

/**
 * Emit URL_CHANGE event
 */
export function emitUrlChange(url: string): void {
  regenEventBus.emit({ type: "URL_CHANGE", payload: url });
}

/**
 * Emit SCROLL_END event (debounced)
 */
let scrollEndTimeout: ReturnType<typeof setTimeout> | null = null;
export function emitScrollEnd(): void {
  // Clear previous timeout for immediate cancellation
  if (scrollEndTimeout) {
    clearTimeout(scrollEndTimeout);
  }
  
  // Emit after scroll stops (300ms debounce for real-time feel)
  scrollEndTimeout = setTimeout(() => {
    regenEventBus.emit({ type: "SCROLL_END" });
    scrollEndTimeout = null;
  }, 300);
}

/**
 * Emit IDLE event
 */
export function emitIdle(duration?: number): void {
  regenEventBus.emit({ type: "IDLE", payload: duration });
}

/**
 * Emit COMMAND event
 */
export function emitCommand(command: string): void {
  regenEventBus.emit({ type: "COMMAND", payload: command });
}