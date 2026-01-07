import { create } from 'zustand';

export interface WorkspaceEvent {
  id: string;
  workspaceId?: string | null;
  type: string;
  message?: string;
  payload?: unknown;
  timestamp: number;
}

interface WorkspaceEventsState {
  events: WorkspaceEvent[];
  pushEvent: (event: Omit<WorkspaceEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: number }) => void;
  clear: (workspaceId?: string | null) => void;
}

export const useWorkspaceEventsStore = create<WorkspaceEventsState>((set) => ({
  events: [],
  pushEvent: (event) =>
    set((state) => {
      const timestamp = event.timestamp ?? Date.now();
      const id = event.id ?? `ws-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
      return {
        events: [
          ...state.events,
          {
            id,
            timestamp,
            workspaceId: event.workspaceId ?? null,
            type: event.type,
            message: event.message,
            payload: event.payload,
          },
        ].slice(-100),
      };
    }),
  clear: (workspaceId) =>
    set((state) => {
      if (!workspaceId) {
        return { events: [] };
      }
      return { events: state.events.filter((event) => event.workspaceId !== workspaceId) };
    }),
}));
