export interface PerfMetricSummary {
    metric: string;
    samples: number;
    avg: number;
    p95: number;
    last: number;
    unit: string;
}
export interface TelemetrySummary {
    optIn: boolean;
    enabled: boolean;
    crashCount: number;
    lastCrashAt: number | null;
    uptimeSeconds: number;
    perfMetrics: PerfMetricSummary[];
}
interface ObservabilityState {
    summary: TelemetrySummary | null;
    loading: boolean;
    error?: string;
    refresh: () => Promise<void>;
}
export declare const useObservabilityStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ObservabilityState>>;
export {};
