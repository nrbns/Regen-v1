import { create } from 'zustand';

type AppState = {
  mode: 'Browse' | 'Research' | 'Trade' | 'Games' | 'Docs' | 'Images' | 'Threats' | 'GraphMind';
  setMode: (m: AppState['mode']) => void;
  graphDockOpen: boolean;
  toggleGraphDock: () => void;
  ledgerDockOpen: boolean;
  toggleLedgerDock: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: 'Browse',
  setMode: (mode) => set({ mode }),
  graphDockOpen: false,
  toggleGraphDock: () => {
    const next = !get().graphDockOpen;
    set({ graphDockOpen: next });
    (window as any).ui?.setRightDock?.(next ? 360 : 0);
  },
  ledgerDockOpen: false,
  toggleLedgerDock: () => {
    const next = !get().ledgerDockOpen;
    set({ ledgerDockOpen: next });
    (window as any).ui?.setRightDock?.(next ? 360 : 0);
  }
}));


