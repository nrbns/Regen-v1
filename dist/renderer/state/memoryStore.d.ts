export interface TabMemorySample {
    tabId: string;
    title?: string;
    url?: string;
    memoryMB: number;
    timestamp: number;
    pinned?: boolean;
    appMode?: string;
    sleeping?: boolean;
}
export interface MemorySnapshot {
    totalMB: number;
    freeMB?: number;
    timestamp: number;
    tabs: TabMemorySample[];
    savingsMB?: number;
}
interface MemoryState {
    history: MemorySnapshot[];
    latest?: MemorySnapshot;
    capacityMB?: number;
    pushSnapshot: (snapshot: MemorySnapshot) => void;
    setCapacity: (capacity: number) => void;
}
export declare const useMemoryStore: import("zustand").UseBoundStore<import("zustand").StoreApi<MemoryState>>;
export {};
