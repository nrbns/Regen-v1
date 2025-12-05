import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
export const useObservabilityStore = create((set, get) => ({
    summary: null,
    loading: false,
    error: undefined,
    refresh: async () => {
        if (get().loading)
            return;
        set({ loading: true, error: undefined });
        try {
            const summary = await ipc.telemetry.getSummary();
            set({ summary, loading: false });
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : String(error),
                loading: false,
            });
        }
    },
}));
