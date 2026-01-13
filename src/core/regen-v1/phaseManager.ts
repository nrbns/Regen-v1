/**
 * Phase Manager - Regen-v1
 * 
 * Manages initialization phases for Regen-v1 system
 */

export type RegenPhase = 
  | "phase-0" // Event Bus (nervous system)
  | "phase-1" // Avatar System (instant reactions)
  | "phase-2" // Intelligence Layer (pattern detection, commands, automation)
  | "phase-3"; // Full Integration (all layers working together)

export interface PhaseStatus {
  phase: RegenPhase;
  initialized: boolean;
  components: string[];
  errors: string[];
}

const phaseStatus: Record<RegenPhase, PhaseStatus> = {
  "phase-0": {
    phase: "phase-0",
    initialized: false,
    components: [],
    errors: [],
  },
  "phase-1": {
    phase: "phase-1",
    initialized: false,
    components: [],
    errors: [],
  },
  "phase-2": {
    phase: "phase-2",
    initialized: false,
    components: [],
    errors: [],
  },
  "phase-3": {
    phase: "phase-3",
    initialized: false,
    components: [],
    errors: [],
  },
};

/**
 * Initialize Phase 0: Event Bus (Nervous System)
 */
export async function initPhase0(): Promise<PhaseStatus> {
  try {
    // Event bus is created automatically on import
    const { regenEventBus } = await import("../events/eventBus");
    
    // Test event bus
    let testReceived = false;
    const unsubscribe = regenEventBus.subscribe((e) => {
      if (e.type === "AVATAR_INVOKE") {
        testReceived = true;
      }
    });
    
    regenEventBus.emit({ type: "AVATAR_INVOKE" });
    unsubscribe();

    phaseStatus["phase-0"] = {
      phase: "phase-0",
      initialized: testReceived,
      components: [
        "eventBus.ts",
        "integrationHelpers.ts",
      ],
      errors: testReceived ? [] : ["Event bus not processing events"],
    };

    return phaseStatus["phase-0"];
  } catch (error) {
    phaseStatus["phase-0"] = {
      phase: "phase-0",
      initialized: false,
      components: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
    return phaseStatus["phase-0"];
  }
}

/**
 * Initialize Phase 1: Avatar System (Instant Reactions)
 */
export async function initPhase1(): Promise<PhaseStatus> {
  try {
    const components: string[] = [];
    const errors: string[] = [];

    // Test avatar store
    const { useAvatar } = await import("../avatar/avatarStore");
    const initialState = useAvatar.getState().state;
    useAvatar.getState().set("aware");
    const newState = useAvatar.getState().state;
    useAvatar.getState().set(initialState);
    
    if (newState === "aware") {
      components.push("avatarStore.ts");
    } else {
      errors.push("Avatar store not updating state");
    }

    // Initialize avatar controller
    const { initAvatarController } = await import("../avatar/avatarController");
    const cleanup = initAvatarController();
    components.push("avatarController.ts");
    // Don't cleanup immediately - keep it running

    phaseStatus["phase-1"] = {
      phase: "phase-1",
      initialized: components.length > 0 && errors.length === 0,
      components,
      errors,
    };

    return phaseStatus["phase-1"];
  } catch (error) {
    phaseStatus["phase-1"] = {
      phase: "phase-1",
      initialized: false,
      components: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
    return phaseStatus["phase-1"];
  }
}

/**
 * Initialize Phase 2: Intelligence Layer
 */
export async function initPhase2(): Promise<PhaseStatus> {
  try {
    const components: string[] = [];
    const errors: string[] = [];

    // Initialize intent observer
    const { initIntentObserver } = await import("../intelligence/observer");
    const observerCleanup = initIntentObserver();
    components.push("intelligence/observer.ts");

    // Initialize command handler
    const { initCommandHandler } = await import("./commandHandler");
    const commandCleanup = initCommandHandler();
    components.push("regen-v1/commandHandler.ts");

    // Initialize automation engine
    const { initAutomationEngine } = await import("../automation/engine");
    const automationCleanup = initAutomationEngine();
    components.push("automation/engine.ts");

    // Test AI scheduler
    const { isAIRunning } = await import("../ai/aiScheduler");
    const schedulerStatus = typeof isAIRunning() === "boolean";
    if (schedulerStatus) {
      components.push("ai/aiScheduler.ts");
    } else {
      errors.push("AI scheduler not working");
    }

    phaseStatus["phase-2"] = {
      phase: "phase-2",
      initialized: components.length >= 3 && errors.length === 0,
      components,
      errors,
    };

    return phaseStatus["phase-2"];
  } catch (error) {
    phaseStatus["phase-2"] = {
      phase: "phase-2",
      initialized: false,
      components: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
    return phaseStatus["phase-2"];
  }
}

/**
 * Initialize Phase 3: Full Integration
 */
export async function initPhase3(): Promise<PhaseStatus> {
  try {
    const components: string[] = [];
    const errors: string[] = [];

    // Initialize keyboard shortcuts
    const { initKeyboardShortcuts } = await import("./keyboardShortcuts");
    const keyboardCleanup = initKeyboardShortcuts();
    components.push("regen-v1/keyboardShortcuts.ts");

    // Initialize idle detection
    const { initIdleDetection } = await import("./idleDetection");
    const idleCleanup = initIdleDetection();
    components.push("regen-v1/idleDetection.ts");

    // Initialize search detection
    const { initSearchDetection } = await import("./searchDetection");
    const searchCleanup = initSearchDetection();
    components.push("regen-v1/searchDetection.ts");

    phaseStatus["phase-3"] = {
      phase: "phase-3",
      initialized: components.length >= 3 && errors.length === 0,
      components,
      errors,
    };

    return phaseStatus["phase-3"];
  } catch (error) {
    phaseStatus["phase-3"] = {
      phase: "phase-3",
      initialized: false,
      components: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
    return phaseStatus["phase-3"];
  }
}

/**
 * Initialize all phases sequentially
 */
export async function initAllPhases(): Promise<{
  phase0: PhaseStatus;
  phase1: PhaseStatus;
  phase2: PhaseStatus;
  phase3: PhaseStatus;
  allComplete: boolean;
}> {
  const phase0 = await initPhase0();
  const phase1 = await initPhase1();
  const phase2 = await initPhase2();
  const phase3 = await initPhase3();

  const allComplete = 
    phase0.initialized &&
    phase1.initialized &&
    phase2.initialized &&
    phase3.initialized;

  return {
    phase0,
    phase1,
    phase2,
    phase3,
    allComplete,
  };
}

/**
 * Get status of all phases
 */
export function getAllPhaseStatus(): Record<RegenPhase, PhaseStatus> {
  return { ...phaseStatus };
}
