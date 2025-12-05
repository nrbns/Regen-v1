import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ipc } from '../lib/ipc-typed';
import { useTabsStore } from './tabsStore';
const buildHash = (tabs, activeId) => {
    const base = tabs
        .map((tab) => `${tab.appMode ?? 'all'}|${tab.url ?? 'about:blank'}`)
        .join('::');
    return `${activeId ?? 'none'}#${base}`;
};
export const useSessionStore = create()(persist((set, get) => ({
    snapshot: null,
    saveSnapshot: (tabs, activeId) => {
        if (!Array.isArray(tabs) || tabs.length === 0) {
            set({ snapshot: null });
            return;
        }
        const snapshotTabs = tabs.map((tab) => ({
            id: tab.id,
            url: tab.url,
            title: tab.title,
            appMode: tab.appMode,
            containerId: tab.containerId,
            containerName: tab.containerName,
            containerColor: tab.containerColor,
        }));
        const last = get().snapshot;
        const hash = buildHash(snapshotTabs, activeId);
        if (last?.hash === hash) {
            return;
        }
        set({
            snapshot: {
                updatedAt: Date.now(),
                tabCount: snapshotTabs.length,
                tabs: snapshotTabs,
                activeId: snapshotTabs.some((tab) => tab.id === activeId) ? activeId : snapshotTabs[0].id,
                hash,
            },
        });
    },
    clearSnapshot: () => set({ snapshot: null }),
    restoreFromSnapshot: async () => {
        const snapshot = get().snapshot;
        if (!snapshot || snapshot.tabs.length === 0) {
            return { restored: false, tabCount: 0 };
        }
        const tabsStore = useTabsStore.getState();
        const createdTabIds = [];
        for (const saved of snapshot.tabs) {
            const targetUrl = saved.url || 'about:blank';
            try {
                const result = await ipc.tabs.create(targetUrl);
                const resolvedId = typeof result === 'string' ? result : (result && typeof result === 'object' ? result.id : null);
                if (resolvedId) {
                    tabsStore.updateTab(resolvedId, {
                        title: saved.title,
                        appMode: saved.appMode,
                        containerId: saved.containerId,
                        containerName: saved.containerName,
                        containerColor: saved.containerColor,
                    });
                    createdTabIds.push(resolvedId);
                }
            }
            catch (error) {
                console.warn('[SessionStore] Failed to recreate tab from snapshot:', error);
            }
        }
        if (createdTabIds.length === 0) {
            return { restored: false, tabCount: 0 };
        }
        const snapshotActiveIndex = snapshot.tabs.findIndex((tab) => tab.id === snapshot.activeId);
        const resolvedActive = snapshotActiveIndex >= 0 ? createdTabIds[snapshotActiveIndex] : createdTabIds[createdTabIds.length - 1];
        if (resolvedActive) {
            tabsStore.setActive(resolvedActive);
            try {
                await ipc.tabs.activate({ id: resolvedActive });
            }
            catch (error) {
                console.warn('[SessionStore] Failed to activate restored tab:', error);
            }
        }
        return { restored: true, tabCount: createdTabIds.length };
    },
}), {
    name: 'regen:session-snapshot',
    version: 1,
}));
