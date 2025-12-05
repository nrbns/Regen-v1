import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
export const useTabGraphStore = create((set, get) => ({
    visible: false,
    loading: false,
    error: null,
    data: null,
    focusedTabId: null,
    async open() {
        if (!get().visible) {
            set({ visible: true });
        }
        await get().refresh();
    },
    close() {
        set({ visible: false, focusedTabId: null });
    },
    async toggle() {
        if (get().visible) {
            set({ visible: false, focusedTabId: null });
        }
        else {
            set({ visible: true });
            await get().refresh();
        }
    },
    async refresh() {
        set({ loading: true, error: null });
        try {
            const payload = await ipc.graph.tabs();
            if (!payload || typeof payload !== 'object') {
                throw new Error('Graph data unavailable');
            }
            set({ data: payload, loading: false, error: null });
        }
        catch (error) {
            set({ loading: false, error: error instanceof Error ? error.message : String(error) });
        }
    },
    setFocusedTab(tabId) {
        set({ focusedTabId: tabId });
    },
    async focusTab(tabId) {
        set({ visible: true, focusedTabId: tabId });
        await get().refresh();
    },
}));
