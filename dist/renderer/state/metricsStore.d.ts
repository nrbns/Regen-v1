export type MetricSample = {
    timestamp: number;
    cpu: number;
    memory: number;
    carbonIntensity?: number;
};
export type MetricsState = {
    latest: MetricSample | null;
    history: MetricSample[];
    dailyTotalCarbon: number;
    pushSample: (sample: MetricSample) => void;
    clear: () => void;
};
export declare const useMetricsStore: import("zustand").UseBoundStore<import("zustand").StoreApi<MetricsState>>;
