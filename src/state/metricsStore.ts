import { create } from 'zustand';

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

const MAX_HISTORY = 300;
const DAY_MS = 24 * 60 * 60 * 1000;
const IDLE_CARBON = 200;
const SAMPLE_PERIOD_MS = Number(import.meta.env.VITE_METRICS_INTERVAL_MS || 2000);

export const useMetricsStore = create<MetricsState>((set) => ({
  latest: null,
  history: [],
  dailyTotalCarbon: 0,
  pushSample: (sample) =>
    set((state) => {
      const nextHistory = [...state.history, sample].slice(-MAX_HISTORY);
      const baseline = Math.max(sample.carbonIntensity ?? IDLE_CARBON, 0);
      const delta = baseline * (SAMPLE_PERIOD_MS / DAY_MS);
      const nextCarbon = state.dailyTotalCarbon + delta;
      return {
        latest: sample,
        history: nextHistory,
        dailyTotalCarbon: nextCarbon,
      };
    }),
  clear: () => set({ latest: null, history: [], dailyTotalCarbon: 0 }),
}));
