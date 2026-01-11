/**
 * Automation Engine - Regen-v1
 * 
 * Event-driven automation that runs locally.
 * Visible, cancelable, and cheap.
 */

import { regenEventBus, RegenEvent } from "../events/eventBus";
import { rules, getRulesForTrigger } from "./rules";
import { useAvatar } from "../avatar/avatarStore";
import { runAI } from "../ai/aiScheduler";

/**
 * Initialize automation engine
 */
export function initAutomationEngine(): () => void {
  const unsubscribe = regenEventBus.subscribe((e: RegenEvent) => {
    // Map RegenEvent types to rule triggers
    let trigger: "TAB_OPEN" | "URL_CHANGE" | "SCROLL_END" | "IDLE" | null = null;

    if (e.type === "TAB_OPEN") trigger = "TAB_OPEN";
    if (e.type === "URL_CHANGE") trigger = "URL_CHANGE";
    if (e.type === "SCROLL_END") trigger = "SCROLL_END";
    if (e.type === "IDLE") trigger = "IDLE";

    if (!trigger) return;

    const matchingRules = getRulesForTrigger(trigger);

    matchingRules.forEach((rule) => {
      // Check if rule matches
      if (rule.match && !rule.match(e.payload)) {
        return;
      }

      // Execute action
      executeAction(rule.action, e.payload);
    });
  });

  return unsubscribe;
}

/**
 * Execute an automation action
 */
async function executeAction(action: string, payload: any): Promise<void> {
  switch (action) {
    case "SUMMARIZE_AND_SAVE":
      await runAI(async () => {
        const { set } = useAvatar.getState();
        set("thinking");
        
        // TODO: Implement actual summarization and saving
        console.log("[Automation] Summarizing and saving:", payload);
        
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        set("reporting");
        
        setTimeout(() => {
          set("idle");
        }, 2000);
      });
      break;

    default:
      console.warn(`[Automation] Unknown action: ${action}`);
  }
}