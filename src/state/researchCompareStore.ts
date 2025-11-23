import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResearchResult, ResearchSource } from '../types/research';

export type ComparedAnswer = {
  id: string;
  query: string;
  summary: string;
  createdAt: number;
  provider?: string;
  model?: string;
  confidence?: number;
  sources: ResearchSource[];
  citations: ResearchResult['citations'];
  settings: {
    includeCounterpoints: boolean;
    authorityBias: number;
    region: string;
  };
};

type ResearchCompareState = {
  entries: ComparedAnswer[];
  addEntry(entry: Omit<ComparedAnswer, 'id' | 'createdAt'>): ComparedAnswer;
  removeEntry(id: string): void;
  clear(): void;
};

const MAX_ENTRIES = 6;

export const useResearchCompareStore = create<ResearchCompareState>()(
  persist(
    (set, _get) => ({
      entries: [],
      addEntry(entry) {
        const now = Date.now();
        const newEntry: ComparedAnswer = {
          ...entry,
          id: `compare-${now}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: now,
        };

        set(state => {
          const existing = state.entries.filter(
            item => item.summary !== entry.summary || item.query !== entry.query
          );
          const next = [newEntry, ...existing].slice(0, MAX_ENTRIES);
          return { entries: next };
        });

        return newEntry;
      },
      removeEntry(id) {
        set(state => ({ entries: state.entries.filter(entry => entry.id !== id) }));
      },
      clear() {
        set({ entries: [] });
      },
    }),
    {
      name: 'research:compare-store',
      version: 1,
    }
  )
);
