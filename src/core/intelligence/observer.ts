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
import { runAIIdleTrigger, runAIPatternDetection } from "../ai/aiSchedulerWithRetry";
import { useAvatar } from "../avatar/avatarStore";

// Pattern detection state
let scrollStartTime: number | null = null;
let scrollDepth: number = 0;
let lastScrollEndTime: number = 0;
let tabSwitchCount: number = 0;
let lastTabSwitchTime: number = 0;

const DEEP_SCROLL_THRESHOLD = 70; // 70% scroll depth
const READING_TIME_THRESHOLD = 10000; // 10 seconds of scrolling
const RAPID_TAB_SWITCH_THRESHOLD = 3; // 3 tabs in quick succession
const TAB_SWITCH_WINDOW_MS = 5000; // 5 seconds

/**
 * Initialize the intent observer
 * Subscribes to events and triggers AI when needed
 */
export function initIntentObserver(): () => void {
  const unsubscribe = regenEventBus.subscribe((e) => {
    // COMMAND events are handled by commandHandler.ts
    // Don't process them here to avoid duplicate handling

    // Pattern 1: Deep scroll + time = reading pattern (potential summarize intent)
    if (e.type === "SCROLL_END") {
      const now = Date.now();
      
      // Track scroll depth and duration
      if (scrollStartTime === null) {
        scrollStartTime = now;
      }
      
      const scrollDuration = now - (scrollStartTime || now);
      const timeSinceLastScroll = now - lastScrollEndTime;
      
      // Reset if user stopped scrolling for a while
      if (timeSinceLastScroll > 5000) {
        scrollStartTime = null;
        scrollDepth = 0;
      } else {
        // Estimate scroll depth (simplified - actual depth comes from scroll events)
        scrollDepth = Math.max(scrollDepth, 50); // Assume at least some scrolling
      }
      
      lastScrollEndTime = now;
      
      // Detect reading pattern: deep scroll + extended time
      // But don't auto-trigger - just prepare context
      // User must explicitly invoke for AI actions
      if (scrollDepth > DEEP_SCROLL_THRESHOLD && scrollDuration > READING_TIME_THRESHOLD) {
        // Reading pattern detected - could suggest summarization
        // But don't auto-trigger AI (per design: only on explicit user intent)
        console.log("[IntentObserver] Reading pattern detected (scroll depth + time)");
      }
    }

    // Pattern 2: Rapid tab switching = search/exploration pattern
    if (e.type === "TAB_OPEN") {
      const now = Date.now();
      const timeSinceLastSwitch = now - lastTabSwitchTime;
      
      if (timeSinceLastSwitch < TAB_SWITCH_WINDOW_MS) {
        tabSwitchCount++;
      } else {
        tabSwitchCount = 1; // Reset counter
      }
      
      lastTabSwitchTime = now;
      
      if (tabSwitchCount >= RAPID_TAB_SWITCH_THRESHOLD) {
        // Rapid tab switching pattern - user exploring
        console.log("[IntentObserver] Rapid tab switching pattern detected");
        // Could suggest: "Would you like me to organize these tabs?"
        // But don't auto-trigger (only on explicit intent)
      }
    }

    // Pattern 3: URL changes to specific domains = research/work pattern
    if (e.type === "URL_CHANGE" && e.payload) {
      const url = typeof e.payload === "string" ? e.payload : String(e.payload);
      
      // Detect research domains
      const researchDomains = [
        "arxiv.org",
        "scholar.google.com",
        "pubmed.ncbi.nlm.nih.gov",
        "github.com",
        "stackoverflow.com",
      ];
      
      const isResearchDomain = researchDomains.some(domain => url.includes(domain));
      
      if (isResearchDomain) {
        // Research domain detected - context for future commands
        console.log("[IntentObserver] Research domain detected:", url);
      }
    }

    // Pattern 4: Idle after activity = completion pattern
    if (e.type === "IDLE") {
      // Reset all pattern tracking on idle
      scrollStartTime = null;
      scrollDepth = 0;
      tabSwitchCount = 0;
      
      // Idle after active session - could suggest saving work
      // But don't auto-trigger (only on explicit intent)
      console.log("[IntentObserver] User idle - resetting pattern tracking");
    }

    // All pattern detection is passive - no AI calls unless user explicitly invokes
    // This maintains the "cheap logic first" principle
  });

  return unsubscribe;
}