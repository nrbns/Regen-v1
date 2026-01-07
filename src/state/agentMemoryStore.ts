import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentMemoryEntry = {
  id: string;
  agentId: string;
  runId?: string;
  prompt: string;
  response?: string;
  error?: string;
  success: boolean;
  createdAt: number;
  tokens?: {
    prompt?: number | null;
    completion?: number | null;
    total?: number | null;
  };
};

interface AgentMemoryState {
  entries: AgentMemoryEntry[];
  addEntry: (entry: Omit<AgentMemoryEntry, 'id' | 'createdAt'> & { createdAt?: number }) => void;
  getRecentForAgent: (agentId?: string | null, limit?: number) => AgentMemoryEntry[];
  clearAgent: (agentId?: string | null) => void;
  clearAll: () => void;
}

const DEFAULT_LIMIT = 20;

export const useAgentMemoryStore = create<AgentMemoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (entry) => {
        const newEntry: AgentMemoryEntry = {
          ...entry,
          id: entry.runId ?? `agent-mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: entry.createdAt ?? Date.now(),
        };
        set((state) => {
          const filtered = state.entries.filter(
            (existing) => !(existing.runId && existing.runId === newEntry.runId),
          );
          const next = [newEntry, ...filtered];
          return { entries: next.slice(0, 200) };
        });
      },
      getRecentForAgent: (agentId, limit = DEFAULT_LIMIT) => {
        const pool = get().entries;
        if (!agentId) {
          return pool.slice(0, limit);
        }
        return pool.filter((entry) => entry.agentId === agentId).slice(0, limit);
      },
      clearAgent: (agentId) => {
        set((state) => ({
          entries: agentId ? state.entries.filter((entry) => entry.agentId !== agentId) : [],
        }));
      },
      clearAll: () => set({ entries: [] }),
    }),
    {
      name: 'regen:agent-memory',
      version: 1,
    },
  ),
);

