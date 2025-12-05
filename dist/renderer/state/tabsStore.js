import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ipc } from '../lib/ipc-typed';
import { debouncedSaveSession } from '../services/session';
import { useAppStore } from './appStore';
export const TAB_GROUP_COLORS = [
    '#6366f1',
    '#8b5cf6',
    '#f472b6',
    '#14b8a6',
    '#0ea5e9',
    '#f97316',
    '#facc15',
];
const generateId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `tab-group-${Math.random().toString(36).slice(2, 10)}`;
};
const MAX_RECENTLY_CLOSED = 12;
const MAX_TABS = 15; // Tier 1: Limit tabs for MVP
export const useTabsStore = create()(persist((set, get) => ({
    tabs: [],
    activeId: null,
    recentlyClosed: [],
    tabGroups: [],
    add: tab => set(state => {
        // Tier 1: Check tab limit
        if (state.tabs.length >= MAX_TABS) {
            // Don't add, but return state (caller should show toast)
            return state;
        }
        const newState = {
            tabs: [...state.tabs, { ...tab, createdAt: tab.createdAt ?? Date.now() }],
            activeId: tab.id,
        };
        // Tier 1: Auto-save session
        const appMode = useAppStore.getState().mode;
        debouncedSaveSession({
            tabs: newState.tabs,
            activeTabId: newState.activeId,
            mode: appMode,
            savedAt: Date.now(),
        });
        // Tier 2: Track tab creation
        import('../services/analytics').then(({ track }) => {
            track('tab_created', { mode: appMode });
        });
        // Index tab in MeiliSearch
        import('../services/meiliIndexer').then(({ indexTab }) => {
            indexTab(tab).catch(console.error);
        });
        return newState;
    }),
    setActive: id => {
        // PR: Fix tab switch - add logging and null guards
        const currentState = get();
        // Early return if already active (prevents unnecessary re-renders and race conditions)
        if (id === currentState.activeId) {
            return;
        }
        console.log('[TABS] setActive', {
            tabId: id,
            currentActiveId: currentState.activeId,
            totalTabs: currentState.tabs.length,
            tabIds: currentState.tabs.map(t => t.id),
        });
        // Validate tab exists if id is provided
        if (id !== null) {
            const tabExists = currentState.tabs.find(t => t.id === id);
            if (!tabExists) {
                // Suppress warning for internal/system tabs (e.g., 'local-initial')
                if (!id.includes('local-') && !id.includes('system-')) {
                    console.warn('[TABS] setActive: Tab not found', id);
                }
                // Don't set to null, keep current active tab
                return;
            }
        }
        set(state => {
            // PR: Fix tab switch - ensure atomic update
            const newState = {
                activeId: id,
                tabs: state.tabs.map(tab => {
                    if (tab.id === id) {
                        return { ...tab, active: true, lastActiveAt: Date.now() };
                    }
                    else {
                        return { ...tab, active: false };
                    }
                }),
            };
            // Tier 1: Auto-save session
            const appMode = useAppStore.getState().mode;
            debouncedSaveSession({
                tabs: newState.tabs,
                activeTabId: newState.activeId,
                mode: appMode,
                savedAt: Date.now(),
            });
            // PR: Fix tab switch - update agent stream store
            import('../state/agentStreamStore')
                .then(({ useAgentStreamStore }) => {
                useAgentStreamStore.getState().setActiveTabId(id);
            })
                .catch(() => {
                // Silently fail if store not available
            });
            return newState;
        });
    },
    setAll: tabs => set(() => {
        const previousTabs = get().tabs;
        const normalized = tabs.map((tab, index) => {
            const previous = previousTabs.find(prev => prev.id === tab.id);
            return {
                ...tab,
                createdAt: tab.createdAt ?? previous?.createdAt ?? Date.now(),
                lastActiveAt: tab.lastActiveAt ?? previous?.lastActiveAt ?? Date.now() - (tabs.length - index),
                pinned: (typeof tab.pinned === 'boolean' ? tab.pinned : previous?.pinned) ?? false,
                groupId: previous?.groupId,
            };
        });
        // Sort: pinned tabs first (by creation time), then unpinned tabs
        const sorted = normalized.sort((a, b) => {
            if (a.pinned && !b.pinned)
                return -1;
            if (!a.pinned && b.pinned)
                return 1;
            if (a.pinned && b.pinned)
                return (a.createdAt ?? 0) - (b.createdAt ?? 0);
            return (a.lastActiveAt ?? 0) - (b.lastActiveAt ?? 0);
        });
        const activeCandidate = sorted.find(tab => tab.active) ?? sorted[0] ?? null;
        return {
            tabs: sorted,
            activeId: activeCandidate ? activeCandidate.id : null,
        };
    }),
    remove: id => set(state => {
        const tabToRemove = state.tabs.find(t => t.id === id);
        // Prevent closing pinned tabs accidentally (user must unpin first)
        if (tabToRemove?.pinned) {
            return state;
        }
        const remaining = state.tabs.filter(tab => tab.id !== id);
        const nextActive = state.activeId === id
            ? (remaining.find(tab => tab.appMode === state.tabs.find(t => t.id === id)?.appMode) ??
                remaining[0] ??
                null)
            : (state.tabs.find(tab => tab.id === state.activeId) ?? null);
        // Tier 1: If no tabs left, create a new blank tab
        const finalTabs = remaining.length === 0
            ? [
                {
                    id: `tab-${Date.now()}`,
                    title: 'New Tab',
                    url: 'about:blank',
                    appMode: useAppStore.getState().mode,
                    createdAt: Date.now(),
                    lastActiveAt: Date.now(),
                },
            ]
            : remaining;
        const finalActiveId = remaining.length === 0 ? finalTabs[0].id : nextActive ? nextActive.id : null;
        const newState = {
            tabs: finalTabs,
            activeId: finalActiveId,
        };
        // MEMORY LEAK FIX: Clean up tab resources
        // Emit cleanup event for tab content cleanup
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tab-closed', { detail: { tabId: id } }));
        }
        // Tier 1: Auto-save session
        const appMode = useAppStore.getState().mode;
        debouncedSaveSession({
            tabs: newState.tabs,
            activeTabId: newState.activeId,
            mode: appMode,
            savedAt: Date.now(),
        });
        // Tier 2: Track tab closure
        import('../services/analytics').then(({ track }) => {
            track('tab_closed', { mode: appMode });
        });
        return newState;
    }),
    getTabsForMode: (mode) => {
        const state = get();
        return state.tabs.filter(tab => !tab.appMode || tab.appMode === mode);
    },
    updateTab: (id, updates) => set(state => {
        const updatedTabs = state.tabs.map(tab => (tab.id === id ? { ...tab, ...updates } : tab));
        const updatedTab = updatedTabs.find(t => t.id === id);
        // Re-index updated tab in MeiliSearch
        if (updatedTab) {
            import('../services/meiliIndexer').then(({ indexTab }) => {
                indexTab(updatedTab).catch(console.error);
            });
        }
        return { tabs: updatedTabs };
    }),
    rememberClosedTab: (tab) => set(state => {
        const entry = {
            closedId: tab.id,
            title: tab.title,
            url: tab.url,
            appMode: tab.appMode,
            mode: tab.mode,
            containerId: tab.containerId,
            containerName: tab.containerName,
            containerColor: tab.containerColor,
            groupId: tab.groupId,
            closedAt: Date.now(),
        };
        return {
            recentlyClosed: [
                entry,
                ...state.recentlyClosed.filter(item => item.closedId !== tab.id),
            ].slice(0, MAX_RECENTLY_CLOSED),
        };
    }),
    popRecentlyClosed: () => {
        const state = get();
        if (state.recentlyClosed.length === 0) {
            return undefined;
        }
        const [first, ...rest] = state.recentlyClosed;
        set({ recentlyClosed: rest });
        return first;
    },
    removeRecentlyClosed: (closedId) => set(state => ({
        recentlyClosed: state.recentlyClosed.filter(entry => entry.closedId !== closedId),
    })),
    pushRecentlyClosed: (entry) => set(state => ({
        recentlyClosed: [
            entry,
            ...state.recentlyClosed.filter(item => item.closedId !== entry.closedId),
        ].slice(0, MAX_RECENTLY_CLOSED),
    })),
    clearRecentlyClosed: () => set({ recentlyClosed: [] }),
    pinTab: (id) => {
        set(state => {
            const tab = state.tabs.find(t => t.id === id);
            if (!tab)
                return state;
            const otherTabs = state.tabs.filter(t => t.id !== id);
            const pinnedTabs = otherTabs
                .filter(t => t.pinned)
                .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
            const unpinnedTabs = otherTabs.filter(t => !t.pinned);
            return {
                tabs: [...pinnedTabs, { ...tab, pinned: true }, ...unpinnedTabs],
            };
        });
        try {
            void ipc.tabs.setPinned({ id, pinned: true });
        }
        catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('[TabsStore] Failed to pin tab via IPC', error);
            }
        }
    },
    unpinTab: (id) => {
        set(state => {
            const tab = state.tabs.find(t => t.id === id);
            if (!tab)
                return state;
            const otherTabs = state.tabs.filter(t => t.id !== id);
            const pinnedTabs = otherTabs
                .filter(t => t.pinned)
                .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
            const unpinnedTabs = otherTabs.filter(t => !t.pinned);
            return {
                tabs: [...pinnedTabs, { ...tab, pinned: false }, ...unpinnedTabs],
            };
        });
        try {
            void ipc.tabs.setPinned({ id, pinned: false });
        }
        catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('[TabsStore] Failed to unpin tab via IPC', error);
            }
        }
    },
    togglePinTab: (id) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === id);
        if (!tab)
            return;
        if (tab.pinned) {
            get().unpinTab(id);
        }
        else {
            get().pinTab(id);
        }
    },
    createGroup: options => {
        const currentGroups = get().tabGroups;
        const group = {
            id: generateId(),
            name: options?.name?.trim() || `Group ${currentGroups.length + 1}`,
            color: options?.color || TAB_GROUP_COLORS[currentGroups.length % TAB_GROUP_COLORS.length],
            collapsed: false,
            createdAt: Date.now(),
        };
        set(state => ({
            tabGroups: [...state.tabGroups, group],
        }));
        return group;
    },
    updateGroup: (id, updates) => set(state => ({
        tabGroups: state.tabGroups.map(group => group.id === id ? { ...group, ...updates } : group),
    })),
    deleteGroup: id => set(state => ({
        tabGroups: state.tabGroups.filter(group => group.id !== id),
        tabs: state.tabs.map(tab => (tab.groupId === id ? { ...tab, groupId: undefined } : tab)),
    })),
    toggleGroupCollapsed: id => set(state => ({
        tabGroups: state.tabGroups.map(group => group.id === id ? { ...group, collapsed: !group.collapsed } : group),
    })),
    setGroupColor: (id, color) => set(state => ({
        tabGroups: state.tabGroups.map(group => (group.id === id ? { ...group, color } : group)),
    })),
    assignTabToGroup: (tabId, groupId) => set(state => ({
        tabs: state.tabs.map(tab => tab.id === tabId ? { ...tab, groupId: groupId || undefined } : tab),
    })),
    // Tier 1: History navigation
    navigateTab: (tabId, newUrl) => set(state => {
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab)
            return state;
        // Initialize history if it doesn't exist, starting with the current URL
        let history = tab.history || [];
        if (history.length === 0 && tab.url) {
            history = [
                {
                    url: tab.url,
                    title: tab.title,
                    timestamp: tab.createdAt || Date.now(),
                },
            ];
        }
        const historyIndex = tab.historyIndex ?? history.length - 1;
        // If we're not at the end of history, truncate forward history
        const newHistory = historyIndex < history.length - 1 ? history.slice(0, historyIndex + 1) : history;
        // Add new entry
        const newEntry = {
            url: newUrl,
            title: tab.title,
            timestamp: Date.now(),
        };
        return {
            tabs: state.tabs.map(t => t.id === tabId
                ? {
                    ...t,
                    url: newUrl,
                    history: [...newHistory, newEntry],
                    historyIndex: newHistory.length, // Points to the new entry
                }
                : t),
        };
    }),
    goBack: tabId => set(state => {
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab || !tab.history || tab.historyIndex === undefined || tab.historyIndex <= 0) {
            return state;
        }
        const newIndex = tab.historyIndex - 1;
        const entry = tab.history[newIndex];
        return {
            tabs: state.tabs.map(t => t.id === tabId
                ? {
                    ...t,
                    url: entry.url,
                    title: entry.title || t.title,
                    historyIndex: newIndex,
                }
                : t),
        };
    }),
    goForward: tabId => set(state => {
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab ||
            !tab.history ||
            tab.historyIndex === undefined ||
            tab.historyIndex >= tab.history.length - 1) {
            return state;
        }
        const newIndex = tab.historyIndex + 1;
        const entry = tab.history[newIndex];
        return {
            tabs: state.tabs.map(t => t.id === tabId
                ? {
                    ...t,
                    url: entry.url,
                    title: entry.title || t.title,
                    historyIndex: newIndex,
                }
                : t),
        };
    }),
    canGoBack: tabId => {
        const tab = get().tabs.find(t => t.id === tabId);
        if (!tab || !tab.history || tab.history.length === 0)
            return false;
        const historyIndex = tab.historyIndex ?? tab.history.length - 1;
        return historyIndex > 0;
    },
    canGoForward: tabId => {
        const tab = get().tabs.find(t => t.id === tabId);
        return (tab?.history !== undefined &&
            tab.historyIndex !== undefined &&
            tab.historyIndex < tab.history.length - 1);
    },
    // Tier 1: Tab limits
    canAddTab: () => {
        return get().tabs.length < MAX_TABS;
    },
    getTabCount: () => {
        return get().tabs.length;
    },
    getMaxTabs: () => {
        return MAX_TABS;
    },
}), {
    name: 'regen:tabs-state',
    version: 1,
    partialize: state => ({
        tabs: state.tabs,
        activeId: state.activeId,
        recentlyClosed: state.recentlyClosed,
        tabGroups: state.tabGroups,
    }),
}));
