// Battery-aware auto power mode adjustment
// If battery info is available and user hasn't chosen a specific mode, switch to Auto to leverage battery-aware throttling.

import { usePowerStore } from '../../state/powerStore';

let initialized = false;

export function initAutoPowerMode(): void {
  if (initialized) return;
  initialized = true;

  const store = usePowerStore.getState();

  // If user already chose a mode (Performance/PowerSave), respect it.
  if (store.selectedMode !== 'Balanced' && store.selectedMode !== 'Auto') {
    return;
  }

  // If battery API not supported, skip.
  if (!store.battery.supported) {
    return;
  }

  // Move to Auto once so effectiveMode tracks battery level.
  usePowerStore.getState().setMode('Auto');

  // Subscribe for late battery availability (e.g., after async getBattery)
  const unsubscribeBattery = usePowerStore.subscribe(
    state => state.battery,
    () => {
      const battery = usePowerStore.getState().battery;
      if (!battery?.supported) return;
      const selected = usePowerStore.getState().selectedMode;
      if (selected === 'Balanced') {
        usePowerStore.getState().setMode('Auto');
      }
    }
  );

  if (import.meta && import.meta.hot) {
    import.meta.hot.dispose(() => {
      unsubscribeBattery();
      initialized = false;
    });
  }
}
