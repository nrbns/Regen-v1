import type { ResearchResult, ResearchSource } from '../types/research';
export type ComparedAnswer = {
    id: string;
    query: string;
    summary: string;
    createdAt: number;
    provider?: string;
    model?: string;
    confidence?: number;
    sources: ResearchSource[];
    citations: ResearchResult['citations'];
    settings: {
        includeCounterpoints: boolean;
        authorityBias: number;
        region: string;
    };
};
type ResearchCompareState = {
    entries: ComparedAnswer[];
    addEntry(entry: Omit<ComparedAnswer, 'id' | 'createdAt'>): ComparedAnswer;
    removeEntry(id: string): void;
    clear(): void;
};
export declare const useResearchCompareStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<ResearchCompareState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<ResearchCompareState, ResearchCompareState>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: ResearchCompareState) => void) => () => void;
        onFinishHydration: (fn: (state: ResearchCompareState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<ResearchCompareState, ResearchCompareState>>;
    };
}>;
export {};
