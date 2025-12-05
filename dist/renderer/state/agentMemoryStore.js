import { create } from 'zustand';
import { persist } from 'zustand/middleware';
const DEFAULT_LIMIT = 20;
export const useAgentMemoryStore = create()(persist((set, get) => ({
    entries: [],
    addEntry: (entry) => {
        const newEntry = {
            ...entry,
            id: entry.runId ?? `agent-mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: entry.createdAt ?? Date.now(),
        };
        set((state) => {
            const filtered = state.entries.filter((existing) => !(existing.runId && existing.runId === newEntry.runId));
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
}), {
    name: 'regen:agent-memory',
    version: 1,
}));
