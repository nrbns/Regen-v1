/**
 * Command Handler - Regen-v1
 * 
 * Routes COMMAND events from Regen-v1 event bus to CommandController
 */

import { regenEventBus, RegenEvent } from "../events/eventBus";
import { useAvatar } from "../avatar/avatarStore";
import { runAI } from "../ai/aiScheduler";

let commandHandlerInitialized = false;

/**
 * Initialize command handler
 * Routes COMMAND events to CommandController
 */
export function initCommandHandler(): () => void {
  if (commandHandlerInitialized) {
    console.warn("[CommandHandler] Already initialized");
    return () => {};
  }

  commandHandlerInitialized = true;

  const unsubscribe = regenEventBus.subscribe((e: RegenEvent) => {
    if (e.type === "COMMAND" && e.payload) {
      const command = typeof e.payload === "string" ? e.payload : String(e.payload);
      
      // Clear avatar invoke timeout if exists
      const avatarState = useAvatar.getState() as any;
      if (avatarState._invokeTimeout) {
        clearTimeout(avatarState._invokeTimeout);
        delete avatarState._invokeTimeout;
      }
      
      // Update avatar to thinking (instant, non-blocking)
      const { set } = useAvatar.getState();
      set("thinking");

      // Execute command via CommandController using AI scheduler (non-blocking)
      // Use setTimeout to ensure this doesn't block the event loop
      setTimeout(() => {
        runAI(async () => {
          try {
            // Lazy import to avoid circular deps
            const { commandController } = await import("../../lib/command/CommandController");
            
            const result = await commandController.handleCommand(command, {
              currentUrl: window.location.href,
              activeTab: undefined, // Will be resolved by CommandController
            });

            // Update avatar based on result
            set("reporting");
            
            // Auto-return to idle after reporting
            setTimeout(() => {
              set("idle");
            }, 2000);
          } catch (error) {
            console.error("[CommandHandler] Command execution failed:", error);
            set("idle");
          }
        }).catch((error) => {
          console.error("[CommandHandler] AI scheduler error:", error);
          set("idle");
        });
      }, 0); // Schedule for next event loop tick (non-blocking)
    }
  });

  return () => {
    unsubscribe();
    commandHandlerInitialized = false;
  };
}