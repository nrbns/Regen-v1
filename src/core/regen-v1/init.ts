/**
 * Regen-v1 Initialization
 * 
 * Initialize all core systems:
 * - Event bus
 * - Avatar controller
 * - Intent observer
 * - Automation engine
 * - Keyboard shortcuts
 */

import { initAvatarController } from "../avatar/avatarController";
import { initIntentObserver } from "../intelligence/observer";
import { initAutomationEngine } from "../automation/engine";
import { initKeyboardShortcuts } from "./keyboardShortcuts";
import { initIdleDetection } from "./idleDetection";
import { initSearchDetection } from "./searchDetection";
import { initCommandHandler } from "./commandHandler";

let initialized = false;
const cleanupFunctions: (() => void)[] = [];

/**
 * Initialize Regen-v1 core systems
 */
export function initRegenV1(): () => void {
  if (initialized) {
    console.warn("[RegenV1] Already initialized");
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;
      initialized = false;
    };
  }

  // Initialize avatar controller
  const avatarCleanup = initAvatarController();
  cleanupFunctions.push(avatarCleanup);

  // Initialize intent observer
  const observerCleanup = initIntentObserver();
  cleanupFunctions.push(observerCleanup);

  // Initialize automation engine
  const automationCleanup = initAutomationEngine();
  cleanupFunctions.push(automationCleanup);

  // Initialize keyboard shortcuts
  const keyboardCleanup = initKeyboardShortcuts();
  cleanupFunctions.push(keyboardCleanup);

  // Initialize idle detection
  const idleCleanup = initIdleDetection();
  cleanupFunctions.push(idleCleanup);

  // Initialize search detection
  const searchCleanup = initSearchDetection();
  cleanupFunctions.push(searchCleanup);

  // Initialize command handler (routes COMMAND events to CommandController)
  const commandHandlerCleanup = initCommandHandler();
  cleanupFunctions.push(commandHandlerCleanup);

  initialized = true;
  console.log("[RegenV1] Initialized");

  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup());
    cleanupFunctions.length = 0;
    initialized = false;
  };
}