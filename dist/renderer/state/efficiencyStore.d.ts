export type EfficiencyMode = 'normal' | 'battery-saver' | 'extreme';
type Snapshot = {
    batteryPct: number | null;
    charging: boolean | null;
    ramMb: number;
    cpuLoad1: number;
    activeTabs: number;
    carbonIntensity?: number | null;
    carbonRegion?: string | null;
};
export type EfficiencySample = {
    timestamp: number;
    mode: EfficiencyMode;
    batteryPct: number | null;
    carbonIntensity: number | null | undefined;
    cpuLoad: number;
    activeTabs: number;
};
type EfficiencyState = {
    mode: EfficiencyMode;
    label: string;
    badge: string | null;
    colorClass: string;
    lastUpdated: number | null;
    snapshot: Snapshot;
    history: EfficiencySample[];
    setEvent: (event: {
        mode: EfficiencyMode;
        label?: string | null;
        badge?: string | null;
        timestamp: number;
        snapshot: Snapshot;
    }) => void;
};
export declare const useEfficiencyStore: import("zustand").UseBoundStore<import("zustand").StoreApi<EfficiencyState>>;
export {};
