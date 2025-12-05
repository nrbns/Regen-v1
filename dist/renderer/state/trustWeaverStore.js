import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
export const useTrustWeaverStore = create((set, get) => ({
    loading: false,
    submitting: false,
    error: null,
    records: [],
    activeDomain: null,
    activeSummary: null,
    lastUpdated: null,
    fetchAll: async () => {
        try {
            set({ loading: true, error: null });
            const { records } = await ipc.trust.list();
            set({ records, loading: false, lastUpdated: Date.now() });
        }
        catch (error) {
            set({
                loading: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    },
    inspect: async (domain) => {
        try {
            set({ loading: true, error: null, activeDomain: domain });
            const response = await ipc.trust.get(domain);
            if (response.found && response.summary) {
                set({ activeSummary: response.summary, loading: false, lastUpdated: Date.now() });
            }
            else {
                set({ activeSummary: null, loading: false });
            }
        }
        catch (error) {
            set({
                loading: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    },
    submit: async (signal) => {
        try {
            set({ submitting: true, error: null });
            const { summary } = await ipc.trust.submit(signal);
            if (summary) {
                const records = get().records.filter((record) => record.domain !== summary.domain);
                records.push(summary);
                records.sort((a, b) => b.signals - a.signals || b.score - a.score);
                set({
                    records,
                    activeSummary: summary,
                    activeDomain: summary.domain,
                    submitting: false,
                    lastUpdated: Date.now(),
                });
            }
            else {
                set({ submitting: false });
            }
        }
        catch (error) {
            set({
                submitting: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    },
}));
