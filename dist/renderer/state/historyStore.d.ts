export type HistoryEntry = {
    id: string;
    type: 'search' | 'url';
    value: string;
    url?: string;
    appMode?: string;
    timestamp: number;
};
type HistoryStore = {
    entries: HistoryEntry[];
    addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
    clear: () => void;
    getRecent: (limit?: number) => HistoryEntry[];
};
export declare const useHistoryStore: import("zustand").UseBoundStore<import("zustand").StoreApi<HistoryStore>>;
export {};
