/**
 * Regen-v1 Initialization
 * 
 * Initialize all core systems in phases:
 * - Phase 0: Event Bus (Nervous System)
 * - Phase 1: Avatar System (Instant Reactions)
 * - Phase 2: Intelligence Layer (Pattern Detection, Commands, Automation)
 * - Phase 3: Full Integration (Keyboard Shortcuts, Detection Systems)
 */

import { initAvatarController } from "../avatar/avatarController";
import { initIntentObserver } from "../intelligence/observer";
import { initAutomationEngine } from "../automation/engine";
import { initAutomationTriggers } from "../automation/trigger";
import { initKeyboardShortcuts } from "./keyboardShortcuts";
import { initVoiceTriggers } from "./voiceTriggers";
import { initCrossTabEventBus } from "../events/crossTabEventBus";
import { initSharedSessionMemory } from "./sharedSessionMemory";
import { initIdleDetection } from "./idleDetection";
import { initSearchDetection } from "./searchDetection";
import { initCommandHandler } from "./commandHandler";
import { initAllPhases } from "./phaseManager";
import { initRealtimeUnifiedSearch } from "../search/realtimeUnifiedSearch";

let initialized = false;
const cleanupFunctions: (() => void)[] = [];

/**
 * Initialize Regen-v1 core systems (all phases)
 */
export async function initRegenV1(): Promise<() => void> {
  if (initialized) {
    console.warn("[RegenV1] Already initialized");
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;
      initialized = false;
    };
  }

  console.log("[RegenV1] Initializing all phases...");

  // Phase 0: Event Bus (already created on import, verified here)
  try {
    const { regenEventBus } = await import("../events/eventBus");
    
    // Test event bus works
    let testReceived = false;
    const unsubscribe = regenEventBus.subscribe((e) => {
      if (e.type === "AVATAR_INVOKE") {
        testReceived = true;
      }
    });
    regenEventBus.emit({ type: "AVATAR_INVOKE" });
    unsubscribe();
    
    if (testReceived) {
      console.log("[RegenV1] ✓ Phase 0: Event Bus verified");
    } else {
      console.warn("[RegenV1] ⚠ Phase 0: Event Bus test failed");
    }
  } catch (error) {
    console.error("[RegenV1] ✗ Phase 0 failed:", error);
  }

  // Phase 1: Avatar System (Instant Reactions)
  try {
    const avatarCleanup = initAvatarController();
    cleanupFunctions.push(avatarCleanup);
    console.log("[RegenV1] ✓ Phase 1: Avatar System initialized");
  } catch (error) {
    console.error("[RegenV1] ✗ Phase 1 failed:", error);
  }

  // Phase 2: Intelligence Layer (Pattern Detection, Commands, Automation)
  try {
    // Intent Observer
    const observerCleanup = initIntentObserver();
    cleanupFunctions.push(observerCleanup);
    
    // Command Handler
    const commandHandlerCleanup = initCommandHandler();
    cleanupFunctions.push(commandHandlerCleanup);
    
    // Automation Engine
    const automationCleanup = initAutomationEngine();
    cleanupFunctions.push(automationCleanup);
    
    // Initialize automation trigger system (listens to events and executes enabled rules)
    const triggerCleanup = initAutomationTriggers();
    cleanupFunctions.push(triggerCleanup);
    
    console.log("[RegenV1] ✓ Phase 2: Intelligence Layer initialized");
  } catch (error) {
    console.error("[RegenV1] ✗ Phase 2 failed:", error);
  }

  // Phase 3: Full Integration (Keyboard Shortcuts, Detection Systems)
  try {
    // Keyboard Shortcuts
    const keyboardCleanup = initKeyboardShortcuts();
    cleanupFunctions.push(keyboardCleanup);
    
    // Voice Triggers
    const voiceCleanup = initVoiceTriggers();
    cleanupFunctions.push(voiceCleanup);
    
    // Idle Detection
    const idleCleanup = initIdleDetection();
    cleanupFunctions.push(idleCleanup);
    
    // Search Detection
    const searchCleanup = initSearchDetection();
    cleanupFunctions.push(searchCleanup);
    
    // Cross-Tab Event Bus Sync
    const crossTabCleanup = initCrossTabEventBus();
    cleanupFunctions.push(crossTabCleanup);
    
    // Shared Session Memory
    const sharedMemoryCleanup = initSharedSessionMemory();
    cleanupFunctions.push(sharedMemoryCleanup);
    
    console.log("[RegenV1] ✓ Phase 3: Full Integration initialized");
  } catch (error) {
    console.error("[RegenV1] ✗ Phase 3 failed:", error);
  }

  initialized = true;
  console.log("[RegenV1] ✅ All phases initialized");

  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup());
    cleanupFunctions.length = 0;
    initialized = false;
  };
}

// Export synchronous version for compatibility
export function initRegenV1Sync(): () => void {
  if (initialized) {
    console.warn("[RegenV1] Already initialized");
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;
      initialized = false;
    };
  }

  // Initialize all components synchronously
  const avatarCleanup = initAvatarController();
  cleanupFunctions.push(avatarCleanup);

  const observerCleanup = initIntentObserver();
  cleanupFunctions.push(observerCleanup);

  const automationCleanup = initAutomationEngine();
  cleanupFunctions.push(automationCleanup);
  
  // Initialize automation trigger system (listens to events and executes enabled rules)
  const triggerCleanup = initAutomationTriggers();
  cleanupFunctions.push(triggerCleanup);

  const keyboardCleanup = initKeyboardShortcuts();
  cleanupFunctions.push(keyboardCleanup);
  
  const voiceCleanup = initVoiceTriggers();
  cleanupFunctions.push(voiceCleanup);
  
  const crossTabCleanup = initCrossTabEventBus();
  cleanupFunctions.push(crossTabCleanup);
  
  const sharedMemoryCleanup = initSharedSessionMemory();
  cleanupFunctions.push(sharedMemoryCleanup);

  const idleCleanup = initIdleDetection();
  cleanupFunctions.push(idleCleanup);

  const searchCleanup = initSearchDetection();
  cleanupFunctions.push(searchCleanup);

  const commandHandlerCleanup = initCommandHandler();
  cleanupFunctions.push(commandHandlerCleanup);
  
  const unifiedSearchCleanup = initRealtimeUnifiedSearch();
  cleanupFunctions.push(unifiedSearchCleanup);

  initialized = true;
  console.log("[RegenV1] Initialized (sync)");

  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup());
    cleanupFunctions.length = 0;
    initialized = false;
  };
}