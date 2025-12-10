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
  clusters?: Array<{
    id: string;
    label: string;
    tabIds: string[];
    domain?: string;
    strength: number;
  }>;
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

      const graphData = payload as TabGraphData;

      // AUDIT FIX #7: GVE prune - prevent OOM at 500+ tabs
      const MAX_NODES = 500;
      if (graphData.nodes.length > MAX_NODES) {
        // Prune oldest 100 nodes (by lastActiveAt or createdAt)
        const sortedNodes = [...graphData.nodes].sort((a, b) => {
          const aTime = a.lastActiveAt || a.createdAt || 0;
          const bTime = b.lastActiveAt || b.createdAt || 0;
          return aTime - bTime; // Oldest first
        });

        const toKeep = sortedNodes.slice(-400); // Keep newest 400
        const prunedCount = graphData.nodes.length - toKeep.length;

        // Update graph data with pruned nodes
        graphData.nodes = toKeep;

        // Also prune edges that reference removed nodes
        const keptIds = new Set(toKeep.map(n => n.id));
        graphData.edges = graphData.edges.filter(
          e => keptIds.has(e.source) && keptIds.has(e.target)
        );

        console.log(`[TabGraph] Pruned ${prunedCount} old nodes (kept ${toKeep.length})`);

        // Update summary
        graphData.summary.totalTabs = toKeep.length;
        graphData.updatedAt = Date.now();
      }

      set({ data: graphData, loading: false, error: null });
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
