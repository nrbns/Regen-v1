// @ts-nocheck

import { configureMemoryPool } from './memory-pool';
import { dispatch } from './runtime';
import { usePowerStore, EffectivePowerMode, PowerMode } from '../../state/powerStore';

const MODE_PRESETS: Record<
  EffectivePowerMode,
  { tabCapMB: number; maxTotalMB: number; reserveForActiveTabsMB: number }
> = {
  Performance: {
    tabCapMB: 768,
    maxTotalMB: 6144,
    reserveForActiveTabsMB: 2048,
  },
  Balanced: {
    tabCapMB: 512,
    maxTotalMB: 4096,
    reserveForActiveTabsMB: 1536,
  },
  PowerSave: {
    tabCapMB: 384,
    maxTotalMB: 3072,
    reserveForActiveTabsMB: 1024,
  },
};

let initialized = false;
let unsubscribe: (() => void) | null = null;

export function initPowerModes(): void {
  if (initialized) return;
  initialized = true;

  applyEffectiveMode(usePowerStore.getState().effectiveMode);

  unsubscribe = usePowerStore.subscribe(
    state => state.effectiveMode,
    (mode, prev) => {
      if (mode !== prev) {
        applyEffectiveMode(mode);
      }
    }
  );

  window.addEventListener(
    'beforeunload',
    () => {
      unsubscribe?.();
    },
    { once: true }
  );
}

export function setPowerMode(mode: PowerMode): void {
  usePowerStore.getState().setMode(mode);
}

function applyEffectiveMode(mode: EffectivePowerMode) {
  const preset = MODE_PRESETS[mode] ?? MODE_PRESETS.Balanced;
  configureMemoryPool(preset);
  dispatch({
    type: 'redix:power:mode',
    payload: {
      effectiveMode: mode,
      selectedMode: usePowerStore.getState().selectedMode,
    },
  });
}
