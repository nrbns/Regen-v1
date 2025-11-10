import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';

export type TabGraphNode = {
  id: string;
  title: string;
  url: string;
  domain: string;
  containerId?: string;
  containerName?: string;
  containerColor?: string;
  mode?: 'normal' | 'ghost' | 'private';
  active: boolean;
  createdAt?: number;
  lastActiveAt?: number;
};

export type TabGraphEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
  reasons: string[];
};

export type TabGraphSummary = {
  totalTabs: number;
  activeTabs: number;
  domains: number;
  containers: number;
};

export type TabGraphData = {
  nodes: TabGraphNode[];
  edges: TabGraphEdge[];
  summary: TabGraphSummary;
  updatedAt: number;
  clusters?: Array<{ id: string; label: string; tabIds: string[]; domain?: string; strength: number }>;
};

interface TabGraphState {
  visible: boolean;
  loading: boolean;
  error: string | null;
  data: TabGraphData | null;
  focusedTabId: string | null;
  open: () => Promise<void>;
  close: () => void;
  toggle: () => Promise<void>;
  refresh: () => Promise<void>;
  setFocusedTab: (tabId: string | null) => void;
  focusTab: (tabId: string) => Promise<void>;
}

export const useTabGraphStore = create<TabGraphState>((set, get) => ({
  visible: false,
  loading: false,
  error: null,
  data: null,
  focusedTabId: null,
  async open() {
    if (!get().visible) {
      set({ visible: true });
    }
    await get().refresh();
  },
  close() {
    set({ visible: false, focusedTabId: null });
  },
  async toggle() {
    if (get().visible) {
      set({ visible: false, focusedTabId: null });
    } else {
      set({ visible: true });
      await get().refresh();
    }
  },
  async refresh() {
    set({ loading: true, error: null });
    try {
      const payload = await ipc.graph.tabs();
      if (!payload || typeof payload !== 'object') {
        throw new Error('Graph data unavailable');
      }
      set({ data: payload as TabGraphData, loading: false, error: null });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  },
  setFocusedTab(tabId) {
    set({ focusedTabId: tabId });
  },
  async focusTab(tabId) {
    set({ visible: true, focusedTabId: tabId });
    await get().refresh();
  },
}));
