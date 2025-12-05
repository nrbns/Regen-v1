export type PowerMode = 'Performance' | 'Balanced' | 'PowerSave' | 'Auto';
export type EffectivePowerMode = 'Performance' | 'Balanced' | 'PowerSave';
export interface BatteryStatus {
    supported: boolean;
    level: number | null;
    charging: boolean | null;
    chargingTime?: number | null;
    dischargingTime?: number | null;
    lastUpdated: number;
}
interface PowerState {
    battery: BatteryStatus;
    selectedMode: PowerMode;
    effectiveMode: EffectivePowerMode;
    setBattery: (status: Partial<BatteryStatus> | BatteryStatus) => void;
    setMode: (mode: PowerMode) => void;
}
export declare const usePowerStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<PowerState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<PowerState, {
            selectedMode: PowerMode;
        }>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: PowerState) => void) => () => void;
        onFinishHydration: (fn: (state: PowerState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<PowerState, {
            selectedMode: PowerMode;
        }>>;
    };
}>;
export {};
