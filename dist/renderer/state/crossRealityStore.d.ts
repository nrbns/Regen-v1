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
export declare const useCrossRealityStore: import("zustand").UseBoundStore<import("zustand").StoreApi<CrossRealityState>>;
export {};
