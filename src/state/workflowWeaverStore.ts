import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  tabIds: string[];
  recommendedActions: string[];
  primaryDomain?: string;
  confidence?: number;
}

export interface WorkflowPlan {
  planId: string;
  goal: string;
  summary: string;
  generatedAt: number;
  confidence: number;
  steps: WorkflowStep[];
  sources: Array<{ domain: string; tabIds: string[] }>;
}

interface WorkflowWeaverState {
  plan: WorkflowPlan | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  fetch: (options?: { maxSteps?: number; force?: boolean }) => Promise<void>;
  setPlan: (plan: WorkflowPlan | null) => void;
}

export const useWorkflowWeaverStore = create<WorkflowWeaverState>((set, get) => ({
  plan: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
  async fetch(options) {
    const { loading, lastFetchedAt } = get();
    if (loading) return;
    if (!options?.force && lastFetchedAt && Date.now() - lastFetchedAt < 10_000) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const response = await ipc.graph.workflow({ maxSteps: options?.maxSteps ?? 5 });
      if (!response || typeof response !== 'object') {
        throw new Error('Workflow weaver unavailable.');
      }
      set({
        plan: response as WorkflowPlan,
        loading: false,
        lastFetchedAt: Date.now(),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        loading: false,
      });
    }
  },
  setPlan(plan) {
    set({ plan });
  },
}));
