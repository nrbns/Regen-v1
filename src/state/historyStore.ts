import { create } from 'zustand';

export type HistoryEntry = {
  id: string;
  type: 'search' | 'url';
  value: string;
  url?: string;
  appMode?: string;
  timestamp: number;
};

type HistoryStore = {
  entries: HistoryEntry[];
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
  getRecent: (limit?: number) => HistoryEntry[];
};

const HISTORY_STORAGE_KEY = 'regen:history';
const MAX_ENTRIES = 150;

const loadInitialHistory = (): HistoryEntry[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === 'string')
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
};

const persistHistory = (entries: HistoryEntry[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('[historyStore] Failed to persist history', error);
  }
};

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  entries: loadInitialHistory(),
  addEntry: (entry) => {
    const newEntry: HistoryEntry = {
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
