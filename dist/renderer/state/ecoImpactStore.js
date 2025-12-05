import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
export const useEcoImpactStore = create((set, get) => ({
    loading: false,
    error: null,
    forecast: null,
    horizonMinutes: 120,
    lastUpdated: null,
    setHorizon: (minutes) => {
        set({ horizonMinutes: minutes });
        void get().fetch({ horizonMinutes: minutes });
    },
    fetch: async (options) => {
        const horizonMinutes = options?.horizonMinutes ?? get().horizonMinutes;
        try {
            set({ loading: true, error: null });
            const result = await ipc.efficiency.ecoImpact({ horizonMinutes });
            set({ forecast: result, loading: false, lastUpdated: Date.now(), horizonMinutes });
        }
        catch (error) {
            set({
                loading: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    },
}));
