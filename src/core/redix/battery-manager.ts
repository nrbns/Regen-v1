// @ts-nocheck

import { usePowerStore } from '../../state/powerStore';

let initialized = false;

type BatteryLike = {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener: (event: string, handler: () => void) => void;
  removeEventListener: (event: string, handler: () => void) => void;
};

export async function initBatteryManager(): Promise<void> {
  if (initialized || typeof window === 'undefined') {
    return;
  }
  initialized = true;

  if ('getBattery' in navigator && typeof navigator.getBattery === 'function') {
    try {
      const battery: BatteryLike = await navigator.getBattery();
      bindBatteryEvents(battery);
      updateBatteryStore(battery);
      return;
    } catch (error) {
      console.warn('[BatteryManager] navigator.getBattery failed', error);
    }
  }

  // Battery API unavailable – fallback to basic status
  usePowerStore.getState().setBattery({
    supported: false,
    level: null,
    charging: null,
  });
}

function bindBatteryEvents(battery: BatteryLike) {
  const handleChange = () => updateBatteryStore(battery);
  ['chargingchange', 'levelchange', 'dischargingtimechange', 'chargingtimechange'].forEach(
    event => {
      try {
        battery.addEventListener(event, handleChange);
      } catch {
        // ignore
      }
    }
  );

  window.addEventListener(
    'beforeunload',
    () => {
      ['chargingchange', 'levelchange', 'dischargingtimechange', 'chargingtimechange'].forEach(
        event => {
          try {
            battery.removeEventListener(event, handleChange);
          } catch {
            // ignore
          }
        }
      );
    },
    { once: true }
  );
}

function updateBatteryStore(battery: BatteryLike) {
  usePowerStore.getState().setBattery({
    supported: true,
    level: typeof battery.level === 'number' ? battery.level : null,
    charging: typeof battery.charging === 'boolean' ? battery.charging : null,
    chargingTime: Number.isFinite(battery.chargingTime) ? battery.chargingTime : null,
    dischargingTime: Number.isFinite(battery.dischargingTime) ? battery.dischargingTime : null,
    lastUpdated: Date.now(),
  });
}
