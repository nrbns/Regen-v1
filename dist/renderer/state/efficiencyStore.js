import { create } from 'zustand';
const MODE_LABELS = {
    normal: 'Performance Mode',
    'battery-saver': 'Battery Saver Mode',
    extreme: 'Regen Mode',
};
const MODE_BADGES = {
    normal: null,
    'battery-saver': '+0.8hr battery',
    extreme: '+1.8hr battery',
};
const MODE_COLORS = {
    normal: 'text-gray-400',
    'battery-saver': 'text-emerald-300',
    extreme: 'text-amber-300',
};
const defaultSnapshot = {
    batteryPct: null,
    charging: null,
    ramMb: 0,
    cpuLoad1: 0,
    activeTabs: 0,
    carbonIntensity: null,
    carbonRegion: null,
};
const HISTORY_KEY = 'ob:ecoHistory:v1';
function loadHistory() {
    if (typeof window === 'undefined')
        return [];
    try {
        const raw = window.localStorage.getItem(HISTORY_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed
            .map((item) => ({
            timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
            mode: item.mode ?? 'normal',
            batteryPct: typeof item.batteryPct === 'number' ? item.batteryPct : null,
            carbonIntensity: typeof item.carbonIntensity === 'number' || item.carbonIntensity === null
                ? item.carbonIntensity
                : undefined,
            cpuLoad: typeof item.cpuLoad === 'number' ? item.cpuLoad : 0,
            activeTabs: typeof item.activeTabs === 'number' ? item.activeTabs : 0,
        }))
            .slice(-120);
    }
    catch (error) {
        console.warn('[efficiencyStore] Failed to load history', error);
        return [];
    }
}
function saveHistory(history) {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
    catch (error) {
        console.warn('[efficiencyStore] Failed to persist history', error);
    }
}
const initialHistory = loadHistory();
export const useEfficiencyStore = create((set, get) => ({
    mode: 'normal',
    label: MODE_LABELS.normal,
    badge: MODE_BADGES.normal,
    colorClass: MODE_COLORS.normal,
    lastUpdated: null,
    snapshot: defaultSnapshot,
    history: initialHistory,
    setEvent: (event) => {
        const sample = {
            timestamp: event.timestamp,
            mode: event.mode,
            batteryPct: event.snapshot.batteryPct,
            carbonIntensity: event.snapshot.carbonIntensity,
            cpuLoad: event.snapshot.cpuLoad1,
            activeTabs: event.snapshot.activeTabs,
        };
        let nextHistory = get().history;
        nextHistory = [...nextHistory, sample].slice(-120);
        saveHistory(nextHistory);
        const nextMode = event.mode;
        set({
            mode: nextMode,
            label: event.label ?? MODE_LABELS[nextMode],
            badge: event.badge ?? MODE_BADGES[nextMode],
            colorClass: MODE_COLORS[nextMode],
            lastUpdated: event.timestamp,
            snapshot: event.snapshot,
            history: nextHistory,
        });
    },
}));
