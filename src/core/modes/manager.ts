import { create } from 'zustand';
import { dispatch } from '../redix/runtime';
import { getGhostMode } from '../ghost-mode';
import { ipc } from '../../lib/ipc-typed';

export type ModeId = 'Browse' | 'Research' | 'Trade' | 'Games' | 'Docs' | 'Images' | 'Threats' | 'GraphMind';

export interface ModeDefinition {
  id: ModeId;
  name: string;
  icon: string;
  description: string;
  defaultTools?: string[];
  onboarding?: {
    steps?: string[];
    video?: string;
  };
  onActivate?: () => Promise<void> | void;
  onDeactivate?: () => Promise<void> | void;
  privacyDefaults?: {
    ghost?: boolean;
    proxy?: 'tor' | 'vpn' | 'none';
    trackingProtection?: boolean;
  };
  aiContext?: {
    prompt?: string;
    agentId?: string;
  };
}

interface ModeManagerState {
  currentMode: ModeId;
  previousMode: ModeId | null;
  modes: Record<ModeId, ModeDefinition>;
  loading: boolean;
  activateMode: (mode: ModeId) => Promise<void>;
  registerMode: (definition: ModeDefinition) => void;
}

const defaultModes: Record<ModeId, ModeDefinition> = {
  Browse: {
    id: 'Browse',
    name: 'Browse',
    icon: 'Globe',
    description: 'Default browsing with balanced privacy and performance.',
    privacyDefaults: { ghost: false, proxy: 'none', trackingProtection: true },
    onActivate: async () => {
      // Close all mode-specific panels when returning to Browse mode
      const { useAppStore } = await import('../../state/appStore');
      useAppStore.getState().setResearchPaneOpen(false);
      useAppStore.getState().setMemorySidebarOpen(false);
      const { useTradeStore } = await import('../../state/tradeStore');
      useTradeStore.getState().setSidebarOpen(false);
      if (useAppStore.getState().graphDockOpen) {
        useAppStore.getState().toggleGraphDock();
      }
    },
  },
  Research: {
    id: 'Research',
    name: 'Research',
    icon: 'Search',
    description: 'Deep research workflow with SuperMemory + agents.',
    defaultTools: ['memory', 'agent', 'reader'],
    privacyDefaults: { ghost: false, proxy: 'none', trackingProtection: true },
    aiContext: {
      prompt: 'You are the Research Mode assistant. Provide structured answers with citations and highlight contradictions.',
      agentId: 'research.agent',
    },
    onActivate: async () => {
      // Open Memory Sidebar and Research Pane when Research mode is activated
      const { useAppStore } = await import('../../state/appStore');
      useAppStore.getState().setMemorySidebarOpen(true);
      useAppStore.getState().setResearchPaneOpen(true);
    },
    onDeactivate: async () => {
      // Close Research Pane when leaving Research mode (keep Memory Sidebar open)
      const { useAppStore } = await import('../../state/appStore');
      useAppStore.getState().setResearchPaneOpen(false);
    },
  },
  Trade: {
    id: 'Trade',
    name: 'Trade',
    icon: 'TrendingUp',
    description: 'Market intelligence with live charts, privacy defaults, and data firewalls.',
    defaultTools: ['charts', 'sentiment', 'eco-balance'],
    privacyDefaults: { ghost: true, proxy: 'vpn', trackingProtection: true },
    aiContext: {
      prompt: 'You are the Trade Mode assistant. Provide price action, key levels, risk notes, and market context for trading queries.',
      agentId: 'trade.agent',
    },
    onActivate: async () => {
      // Open TradeSidebar when Trade mode is activated
      const { useTradeStore } = await import('../../state/tradeStore');
      useTradeStore.getState().setSidebarOpen(true);
    },
    onDeactivate: async () => {
      // Close TradeSidebar when leaving Trade mode
      const { useTradeStore } = await import('../../state/tradeStore');
      useTradeStore.getState().setSidebarOpen(false);
    },
  },
  Games: {
    id: 'Games',
    name: 'Games',
    icon: 'Gamepad',
    description: 'Optimized for low-latency streaming and controller input.',
    privacyDefaults: { ghost: false, proxy: 'none', trackingProtection: false },
  },
  Docs: {
    id: 'Docs',
    name: 'Docs',
    icon: 'FileText',
    description: 'Document authoring and summarization.',
    defaultTools: ['editor', 'summarizer'],
    aiContext: {
      prompt: 'You are the Docs Mode assistant. Summarize documents, extract key information, and help with documentation queries.',
      agentId: 'docs.agent',
    },
  },
  Images: {
    id: 'Images',
    name: 'Images',
    icon: 'Image',
    description: 'Visual search and inspiration boards.',
    aiContext: {
      prompt: 'You are the Images Mode assistant. Help users find and analyze images, create inspiration boards, and work with visual content.',
      agentId: 'images.agent',
    },
  },
  Threats: {
    id: 'Threats',
    name: 'Threats',
    icon: 'Shield',
    description: 'Security analysis with network isolation.',
    privacyDefaults: { ghost: true, proxy: 'tor', trackingProtection: true },
    defaultTools: ['threat-intel', 'sandbox'],
    aiContext: {
      prompt: 'You are the Threats Mode assistant. Analyze security threats, provide threat intelligence, and help with security analysis.',
      agentId: 'threats.agent',
    },
  },
  GraphMind: {
    id: 'GraphMind',
    name: 'GraphMind',
    icon: 'GitBranch',
    description: 'Knowledge graph view of SuperMemory and research trails.',
    defaultTools: ['graph'],
    aiContext: {
      prompt: 'You are the GraphMind assistant. Help users explore their knowledge graph by identifying connections, relationships, and patterns in their SuperMemory.',
      agentId: 'graphmind.agent',
    },
    onActivate: async () => {
      // Open Graph Dock when GraphMind mode is activated
      const { useAppStore } = await import('../../state/appStore');
      if (!useAppStore.getState().graphDockOpen) {
        useAppStore.getState().toggleGraphDock();
      }
    },
    onDeactivate: async () => {
      // Close Graph Dock when leaving GraphMind mode
      const { useAppStore } = await import('../../state/appStore');
      if (useAppStore.getState().graphDockOpen) {
        useAppStore.getState().toggleGraphDock();
      }
    },
  },
};

export const useModeManager = create<ModeManagerState>((set, get) => ({
  currentMode: 'Browse',
  previousMode: null,
  modes: defaultModes,
  loading: false,
  async activateMode(mode) {
    const { currentMode, modes } = get();
    if (mode === currentMode) return;
    const modeDefinition = modes[mode];
    if (!modeDefinition) return;

    set({ loading: true });
    dispatch({
      type: 'redix:mode:activating',
      payload: { from: currentMode, to: mode },
      source: 'mode-manager',
    });

    try {
      await modes[currentMode]?.onDeactivate?.();
      await applyPrivacyDefaults(modeDefinition);
      await modeDefinition.onActivate?.();

      set({ previousMode: currentMode, currentMode: mode, loading: false });
      dispatch({
        type: 'redix:mode:activated',
        payload: { mode },
        source: 'mode-manager',
      });
    } catch (error) {
      console.error('[ModeManager] Failed to activate mode:', error);
      set({ loading: false });
      dispatch({
        type: 'redix:mode:error',
        payload: { mode, error: error instanceof Error ? error.message : String(error) },
        source: 'mode-manager',
      });
    }
  },
  registerMode(definition) {
    set((state) => ({
      modes: {
        ...state.modes,
        [definition.id]: {
          ...defaultModes[definition.id],
          ...definition,
        },
      },
    }));
  },
}));

async function applyPrivacyDefaults(mode: ModeDefinition) {
  const ghostMode = getGhostMode();
  if (mode.privacyDefaults?.ghost) {
    ghostMode.enable();
  } else {
    ghostMode.disable();
  }

  if (mode.privacyDefaults?.proxy && mode.privacyDefaults.proxy !== 'none') {
    try {
      if (mode.privacyDefaults.proxy === 'tor') {
        await ipc.proxy.set({
          type: 'socks5',
          host: '127.0.0.1',
          port: 9050,
        });
      } else if (mode.privacyDefaults.proxy === 'vpn') {
        await ipc.proxy.set({
          type: 'socks5',
          host: '127.0.0.1',
          port: 1080,
        });
      }
    } catch (error) {
      console.warn('[ModeManager] Failed to apply proxy defaults:', error);
    }
  } else {
    try {
      await ipc.proxy.set({ mode: 'direct' });
    } catch (error) {
      console.warn('[ModeManager] Failed to clear proxy:', error);
    }
  }

  dispatch({
    type: 'redix:mode:privacy',
    payload: { mode: mode.id, defaults: mode.privacyDefaults },
    source: 'mode-manager',
  });
}

export const ModeManager = {
  activate: (mode: ModeId) => useModeManager.getState().activateMode(mode),
  register: (definition: ModeDefinition) => useModeManager.getState().registerMode(definition),
  getCurrent: () => useModeManager.getState().modes[useModeManager.getState().currentMode],
};

