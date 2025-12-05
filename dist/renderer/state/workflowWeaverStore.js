import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
export const useWorkflowWeaverStore = create((set, get) => ({
    plan: null,
    loading: false,
    error: null,
    lastFetchedAt: null,
    async fetch(options) {
        const { loading, lastFetchedAt } = get();
        if (loading)
            return;
        if (!options?.force && lastFetchedAt && Date.now() - lastFetchedAt < 10_000) {
            return;
        }
        set({ loading: true, error: null });
        try {
            const response = await ipc.graph.workflow({ maxSteps: options?.maxSteps ?? 5 });
            if (!response || typeof response !== 'object') {
                throw new Error('Workflow weaver unavailable.');
            }
            set({
                plan: response,
                loading: false,
                lastFetchedAt: Date.now(),
            });
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : String(error),
                loading: false,
            });
        }
    },
    setPlan(plan) {
        set({ plan });
    },
}));
