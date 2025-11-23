import { create } from 'zustand';

export interface TabMemorySample {
  tabId: string;
  title?: string;
  url?: string;
  memoryMB: number;
  timestamp: number;
  pinned?: boolean;
  appMode?: string;
  sleeping?: boolean;
}

export interface MemorySnapshot {
  totalMB: number;
  freeMB?: number;
  timestamp: number;
  tabs: TabMemorySample[];
  savingsMB?: number;
}

interface MemoryState {
  history: MemorySnapshot[];
  latest?: MemorySnapshot;
  capacityMB?: number;
  pushSnapshot: (snapshot: MemorySnapshot) => void;
  setCapacity: (capacity: number) => void;
}

const MAX_HISTORY = 200;

export const useMemoryStore = create<MemoryState>(set => ({
  history: [],
  latest: undefined,
  capacityMB: undefined,
  pushSnapshot: snapshot =>
    set(state => {
      const history = [...state.history, snapshot].slice(-MAX_HISTORY);
      return {
        latest: snapshot,
        history,
      };
    }),
  setCapacity: capacity =>
    set(() => ({
      capacityMB: capacity,
    })),
}));
