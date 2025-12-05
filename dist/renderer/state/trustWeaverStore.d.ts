import type { TrustSummary } from '../types/trustWeaver';
interface TrustWeaverState {
    loading: boolean;
    submitting: boolean;
    error: string | null;
    records: TrustSummary[];
    activeDomain: string | null;
    activeSummary: TrustSummary | null;
    lastUpdated: number | null;
    fetchAll: () => Promise<void>;
    inspect: (domain: string) => Promise<void>;
    submit: (signal: {
        domain: string;
        url?: string;
        title?: string;
        score: number;
        confidence?: number;
        tags?: string[];
        comment?: string;
        sourcePeer?: string;
    }) => Promise<void>;
}
export declare const useTrustWeaverStore: import("zustand").UseBoundStore<import("zustand").StoreApi<TrustWeaverState>>;
export {};
