import { create } from 'zustand';
export const useCrossRealityStore = create((set) => ({
    handoffs: [],
    lastReceivedAt: null,
    registerHandoff(handoff) {
        set((state) => ({
            handoffs: [...state.handoffs.filter((entry) => entry.tabId !== handoff.tabId), handoff].slice(-10),
            lastReceivedAt: Date.now(),
        }));
    },
    clearHandoff(tabId) {
        set((state) => ({
            handoffs: state.handoffs.filter((entry) => entry.tabId !== tabId),
        }));
    },
}));
