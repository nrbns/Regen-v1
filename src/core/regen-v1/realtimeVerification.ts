/**
 * Real-Time Verification - Regen-v1
 * 
 * Verifies that all real-time systems are working correctly
 */

import { regenEventBus } from "../events/eventBus";
import { useAvatar } from "../avatar/avatarStore";
import { isAIRunning } from "../ai/aiScheduler";

/**
 * Verify real-time system is working
 */
export function verifyRealtime(): {
  eventBusWorking: boolean;
  avatarStoreWorking: boolean;
  aiSchedulerWorking: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Test 1: Event Bus
  let eventBusWorking = false;
  try {
    let received = false;
    const unsubscribe = regenEventBus.subscribe((e) => {
      if (e.type === "AVATAR_INVOKE") {
        received = true;
      }
    });
    
    regenEventBus.emit({ type: "AVATAR_INVOKE" });
    
    // Check synchronously (event bus should be immediate)
    eventBusWorking = received;
    
    unsubscribe();
    
    if (!eventBusWorking) {
      issues.push("Event bus not processing events synchronously");
    }
  } catch (error) {
    issues.push(`Event bus error: ${error}`);
  }

  // Test 2: Avatar Store
  let avatarStoreWorking = false;
  try {
    const initialState = useAvatar.getState().state;
    useAvatar.getState().set("aware");
    const newState = useAvatar.getState().state;
    useAvatar.getState().set(initialState); // Restore
    
    avatarStoreWorking = newState === "aware";
    
    if (!avatarStoreWorking) {
      issues.push("Avatar store not updating state");
    }
  } catch (error) {
    issues.push(`Avatar store error: ${error}`);
  }

  // Test 3: AI Scheduler
  let aiSchedulerWorking = false;
  try {
    const wasRunning = isAIRunning();
    aiSchedulerWorking = typeof wasRunning === "boolean";
    
    if (!aiSchedulerWorking) {
      issues.push("AI scheduler status check not working");
    }
  } catch (error) {
    issues.push(`AI scheduler error: ${error}`);
  }

  return {
    eventBusWorking,
    avatarStoreWorking,
    aiSchedulerWorking,
    issues,
  };
}

/**
 * Run real-time performance test
 */
export function testRealtimePerformance(): {
  eventEmitLatency: number;
  stateUpdateLatency: number;
  acceptable: boolean;
} {
  // Test 1: Event emit latency
  const eventStart = performance.now();
  regenEventBus.emit({ type: "AVATAR_INVOKE" });
  const eventEnd = performance.now();
  const eventEmitLatency = eventEnd - eventStart;

  // Test 2: State update latency
  const stateStart = performance.now();
  const currentState = useAvatar.getState().state;
  useAvatar.getState().set("aware");
  const stateEnd = performance.now();
  useAvatar.getState().set(currentState); // Restore
  const stateUpdateLatency = stateEnd - stateStart;

  // Acceptable thresholds (real-time should be <10ms)
  const acceptable = eventEmitLatency < 10 && stateUpdateLatency < 10;

  return {
    eventEmitLatency,
    stateUpdateLatency,
    acceptable,
  };
}
