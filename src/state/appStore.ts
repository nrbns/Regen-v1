import { create } from 'zustand';
import { ModeManager } from '../core/modes/manager';
import { MODES, isModeEnabled, type ModeId } from '../config/modes';
import { toast } from '../utils/toast';

export type AppState = {
  mode: 'Browse' | 'Research' | 'Trade' | 'Games' | 'Docs' | 'Images' | 'Threats' | 'GraphMind';
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
};

export const useAppStore = create<AppState>((set, get) => ({
  mode: 'Browse',
  setMode: async mode => {
    const currentMode = get().mode;
    if (mode === currentMode) return;

    // Tier 1: Check if mode is enabled
    if (!isModeEnabled(mode as ModeId)) {
      const modeConfig = MODES[mode as ModeId];
      toast.info(modeConfig?.description || `${mode} mode is coming soon!`);
      return;
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

    // If no tabs exist for this mode, create one with a default URL
    if (modeTabs.length === 0) {
      const defaultUrls: Record<AppState['mode'], string> = {
        Browse: 'https://www.google.com',
        Research: 'https://www.google.com',
        Trade: 'https://www.tradingview.com',
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
}));
