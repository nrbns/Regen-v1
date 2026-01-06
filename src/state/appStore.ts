import { create } from 'zustand';
import { ModeManager } from '../core/modes/manager';
import { MODES, isModeEnabled, type ModeId } from '../config/modes';
import { toast } from '../utils/toast';
import { layerManager } from '../core/layers/layerManager';

export type AppState = {
  // Page AI Panel
  isPageAIPanelOpen: boolean;
  setPageAIPanelOpen: (open: boolean) => void;

  // Adblocker
  isAdblockerEnabled: boolean;
  setAdblockerEnabled: (enabled: boolean) => void;

  // Sync Status
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  setSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'success') => void;

  // Realtime heartbeat + system state
  networkStatus: 'online' | 'offline' | 'reconnecting';
  aiStatus: 'idle' | 'thinking' | 'streaming';
  marketStatus: 'live' | 'cached' | 'closed';
  lastUpdateTs: number;
  setNetworkStatus: (s: AppState['networkStatus']) => void;
  setAIStatus: (s: AppState['aiStatus']) => void;
  setMarketStatus: (s: AppState['marketStatus']) => void;
  setHeartbeat: () => void;

  // Original state
  mode: 'Browse' | 'Research' | 'Trade' | 'Knowledge' | 'Dev' | 'Games' | 'Docs' | 'Images' | 'Threats' | 'GraphMind';
  setMode: (m: AppState['mode']) => void;
  graphDockOpen: boolean;
  toggleGraphDock: () => void;
  ledgerDockOpen: boolean;
  toggleLedgerDock: () => void;
  researchPaneOpen: boolean;
  toggleResearchPane: () => void;
  setResearchPaneOpen: (open: boolean) => void;
  memorySidebarOpen: boolean;
  setMemorySidebarOpen: (open: boolean) => void;
  regenSidebarOpen: boolean;
  setRegenSidebarOpen: (open: boolean) => void;
  toggleRegenSidebar: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  networkStatus: 'online',
  aiStatus: 'idle',
  marketStatus: 'cached',
  lastUpdateTs: Date.now(),
  setNetworkStatus: networkStatus => set({ networkStatus, lastUpdateTs: Date.now() }),
  setAIStatus: aiStatus => set({ aiStatus, lastUpdateTs: Date.now() }),
  setMarketStatus: marketStatus => set({ marketStatus, lastUpdateTs: Date.now() }),
  setHeartbeat: () => set({ lastUpdateTs: Date.now() }),
  mode: 'Browse',
  setMode: async mode => {
    const currentMode = get().mode;
    if (mode === currentMode) return;

    // Notify mode sync hub of mode switch
    if (typeof window !== 'undefined') {
      try {
        const { getModeSyncHub } = await import('../services/realtime/modeSyncHub');
        getModeSyncHub().sendModeSwitch(currentMode, mode);
      } catch (error) {
        // Silently fail if hub not available
        console.debug('[AppStore] Mode sync hub not available:', error);
      }
    }

    // Tier 1: Check if mode is enabled
    if (!isModeEnabled(mode as ModeId)) {
      const modeConfig = MODES[mode as ModeId];
      toast.info(modeConfig?.description || `${mode} mode is coming soon!`);
      return;
    }

    // TIERED ARCHITECTURE: Switch to appropriate execution layer
    try {
      await layerManager.switchToMode(mode);
      console.log(`[AppStore] Switched to mode ${mode} (Layer: ${layerManager.getCurrentLayer()})`);
    } catch (error) {
      console.error('[AppStore] Layer switch error:', error);
      toast.error('Failed to activate mode - some features may be unavailable');
    }

    set({ mode });

    // Tier 2: Track mode switch
    import('../services/analytics').then(({ track }) => {
      track('mode_switched', { mode });
    });

    // Get tabs for the new mode
    const { useTabsStore } = await import('./tabsStore');
    const tabsStore = useTabsStore.getState();
    const modeTabs = tabsStore.getTabsForMode(mode);

    // Research and Trade modes don't use tabs - they have their own UI
    if (mode !== 'Research' && mode !== 'Trade') {
      // If no tabs exist for this mode, create one with a default URL
      if (modeTabs.length === 0) {
        const defaultUrls: Record<AppState['mode'], string> = {
          Browse: 'https://www.google.com',
          Research: 'https://www.google.com',
          Trade: 'https://www.tradingview.com',
          Knowledge: 'https://en.wikipedia.org',
          Dev: 'about:blank',
          Games: 'https://www.friv.com',
          Docs: 'about:blank',
          Images: 'https://www.google.com/imghp',
          Threats: 'about:blank',
          GraphMind: 'about:blank',
        };

        const defaultUrl = defaultUrls[mode] || 'about:blank';
        const newTab = await (await import('../lib/ipc-typed')).ipc.tabs.create(defaultUrl);

        // Update the tab with the appMode
        if (newTab && typeof newTab === 'object' && 'id' in newTab) {
          tabsStore.updateTab((newTab as { id: string }).id, { appMode: mode });
        } else if (typeof newTab === 'string') {
          // Fallback: if it returns just an ID string
          tabsStore.updateTab(newTab, { appMode: mode });
        }
      } else {
        // Switch to the first tab of this mode
        if (modeTabs[0]?.id) {
          tabsStore.setActive(modeTabs[0].id);
          await (await import('../lib/ipc-typed')).ipc.tabs.activate({ id: modeTabs[0].id });
        }
      }
    }

    // Activate the mode manager
    ModeManager.activate(mode).catch(console.error);
  },
  graphDockOpen: false,
  toggleGraphDock: () => {
    const next = !get().graphDockOpen;
    set({ graphDockOpen: next });
    (window as any).ui?.setRightDock?.(next ? 360 : 0);
  },
  ledgerDockOpen: false,
  toggleLedgerDock: () => {
    const next = !get().ledgerDockOpen;
    set({ ledgerDockOpen: next });
    (window as any).ui?.setRightDock?.(next ? 360 : 0);
  },
  researchPaneOpen: false,
  toggleResearchPane: () => {
    const next = !get().researchPaneOpen;
    set({ researchPaneOpen: next });
    (window as any).ui?.setRightDock?.(next ? 420 : 0);
  },
  setResearchPaneOpen: (open: boolean) => {
    set({ researchPaneOpen: open });
    (window as any).ui?.setRightDock?.(open ? 420 : 0);
  },
  memorySidebarOpen: false,
  setMemorySidebarOpen: (open: boolean) => {
    set({ memorySidebarOpen: open });
    // Dispatch event for AppShell to sync state
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('memory-sidebar:toggle', { detail: { open } }));
    }
  },
  regenSidebarOpen: false,
  setRegenSidebarOpen: (open: boolean) => {
    set({ regenSidebarOpen: open });
    // Dispatch event for AppShell to sync state
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('regen-sidebar:toggle', { detail: { open } }));
    }
  },
  toggleRegenSidebar: () => {
    const next = !get().regenSidebarOpen;
    get().setRegenSidebarOpen(next);
  },
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
  toggleSidebarCollapsed: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  // Sprint Features State
  isPageAIPanelOpen: false,
  setPageAIPanelOpen: (open: boolean) => {
    set({ isPageAIPanelOpen: open });
  },
  isAdblockerEnabled: true,
  setAdblockerEnabled: (enabled: boolean) => {
    set({ isAdblockerEnabled: enabled });
  },
  syncStatus: 'idle' as 'idle' | 'syncing' | 'error' | 'success',
  setSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'success') => {
    set({ syncStatus: status });
  },
}));
