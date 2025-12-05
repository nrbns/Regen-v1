// @ts-nocheck
import { configureMemoryPool } from './memory-pool';
import { dispatch } from './runtime';
import { usePowerStore } from '../../state/powerStore';
const MODE_PRESETS = {
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
let unsubscribe = null;
export function initPowerModes() {
    if (initialized)
        return;
    initialized = true;
    applyEffectiveMode(usePowerStore.getState().effectiveMode);
    unsubscribe = usePowerStore.subscribe(state => state.effectiveMode, (mode, prev) => {
        if (mode !== prev) {
            applyEffectiveMode(mode);
        }
    });
    window.addEventListener('beforeunload', () => {
        unsubscribe?.();
    }, { once: true });
}
export function setPowerMode(mode) {
    usePowerStore.getState().setMode(mode);
}
function applyEffectiveMode(mode) {
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
