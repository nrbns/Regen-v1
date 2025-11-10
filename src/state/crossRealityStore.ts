import { create } from 'zustand';

interface HandoffEvent {
  tabId: string;
  target: 'mobile' | 'xr';
  timestamp: number;
  url: string;
  title: string;
  preview?: string;
  sourceWindowId: number;
}

interface CrossRealityState {
  handoffs: HandoffEvent[];
  lastReceivedAt: number | null;
  registerHandoff: (handoff: HandoffEvent) => void;
  clearHandoff: (tabId: string) => void;
}

export const useCrossRealityStore = create<CrossRealityState>((set) => ({
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
