import type { EcoImpactForecast } from '../types/ecoImpact';
interface EcoImpactState {
    loading: boolean;
    error: string | null;
    forecast: EcoImpactForecast | null;
    horizonMinutes: number;
    lastUpdated: number | null;
    setHorizon: (minutes: number) => void;
    fetch: (options?: {
        horizonMinutes?: number;
    }) => Promise<void>;
}
export declare const useEcoImpactStore: import("zustand").UseBoundStore<import("zustand").StoreApi<EcoImpactState>>;
export {};
