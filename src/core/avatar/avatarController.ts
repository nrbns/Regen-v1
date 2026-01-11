/**
 * Avatar Controller - Regen-v1
 * 
 * Reacts to events and updates avatar state instantly.
 * Zero AI logic here - just state transitions.
 */

import { regenEventBus } from "../events/eventBus";
import { useAvatar } from "./avatarStore";

/**
 * Initialize avatar controller
 * Subscribe to events and update avatar state
 */
export function initAvatarController(): () => void {
  const unsubscribe = regenEventBus.subscribe((e) => {
    // All state transitions are instant (synchronous, non-blocking)
    const { set } = useAvatar.getState();

    // Instant state transitions (no AI, no async operations)
    if (e.type === "SCROLL_END") {
      set("aware"); // Immediate state update
      // Auto-return to idle after 3 seconds if no other action
      setTimeout(() => {
        if (useAvatar.getState().state === "aware") {
          set("idle");
        }
      }, 3000);
    }
    if (e.type === "IDLE") {
      set("idle"); // Immediate state update
    }
    if (e.type === "AVATAR_INVOKE") {
      set("listening"); // Immediate state update (<50ms guaranteed)
      // Auto-return to idle if no command after 30 seconds
      const timeoutId = setTimeout(() => {
        if (useAvatar.getState().state === "listening") {
          set("idle");
        }
      }, 30000);
      
      // Store timeout so it can be cleared if command is submitted
      (useAvatar.getState() as any)._invokeTimeout = timeoutId;
    }
  });

  return unsubscribe;
}