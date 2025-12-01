import { create } from 'zustand';
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
  error: string | null;
  lastGoal: string | null;
  // PR: Fix tab switch - track active tab for agent operations
  activeTabId: string | null;
  setRun: (runId: string, goal: string | null, tabId?: string | null) => void;
  setStatus: (status: StreamStatus) => void;
  setError: (error: string | null) => void;
  appendEvent: (event: AgentStreamEvent) => void;
  appendTranscript: (delta: string) => void;
  setActiveTabId: (tabId: string | null) => void;
  reset: () => void;
}

export const useAgentStreamStore = create<AgentStreamState>()(
  persist(
    set => ({
      runId: null,
      status: 'idle',
      transcript: '',
      events: [],
      error: null,
      lastGoal: null,
      activeTabId: null,
      setRun: (runId, goal, tabId = null) => {
        console.log('[AGENT_STREAM] setRun', { runId, goal, tabId });
        set({
          runId,
          status: 'live',
          error: null,
          transcript: '',
          events: [],
          lastGoal: goal,
          activeTabId: tabId,
        });
      },
      setStatus: status => set({ status }),
      setError: error => set({ error, status: error ? 'error' : 'idle' }),
      appendEvent: event => {
        // PR: Fix tab switch - only append events for current active tab
        const state = useAgentStreamStore.getState();
        if (event.tabId && state.activeTabId && event.tabId !== state.activeTabId) {
          console.log('[AGENT_STREAM] Ignoring event for inactive tab', {
            eventTabId: event.tabId,
            activeTabId: state.activeTabId,
            eventType: event.type,
          });
          return;
        }
        console.log('[AGENT_STREAM] appendEvent', {
          eventId: event.id,
          type: event.type,
          tabId: event.tabId,
          activeTabId: state.activeTabId,
        });
        set(state => ({
          events: [...state.events, event],
        }));
      },
      appendTranscript: delta => {
        const state = useAgentStreamStore.getState();
        console.log('[AGENT_STREAM] appendTranscript', {
          deltaLength: delta.length,
          activeTabId: state.activeTabId,
        });
        set(state => ({
          transcript: state.transcript ? `${state.transcript}${delta}` : delta,
        }));
      },
      setActiveTabId: tabId => {
        console.log('[AGENT_STREAM] setActiveTabId', { tabId });
        set({ activeTabId: tabId });
      },
      reset: () => {
        console.log('[AGENT_STREAM] reset');
        set({
          runId: null,
          status: 'idle',
          transcript: '',
          events: [],
          error: null,
          lastGoal: null,
          activeTabId: null,
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
