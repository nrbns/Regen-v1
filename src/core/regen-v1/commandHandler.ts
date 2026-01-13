/**
 * Command Handler - Regen-v1
 * 
 * Routes COMMAND events from Regen-v1 event bus to CommandController
 */

import { regenEventBus, RegenEvent } from "../events/eventBus";
import { useAvatar } from "../avatar/avatarStore";
import { runAI } from "../ai/aiScheduler";
import { showSuccess, showError } from "./commandFeedback";
import { createTask, executeTask, cancelTask } from "../execution/taskManager";

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
      
      // 1. Create task (mandatory - all execution through task manager)
      const task = createTask("command", { command: command.substring(0, 100) });

      // Update avatar to thinking (instant, non-blocking)
      const { set } = useAvatar.getState();
      set("thinking");

      // 2. Execute through task manager (enforced)
      executeTask(task.id, async (task, signal) => {
        // Check cancellation
        if (signal.aborted) {
          throw new Error("Cancelled");
        }

        // 3. Run through AI scheduler (with cancel support)
        await runAI(async (aiSignal) => {
          // Check cancellation
          if (signal.aborted || aiSignal.aborted) {
            throw new Error("Cancelled");
          }

          try {
            // Lazy import to avoid circular deps
            const { commandController } = await import("../../lib/command/CommandController");
            
            // Get active tab ID if available
            let activeTabId: string | undefined;
            try {
              const { useTabsStore } = await import("../../state/tabsStore");
              const { activeTabId: currentActiveTabId } = useTabsStore.getState();
              activeTabId = currentActiveTabId;
            } catch {
              // Tabs store not available, continue without tab ID
            }
            
            // Check cancellation before executing
            if (signal.aborted || aiSignal.aborted) {
              throw new Error("Cancelled");
            }
            
            const result = await commandController.handleCommand(command, {
              currentUrl: window.location.href,
              activeTab: activeTabId,
            });

            // Check cancellation after execution
            if (signal.aborted || aiSignal.aborted) {
              throw new Error("Cancelled");
            }

            // Update avatar based on result
            if (result.success) {
              set("reporting");
              console.log("[CommandHandler] Command executed successfully:", result.message);
              
              // Show success feedback
              if (result.message) {
                showSuccess(result.message);
              }
            } else {
              set("reporting");
              console.warn("[CommandHandler] Command execution failed:", result.message || result.error);
              
              // Show error feedback
              showError(result.message || result.error || "Command execution failed");
            }
            
            // Auto-return to idle after reporting
            setTimeout(() => {
              set("idle");
            }, 2000);
          } catch (error) {
            if (signal.aborted || aiSignal.aborted) {
              throw new Error("Cancelled");
            }
            console.error("[CommandHandler] Command execution failed:", error);
            set("idle");
            
            // Show error feedback
            showError(error instanceof Error ? error.message : "Command execution failed");
            throw error;
          }
        });
      }).catch((error) => {
        if (error instanceof Error && error.message === "Cancelled") {
          cancelTask(task.id);
          set("idle");
          return;
        }
        console.error("[CommandHandler] Task execution error:", error);
        set("idle");
      });
    }
  });

  return () => {
    unsubscribe();
    commandHandlerInitialized = false;
  };
}