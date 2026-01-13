/**
 * Keyboard Shortcuts - Regen-v1
 * 
 * Global keyboard shortcuts for realtime actions:
 * - Ctrl + Space (Windows/Linux) / Cmd + Space (Mac) - Avatar invocation
 * - Ctrl + Shift + V (Windows/Linux) / Cmd + Shift + V (Mac) - Voice trigger
 * - Ctrl + K (Windows/Linux) / Cmd + K (Mac) - Unified search
 * - Ctrl + Shift + P (Windows/Linux) / Cmd + Shift + P (Mac) - Privacy dashboard
 */

import { regenEventBus } from "../events/eventBus";
import { toggleVoiceRecognition, isVoiceRecognitionAvailable } from "./voiceTriggers";

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
    // Check for Ctrl+Space (Windows/Linux) or Cmd+Space (Mac) - Avatar invocation
    const isAvatarShortcut = (e.ctrlKey || e.metaKey) && (e.key === " " || e.code === 'Space');
    
    // Check for Ctrl+Shift+V (Windows/Linux) or Cmd+Shift+V (Mac) - Voice trigger
    const isVoiceShortcut = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'v' || e.key === 'V');
    
    // Check for Ctrl+K (Windows/Linux) / Cmd+K (Mac) - Unified search
    const isSearchShortcut = (e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K');
    
    // Check for Ctrl+Shift+P (Windows/Linux) / Cmd+Shift+P (Mac) - Privacy dashboard
    const isPrivacyShortcut = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P');

    if (isAvatarShortcut) {
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

    if (isVoiceShortcut) {
      // Don't prevent default if in an input field
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (!isInput) {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if voice is available
        if (isVoiceRecognitionAvailable()) {
          toggleVoiceRecognition().catch((error) => {
            console.error('[KeyboardShortcuts] Failed to toggle voice:', error);
          });
        } else {
          console.warn('[KeyboardShortcuts] Voice recognition not available');
        }
      }
    }

    if (isSearchShortcut) {
      // Don't prevent default if in an input field
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (!isInput) {
        e.preventDefault();
        e.stopPropagation();
        
        // Emit unified search event
        regenEventBus.emit({ type: 'AVATAR_INVOKE' }); // Reuse avatar invoke for now, or create new event type
        // Dispatch custom event for UnifiedSearchPanel
        window.dispatchEvent(new CustomEvent('regen:unified-search:open'));
      }
    }

    if (isPrivacyShortcut) {
      // Don't prevent default if in an input field
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (!isInput) {
        e.preventDefault();
        e.stopPropagation();
        
        // Dispatch custom event for Privacy Dashboard
        window.dispatchEvent(new CustomEvent('regen:privacy-dashboard:open'));
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