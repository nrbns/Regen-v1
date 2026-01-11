/**
 * Keyboard Shortcuts - Regen-v1
 * 
 * Global keyboard shortcuts for avatar invocation:
 * - Ctrl + Space (Windows/Linux)
 * - Cmd + Space (Mac)
 */

import { regenEventBus } from "../events/eventBus";

let isInitialized = false;

/**
 * Initialize keyboard shortcuts
 */
export function initKeyboardShortcuts(): () => void {
  if (isInitialized) {
    console.warn("[KeyboardShortcuts] Already initialized");
    return () => {};
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    // Check for Ctrl+Space (Windows/Linux) or Cmd+Space (Mac)
    // Also check for e.code === 'Space' for better compatibility
    const isShortcut = (e.ctrlKey || e.metaKey) && (e.key === " " || e.code === 'Space');

    if (isShortcut) {
      // Don't prevent default if in an input field (let user type space)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (!isInput) {
        e.preventDefault();
        e.stopPropagation();
        // Emit immediately (real-time response)
        regenEventBus.emit({ type: "AVATAR_INVOKE" });
      }
    }
  };

  window.addEventListener("keydown", handleKeyDown, true);
  isInitialized = true;

  return () => {
    window.removeEventListener("keydown", handleKeyDown, true);
    isInitialized = false;
  };
}