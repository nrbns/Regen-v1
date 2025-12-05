import { create } from 'zustand';
const HISTORY_STORAGE_KEY = 'regen:history';
const MAX_ENTRIES = 150;
const loadInitialHistory = () => {
    if (typeof window === 'undefined') {
        return [];
    }
    try {
        const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed
            .filter((item) => item && typeof item.id === 'string')
            .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
            .slice(0, MAX_ENTRIES);
    }
    catch {
        return [];
    }
};
const persistHistory = (entries) => {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
    }
    catch (error) {
        console.warn('[historyStore] Failed to persist history', error);
    }
};
export const useHistoryStore = create((set, get) => ({
    entries: loadInitialHistory(),
    addEntry: (entry) => {
        const newEntry = {
            ...entry,
            id: `${entry.type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            timestamp: Date.now(),
        };
        set((state) => {
            const next = [newEntry, ...state.entries].slice(0, MAX_ENTRIES);
            persistHistory(next);
            return { entries: next };
        });
    },
    clear: () => {
        set({ entries: [] });
        persistHistory([]);
    },
    getRecent: (limit = 15) => {
        return get().entries.slice(0, limit);
    },
}));
