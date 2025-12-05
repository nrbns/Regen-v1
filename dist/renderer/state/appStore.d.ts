export type AppState = {
    mode: 'Browse' | 'Research' | 'Trade' | 'Games' | 'Docs' | 'Images' | 'Threats' | 'GraphMind';
    setMode: (m: AppState['mode']) => void;
    graphDockOpen: boolean;
    toggleGraphDock: () => void;
    ledgerDockOpen: boolean;
    toggleLedgerDock: () => void;
    researchPaneOpen: boolean;
    toggleResearchPane: () => void;
    setResearchPaneOpen: (open: boolean) => void;
    memorySidebarOpen: boolean;
    setMemorySidebarOpen: (open: boolean) => void;
    regenSidebarOpen: boolean;
    setRegenSidebarOpen: (open: boolean) => void;
    toggleRegenSidebar: () => void;
};
export declare const useAppStore: import("zustand").UseBoundStore<import("zustand").StoreApi<AppState>>;
