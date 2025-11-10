import { create } from 'zustand';

export type EfficiencyMode = 'normal' | 'battery-saver' | 'extreme';

const MODE_LABELS: Record<EfficiencyMode, string> = {
  normal: 'Performance Mode',
  'battery-saver': 'Battery Saver Mode',
  extreme: 'Regen Mode',
};

const MODE_BADGES: Record<EfficiencyMode, string | null> = {
  normal: null,
  'battery-saver': '+0.8hr battery',
  extreme: '+1.8hr battery',
};

const MODE_COLORS: Record<EfficiencyMode, string> = {
  normal: 'text-gray-400',
  'battery-saver': 'text-emerald-300',
  extreme: 'text-amber-300',
};

type Snapshot = {
  batteryPct: number | null;
  charging: boolean | null;
  ramMb: number;
  cpuLoad1: number;
  activeTabs: number;
  carbonIntensity?: number | null;
  carbonRegion?: string | null;
};

type EfficiencyState = {
  mode: EfficiencyMode;
  label: string;
  badge: string | null;
  colorClass: string;
  lastUpdated: number | null;
  snapshot: Snapshot;
  setEvent: (event: {
    mode: EfficiencyMode;
    label?: string | null;
    badge?: string | null;
    timestamp: number;
    snapshot: Snapshot;
  }) => void;
};

const defaultSnapshot: Snapshot = {
  batteryPct: null,
  charging: null,
  ramMb: 0,
  cpuLoad1: 0,
  activeTabs: 0,
  carbonIntensity: null,
  carbonRegion: null,
};

export const useEfficiencyStore = create<EfficiencyState>((set) => ({
  mode: 'normal',
  label: MODE_LABELS.normal,
  badge: MODE_BADGES.normal,
  colorClass: MODE_COLORS.normal,
  lastUpdated: null,
  snapshot: defaultSnapshot,
  setEvent: (event) => {
    const nextMode = event.mode;
    set({
      mode: nextMode,
      label: event.label ?? MODE_LABELS[nextMode],
      badge: event.badge ?? MODE_BADGES[nextMode],
      colorClass: MODE_COLORS[nextMode],
      lastUpdated: event.timestamp,
      snapshot: event.snapshot,
    });
  },
}));
