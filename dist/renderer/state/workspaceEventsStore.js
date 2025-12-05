import { create } from 'zustand';
export const useWorkspaceEventsStore = create((set) => ({
    events: [],
    pushEvent: (event) => set((state) => {
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
    clear: (workspaceId) => set((state) => {
        if (!workspaceId) {
            return { events: [] };
        }
        return { events: state.events.filter((event) => event.workspaceId !== workspaceId) };
    }),
}));
