/**
 * Intent Engine / Observer - Regen-v1
 * 
 * Cheap logic first - AI runs only after intent is clear.
 * Observes events and triggers AI only when needed.
 * 
 * NOTE: COMMAND events are handled by commandHandler.ts
 * This observer focuses on passive pattern detection.
 */

import { regenEventBus } from "../events/eventBus";
import { runAI } from "../ai/aiScheduler";
import { useAvatar } from "../avatar/avatarStore";

/**
 * Initialize the intent observer
 * Subscribes to events and triggers AI when needed
 */
export function initIntentObserver(): () => void {
  const unsubscribe = regenEventBus.subscribe((e) => {
    // COMMAND events are handled by commandHandler.ts
    // Don't process them here to avoid duplicate handling

    // Cheap logic first - determine if AI is needed
    if (e.type === "SCROLL_END") {
      // Scroll ended - might want to summarize/analyze
      // Only trigger if user has been scrolling for a while (detect reading pattern)
      // For now, just update avatar state - don't trigger AI automatically
      // AI should only trigger on explicit user intent
      
      // TODO: Add pattern detection here (e.g., deep scroll + time = reading)
      // For now, scroll just makes avatar aware (handled by avatarController)
    }

    // Add more intent detection logic here
    // Only trigger AI when intent is clear and valuable
  });

  return unsubscribe;
}