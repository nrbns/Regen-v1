import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

const defaultBattery: BatteryStatus = {
  supported: typeof navigator !== 'undefined' && 'getBattery' in navigator,
  level: null,
  charging: null,
  chargingTime: null,
  dischargingTime: null,
  lastUpdated: Date.now(),
};

function deriveEffectiveMode(mode: PowerMode, battery: BatteryStatus): EffectivePowerMode {
  if (mode !== 'Auto') {
    return mode;
  }
  const level = typeof battery.level === 'number' ? battery.level : null;
  if (level !== null && !battery.charging && level <= 0.25) {
    return 'PowerSave';
  }
  if (level !== null && battery.charging && level >= 0.95) {
    return 'Performance';
  }
  return 'Balanced';
}

export const usePowerStore = create<PowerState>()(
  persist(
    set => ({
      battery: defaultBattery,
      selectedMode: 'Balanced',
      effectiveMode: 'Balanced',
      setBattery: status =>
        set(state => {
          const nextBattery = {
            ...state.battery,
            ...status,
            supported:
              typeof status.supported === 'boolean' ? status.supported : state.battery.supported,
            lastUpdated: status && 'lastUpdated' in status ? status.lastUpdated! : Date.now(),
          };
          const effectiveMode = deriveEffectiveMode(state.selectedMode, nextBattery);
          return {
            battery: nextBattery,
            effectiveMode,
          };
        }),
      setMode: mode =>
        set(state => {
          const effectiveMode = deriveEffectiveMode(mode, state.battery);
          return {
            selectedMode: mode,
            effectiveMode,
          };
        }),
    }),
    {
      name: 'redix:power-store',
      partialize: state => ({
        selectedMode: state.selectedMode,
      }),
      onRehydrateStorage: () => state => {
        if (state) {
          state.effectiveMode = deriveEffectiveMode(
            state.selectedMode,
            state.battery ?? defaultBattery
          );
        }
      },
    }
  )
);
