import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';

export interface PerfMetricSummary {
  metric: string;
  samples: number;
  avg: number;
  p95: number;
  last: number;
  unit: string;
}

export interface TelemetrySummary {
  optIn: boolean;
  enabled: boolean;
  crashCount: number;
  lastCrashAt: number | null;
  uptimeSeconds: number;
  perfMetrics: PerfMetricSummary[];
}

interface ObservabilityState {
  summary: TelemetrySummary | null;
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

export const useObservabilityStore = create<ObservabilityState>((set, get) => ({
  summary: null,
  loading: false,
  error: undefined,
  refresh: async () => {
    if (get().loading) return;
    set({ loading: true, error: undefined });
    try {
      const summary = await ipc.telemetry.getSummary();
      set({ summary, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      });
    }
  },
}));


