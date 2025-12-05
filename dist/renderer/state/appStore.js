import { create } from 'zustand';
import { ModeManager } from '../core/modes/manager';
import { MODES, isModeEnabled } from '../config/modes';
import { toast } from '../utils/toast';
export const useAppStore = create((set, get) => ({
    mode: 'Research',
    setMode: async (mode) => {
        const currentMode = get().mode;
        if (mode === currentMode)
            return;
        // Tier 1: Check if mode is enabled
        if (!isModeEnabled(mode)) {
            const modeConfig = MODES[mode];
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
        // Research and Trade modes don't use tabs - they have their own UI
        if (mode !== 'Research' && mode !== 'Trade') {
            // If no tabs exist for this mode, create one with a default URL
            if (modeTabs.length === 0) {
                const defaultUrls = {
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
                    tabsStore.updateTab(newTab.id, { appMode: mode });
                }
                else if (typeof newTab === 'string') {
                    // Fallback: if it returns just an ID string
                    tabsStore.updateTab(newTab, { appMode: mode });
                }
            }
            else {
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
        window.ui?.setRightDock?.(next ? 360 : 0);
    },
    ledgerDockOpen: false,
    toggleLedgerDock: () => {
        const next = !get().ledgerDockOpen;
        set({ ledgerDockOpen: next });
        window.ui?.setRightDock?.(next ? 360 : 0);
    },
    researchPaneOpen: false,
    toggleResearchPane: () => {
        const next = !get().researchPaneOpen;
        set({ researchPaneOpen: next });
        window.ui?.setRightDock?.(next ? 420 : 0);
    },
    setResearchPaneOpen: (open) => {
        set({ researchPaneOpen: open });
        window.ui?.setRightDock?.(open ? 420 : 0);
    },
    memorySidebarOpen: false,
    setMemorySidebarOpen: (open) => {
        set({ memorySidebarOpen: open });
        // Dispatch event for AppShell to sync state
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('memory-sidebar:toggle', { detail: { open } }));
        }
    },
    regenSidebarOpen: false,
    setRegenSidebarOpen: (open) => {
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
