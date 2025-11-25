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
}

interface AgentStreamState {
  runId: string | null;
  status: StreamStatus;
  transcript: string;
  events: AgentStreamEvent[];
  error: string | null;
  lastGoal: string | null;
  setRun: (runId: string, goal: string | null) => void;
  setStatus: (status: StreamStatus) => void;
  setError: (error: string | null) => void;
  appendEvent: (event: AgentStreamEvent) => void;
  appendTranscript: (delta: string) => void;
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
      setRun: (runId, goal) =>
        set({ runId, status: 'live', error: null, transcript: '', events: [], lastGoal: goal }),
      setStatus: status => set({ status }),
      setError: error => set({ error, status: error ? 'error' : 'idle' }),
      appendEvent: event =>
        set(state => ({
          events: [...state.events, event],
        })),
      appendTranscript: delta =>
        set(state => ({
          transcript: state.transcript ? `${state.transcript}${delta}` : delta,
        })),
      reset: () =>
        set({
          runId: null,
          status: 'idle',
          transcript: '',
          events: [],
          error: null,
          lastGoal: null,
        }),
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
        // Don't persist error state (should be cleared on restart)
      }),
    }
  )
);
