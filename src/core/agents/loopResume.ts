/**
 * Agent Loop Resume System
 * Saves agent execution state to localStorage and restores on crash/reload
 */

import { useAgentStreamStore, type AgentStreamEvent } from '../../state/agentStreamStore';

export interface LoopState {
  runId: string;
  goal: string;
  status: 'idle' | 'connecting' | 'live' | 'complete' | 'error';
  transcript: string;
  events: AgentStreamEvent[];
  error: string | null;
  lastSaved: number;
  mode?: 'research' | 'trade' | 'browse' | 'agent';
  metadata?: {
    language?: string;
    [key: string]: unknown;
  };
}

const LOOP_STATE_KEY = 'regen:agent-loops';
const MAX_SAVED_LOOPS = 10;
const SAVE_INTERVAL_MS = 5000; // Save every 5 seconds

/**
 * Save current agent loop state
 */
export function saveLoopState(state: Partial<LoopState>): void {
  try {
    const existing = loadAllLoopStates();
    const currentRunId = useAgentStreamStore.getState().runId;

    if (!currentRunId) return;

    const fullState: LoopState = {
      runId: currentRunId,
      goal: useAgentStreamStore.getState().lastGoal || state.goal || '',
      status: useAgentStreamStore.getState().status as LoopState['status'],
      transcript: useAgentStreamStore.getState().transcript,
      events: useAgentStreamStore.getState().events,
      error: useAgentStreamStore.getState().error || null,
      lastSaved: Date.now(),
      ...state,
    };

    // Update or add this loop state
    const updated = existing.filter(s => s.runId !== currentRunId);
    updated.unshift(fullState);

    // Keep only recent loops
    const trimmed = updated.slice(0, MAX_SAVED_LOOPS);

    localStorage.setItem(LOOP_STATE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('[LoopResume] Failed to save loop state:', error);
  }
}

/**
 * Load all saved loop states
 */
export function loadAllLoopStates(): LoopState[] {
  try {
    const raw = localStorage.getItem(LOOP_STATE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[LoopResume] Failed to load loop states:', error);
    return [];
  }
}

/**
 * Load a specific loop state by runId
 */
export function loadLoopState(runId: string): LoopState | null {
  const all = loadAllLoopStates();
  return all.find(s => s.runId === runId) || null;
}

/**
 * Resume a loop from saved state
 */
export function resumeLoop(runId: string): boolean {
  try {
    const state = loadLoopState(runId);
    if (!state) {
      console.warn('[LoopResume] No saved state found for runId:', runId);
      return false;
    }

    // Restore to agent stream store
    const store = useAgentStreamStore.getState();
    store.setRun(state.runId, state.goal);
    store.setStatus(state.status);
    store.setError(state.error || undefined);

    // Restore transcript
    if (state.transcript) {
      // Clear and restore transcript
      store.reset();
      store.setRun(state.runId, state.goal);
      state.transcript.split('\n').forEach(line => {
        if (line.trim()) {
          store.appendTranscript(line + '\n');
        }
      });
    }

    // Restore events
    state.events.forEach(event => {
      store.appendEvent(event);
    });

    console.log('[LoopResume] Resumed loop:', runId, 'with', state.events.length, 'events');
    return true;
  } catch (error) {
    console.error('[LoopResume] Failed to resume loop:', error);
    return false;
  }
}

/**
 * Delete a saved loop state
 */
export function deleteLoopState(runId: string): void {
  try {
    const all = loadAllLoopStates();
    const filtered = all.filter(s => s.runId !== runId);
    localStorage.setItem(LOOP_STATE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.warn('[LoopResume] Failed to delete loop state:', error);
  }
}

/**
 * Auto-save loop state on interval
 */
let saveInterval: NodeJS.Timeout | null = null;

export function startAutoSave(metadata?: LoopState['metadata']): void {
  if (saveInterval) {
    clearInterval(saveInterval);
  }

  saveInterval = setInterval(() => {
    const store = useAgentStreamStore.getState();
    if (store.runId && (store.status === 'live' || store.status === 'connecting')) {
      saveLoopState({ metadata });
    }
  }, SAVE_INTERVAL_MS);
}

export function stopAutoSave(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
}

/**
 * Check for crashed loops on app start and offer to resume
 */
export function checkForCrashedLoops(): LoopState[] {
  const all = loadAllLoopStates();
  const now = Date.now();
  const CRASH_THRESHOLD_MS = 30000; // 30 seconds without update = likely crashed

  return all.filter(loop => {
    const timeSinceLastSave = now - loop.lastSaved;
    return (
      loop.status === 'live' ||
      loop.status === 'connecting' ||
      (timeSinceLastSave < CRASH_THRESHOLD_MS && loop.status !== 'complete')
    );
  });
}
