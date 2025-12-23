import { create } from 'zustand';
import type { ActionExecutionResult } from '../services/agenticActions';

type ActionProgress = {
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number; // 0-100
  message?: string;
  cancellable?: boolean;
};

type VoiceControlState = {
  status: 'idle' | 'listening' | 'running' | 'error';
  transcript: string;
  stream: string;
  actions: string[];
  actionResults: ActionExecutionResult[];
  actionProgress: Record<string, ActionProgress>;
  error?: string;
  setStatus: (status: VoiceControlState['status']) => void;
  setTranscript: (text: string) => void;
  appendStream: (chunk: string) => void;
  setActions: (actions: string[]) => void;
  setActionResults: (results: ActionExecutionResult[]) => void;
  setActionProgress: (action: string, progress: ActionProgress) => void;
  clearActionProgress: (action: string) => void;
  cancelledActions: Set<string>;
  cancelAction: (action: string) => void;
  isActionCancelled: (action: string) => boolean;
  setError: (message: string | undefined) => void;
  reset: () => void;
};

// Simple store for voice control (used by VoiceControl component)
export const useVoiceControlStore = create<VoiceControlState>(set => ({
  status: 'idle',
  transcript: '',
  stream: '',
  actions: [],
  actionResults: [],
  actionProgress: {},
  error: undefined,
  setStatus: status => set({ status }),
  setTranscript: text => set({ transcript: text }),
  appendStream: chunk => set(state => ({ stream: state.stream + chunk })),
  setActions: actions => set({ actions }),
  setActionResults: results => set({ actionResults: results }),
  setActionProgress: (action, progress) =>
    set(state => ({
      actionProgress: {
        ...state.actionProgress,
        [action]: progress,
      },
    })),
  clearActionProgress: action =>
    set(state => {
      const { [action]: _, ...rest } = state.actionProgress;
      return { actionProgress: rest };
    }),
  cancelledActions: new Set<string>(),
  cancelAction: action =>
    set(state => {
      const newCancelled = new Set(state.cancelledActions);
      newCancelled.add(action);
      return { cancelledActions: newCancelled };
    }),
  isActionCancelled: (action: string): boolean => {
    return useVoiceControlStore.getState().cancelledActions.has(action);
  },
  setError: message => set({ error: message }),
  reset: () =>
    set({
      status: 'idle',
      transcript: '',
      stream: '',
      actions: [],
      actionResults: [],
      actionProgress: {},
      cancelledActions: new Set<string>(),
      error: undefined,
    }),
}));

import { persist } from 'zustand/middleware';

export type StreamStatus = 'idle' | 'connecting' | 'live' | 'complete' | 'error';

export interface AgentStreamEvent {
  id: string;
  type: 'start' | 'step' | 'log' | 'done' | 'consent' | 'error';
  step?: number;
  status?: string;
  content?: string;
  timestamp: number;
  risk?: 'low' | 'medium' | 'high';
  approved?: boolean;
  // PR: Fix tab switch - track which tab this event belongs to
  tabId?: string | null;
  sessionId?: string | null;
}

interface AgentStreamState {
  runId: string | null;
  status: StreamStatus;
  transcript: string;
  events: AgentStreamEvent[];
  error: string | undefined;
  lastGoal: string | null;
  // PR: Fix tab switch - track active tab for agent operations
  activeTabId: string | null;
  stateVersion: number;
  lastConfirmedActionId: string | null;
  setRun: (runId: string, goal: string | null, tabId?: string | null) => void;
  setStatus: (status: StreamStatus) => void;
  setError: (error: string | undefined) => void;
  appendEvent: (event: AgentStreamEvent) => void;
  appendTranscript: (delta: string) => void;
  setActiveTabId: (tabId: string | null) => void;
  setStateVersion: (version: number) => void;
  setLastConfirmedActionId: (actionId: string | null) => void;
  replayOrReset: (incomingVersion: number, incomingActionId: string | null) => void;
  reset: () => void;
}

export const useAgentStreamStore = create<AgentStreamState>()(
  persist(
    set => ({
      runId: null,
      status: 'idle',
      transcript: '',
      events: [],
      error: undefined,
      lastGoal: null,
      activeTabId: null,
      stateVersion: 0,
      lastConfirmedActionId: null,
      setRun: (runId: string, goal: string | null, tabId: string | null = null) => {
        console.log('[AGENT_STREAM] setRun', { runId, goal, tabId });
        set({
          runId,
          status: 'live',
          error: undefined,
          transcript: '',
          events: [],
          lastGoal: goal,
          activeTabId: tabId,
          stateVersion: 1,
          lastConfirmedActionId: null,
        });
      },
      setStatus: (status: StreamStatus) => set({ status }),
      setError: (error: string | undefined) => set({ error, status: error ? 'error' : 'idle' }),
      appendEvent: (event: AgentStreamEvent) => {
        const _state = useAgentStreamStore.getState();
        if (event.tabId && state.activeTabId && event.tabId !== state.activeTabId) {
          console.log('[AGENT_STREAM] Ignoring event for inactive tab', {
            eventTabId: event.tabId,
            activeTabId: state.activeTabId,
            eventType: event.type,
          });
          return;
        }
        set(s => ({
          events: [...s.events, event],
          stateVersion: s.stateVersion + 1,
          lastConfirmedActionId: event.id || s.lastConfirmedActionId,
        }));
      },
      appendTranscript: (delta: string) => {
        const _state = useAgentStreamStore.getState();
        set(s => ({
          transcript: s.transcript ? `${s.transcript}${delta}` : delta,
          stateVersion: s.stateVersion + 1,
        }));
      },
      setActiveTabId: (tabId: string | null) => {
        set({ activeTabId: tabId });
      },
      setStateVersion: (version: number) => set({ stateVersion: version }),
      setLastConfirmedActionId: (actionId: string | null) =>
        set({ lastConfirmedActionId: actionId }),
      replayOrReset: (incomingVersion: number, incomingActionId: string | null) => {
        const state = useAgentStreamStore.getState();
        if (incomingVersion > state.stateVersion) {
          // Replay logic: Accept incoming state
          set({ stateVersion: incomingVersion, lastConfirmedActionId: incomingActionId });
        } else if (incomingVersion < state.stateVersion) {
          // Hard reset: Local state is ahead, reset to incoming
          set({
            runId: null,
            status: 'idle',
            transcript: '',
            events: [],
            error: undefined,
            lastGoal: null,
            activeTabId: null,
            stateVersion: incomingVersion,
            lastConfirmedActionId: incomingActionId,
          });
        }
      },
      reset: () => {
        set({
          runId: null,
          status: 'idle',
          transcript: '',
          events: [],
          error: undefined,
          lastGoal: null,
          activeTabId: null,
          stateVersion: 0,
          lastConfirmedActionId: null,
        });
      },
    }),
    {
      name: 'regen-agent-stream-storage',
      // Only persist critical state, not transient streaming data
      partialize: state => ({
        runId: state.runId,
        status: state.status,
        transcript: state.transcript,
        events: state.events.slice(-50), // Keep last 50 events
        lastGoal: state.lastGoal,
        activeTabId: state.activeTabId, // PR: Fix tab switch - persist active tab
        // Don't persist error state (should be cleared on restart)
      }),
    }
  )
);
