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

export type TabHistoryEntry = {
  url: string;
  title?: string;
  timestamp: number;
};

export type Tab = {
  id: string;
  title: string;
  active?: boolean;
  url?: string;
  containerId?: string;
  containerColor?: string;
  containerName?: string;
  mode?: 'normal' | 'ghost' | 'private';
  appMode?: 'Browse' | 'Research' | 'Trade' | 'Games' | 'Docs' | 'Images' | 'Threats' | 'GraphMind';
  createdAt?: number;
  lastActiveAt?: number;
  sessionId?: string;
  profileId?: string;
  sleeping?: boolean;
  pinned?: boolean;
  groupId?: string;
  // Tier 1: History tracking for back/forward
  history?: TabHistoryEntry[];
  historyIndex?: number; // Current pointer in history
};

export type TabGroup = {
  id: string;
  name: string;
  color: string;
  collapsed?: boolean;
  createdAt: number;
};

export type ClosedTab = {
  closedId: string;
  title?: string;
  url?: string;
  appMode?: Tab['appMode'];
  mode?: Tab['mode'];
  containerId?: string;
  containerName?: string;
  containerColor?: string;
  groupId?: string;
  closedAt: number;
};

type TabsState = {
  tabs: Tab[];
  activeId: string | null;
  recentlyClosed: ClosedTab[];
  tabGroups: TabGroup[];
  add: (t: Tab) => void;
  setActive: (id: string | null) => void;
  setAll: (tabs: Tab[]) => void;
  remove: (id: string) => void;
  getTabsForMode: (mode: string) => Tab[];
  updateTab: (id: string, updates: Partial<Tab>) => void;
  rememberClosedTab: (tab: Tab) => void;
  popRecentlyClosed: () => ClosedTab | undefined;
  removeRecentlyClosed: (closedId: string) => void;
  pushRecentlyClosed: (entry: ClosedTab) => void;
  clearRecentlyClosed: () => void;
  pinTab: (id: string) => void;
  unpinTab: (id: string) => void;
  togglePinTab: (id: string) => void;
  createGroup: (options?: { name?: string; color?: string }) => TabGroup;
  updateGroup: (id: string, updates: Partial<TabGroup>) => void;
  deleteGroup: (id: string) => void;
  toggleGroupCollapsed: (id: string) => void;
  setGroupColor: (id: string, color: string) => void;
  assignTabToGroup: (tabId: string, groupId: string | null) => void;
  // Tier 1: History navigation
  navigateTab: (tabId: string, newUrl: string) => void;
  goBack: (tabId: string) => void;
  goForward: (tabId: string) => void;
  canGoBack: (tabId: string) => boolean;
  canGoForward: (tabId: string) => boolean;
  // Tier 1: Tab limits
  canAddTab: () => boolean;
  getTabCount: () => number;
  getMaxTabs: () => number;
};

const MAX_RECENTLY_CLOSED = 12;
const MAX_TABS = 15; // Tier 1: Limit tabs for MVP

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeId: null,
      recentlyClosed: [],
      tabGroups: [],
      add: tab =>
        set(state => {
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
          return newState;
        }),
      setActive: id =>
        set(state => {
          const newState = {
            activeId: id,
            tabs: state.tabs.map(tab =>
              tab.id === id
                ? { ...tab, active: true, lastActiveAt: Date.now() }
                : { ...tab, active: false }
            ),
          };
          // Tier 1: Auto-save session
          const appMode = useAppStore.getState().mode;
          debouncedSaveSession({
            tabs: newState.tabs,
            activeTabId: newState.activeId,
            mode: appMode,
            savedAt: Date.now(),
          });
          return newState;
        }),
      setAll: tabs =>
        set(() => {
          const previousTabs = get().tabs;
          const normalized = tabs.map((tab, index) => {
            const previous = previousTabs.find(prev => prev.id === tab.id);
            return {
              ...tab,
              createdAt: tab.createdAt ?? previous?.createdAt ?? Date.now(),
              lastActiveAt:
                tab.lastActiveAt ?? previous?.lastActiveAt ?? Date.now() - (tabs.length - index),
              pinned: (typeof tab.pinned === 'boolean' ? tab.pinned : previous?.pinned) ?? false,
              groupId: previous?.groupId,
            };
          });
          // Sort: pinned tabs first (by creation time), then unpinned tabs
          const sorted = normalized.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            if (a.pinned && b.pinned) return (a.createdAt ?? 0) - (b.createdAt ?? 0);
            return (a.lastActiveAt ?? 0) - (b.lastActiveAt ?? 0);
          });
          const activeCandidate = sorted.find(tab => tab.active) ?? sorted[0] ?? null;
          return {
            tabs: sorted,
            activeId: activeCandidate ? activeCandidate.id : null,
          };
        }),
      remove: id =>
        set(state => {
          const tabToRemove = state.tabs.find(t => t.id === id);
          // Prevent closing pinned tabs accidentally (user must unpin first)
          if (tabToRemove?.pinned) {
            return state;
          }
          const remaining = state.tabs.filter(tab => tab.id !== id);
          const nextActive =
            state.activeId === id
              ? (remaining.find(
                  tab => tab.appMode === state.tabs.find(t => t.id === id)?.appMode
                ) ??
                remaining[0] ??
                null)
              : (state.tabs.find(tab => tab.id === state.activeId) ?? null);

          // Tier 1: If no tabs left, create a new blank tab
          const finalTabs =
            remaining.length === 0
              ? [
                  {
                    id: `tab-${Date.now()}`,
                    title: 'New Tab',
                    url: 'about:blank',
                    appMode: useAppStore.getState().mode,
                    createdAt: Date.now(),
                    lastActiveAt: Date.now(),
                  } as Tab,
                ]
              : remaining;

          const finalActiveId =
            remaining.length === 0 ? finalTabs[0].id : nextActive ? nextActive.id : null;

          const newState = {
            tabs: finalTabs,
            activeId: finalActiveId,
          };

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
      getTabsForMode: (mode: string) => {
        const state = get();
        return state.tabs.filter(tab => !tab.appMode || tab.appMode === mode);
      },
      updateTab: (id: string, updates: Partial<Tab>) =>
        set(state => ({
          tabs: state.tabs.map(tab => (tab.id === id ? { ...tab, ...updates } : tab)),
        })),
      rememberClosedTab: (tab: Tab) =>
        set(state => {
          const entry: ClosedTab = {
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
      removeRecentlyClosed: (closedId: string) =>
        set(state => ({
          recentlyClosed: state.recentlyClosed.filter(entry => entry.closedId !== closedId),
        })),
      pushRecentlyClosed: (entry: ClosedTab) =>
        set(state => ({
          recentlyClosed: [
            entry,
            ...state.recentlyClosed.filter(item => item.closedId !== entry.closedId),
          ].slice(0, MAX_RECENTLY_CLOSED),
        })),
      clearRecentlyClosed: () => set({ recentlyClosed: [] }),
      pinTab: (id: string) => {
        set(state => {
          const tab = state.tabs.find(t => t.id === id);
          if (!tab) return state;
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
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[TabsStore] Failed to pin tab via IPC', error);
          }
        }
      },
      unpinTab: (id: string) => {
        set(state => {
          const tab = state.tabs.find(t => t.id === id);
          if (!tab) return state;
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
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[TabsStore] Failed to unpin tab via IPC', error);
          }
        }
      },
      togglePinTab: (id: string) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === id);
        if (!tab) return;
        if (tab.pinned) {
          get().unpinTab(id);
        } else {
          get().pinTab(id);
        }
      },
      createGroup: options => {
        const currentGroups = get().tabGroups;
        const group: TabGroup = {
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
      updateGroup: (id, updates) =>
        set(state => ({
          tabGroups: state.tabGroups.map(group =>
            group.id === id ? { ...group, ...updates } : group
          ),
        })),
      deleteGroup: id =>
        set(state => ({
          tabGroups: state.tabGroups.filter(group => group.id !== id),
          tabs: state.tabs.map(tab => (tab.groupId === id ? { ...tab, groupId: undefined } : tab)),
        })),
      toggleGroupCollapsed: id =>
        set(state => ({
          tabGroups: state.tabGroups.map(group =>
            group.id === id ? { ...group, collapsed: !group.collapsed } : group
          ),
        })),
      setGroupColor: (id, color) =>
        set(state => ({
          tabGroups: state.tabGroups.map(group => (group.id === id ? { ...group, color } : group)),
        })),
      assignTabToGroup: (tabId, groupId) =>
        set(state => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, groupId: groupId || undefined } : tab
          ),
        })),
      // Tier 1: History navigation
      navigateTab: (tabId, newUrl) =>
        set(state => {
          const tab = state.tabs.find(t => t.id === tabId);
          if (!tab) return state;

          const history = tab.history || [];
          const historyIndex = tab.historyIndex ?? history.length - 1;

          // If we're not at the end of history, truncate forward history
          const newHistory =
            historyIndex < history.length - 1 ? history.slice(0, historyIndex + 1) : history;

          // Add new entry
          const newEntry: TabHistoryEntry = {
            url: newUrl,
            title: tab.title,
            timestamp: Date.now(),
          };

          return {
            tabs: state.tabs.map(t =>
              t.id === tabId
                ? {
                    ...t,
                    url: newUrl,
                    history: [...newHistory, newEntry],
                    historyIndex: newHistory.length, // Points to the new entry
                  }
                : t
            ),
          };
        }),
      goBack: tabId =>
        set(state => {
          const tab = state.tabs.find(t => t.id === tabId);
          if (!tab || !tab.history || tab.historyIndex === undefined || tab.historyIndex <= 0) {
            return state;
          }

          const newIndex = tab.historyIndex - 1;
          const entry = tab.history[newIndex];

          return {
            tabs: state.tabs.map(t =>
              t.id === tabId
                ? {
                    ...t,
                    url: entry.url,
                    title: entry.title || t.title,
                    historyIndex: newIndex,
                  }
                : t
            ),
          };
        }),
      goForward: tabId =>
        set(state => {
          const tab = state.tabs.find(t => t.id === tabId);
          if (
            !tab ||
            !tab.history ||
            tab.historyIndex === undefined ||
            tab.historyIndex >= tab.history.length - 1
          ) {
            return state;
          }

          const newIndex = tab.historyIndex + 1;
          const entry = tab.history[newIndex];

          return {
            tabs: state.tabs.map(t =>
              t.id === tabId
                ? {
                    ...t,
                    url: entry.url,
                    title: entry.title || t.title,
                    historyIndex: newIndex,
                  }
                : t
            ),
          };
        }),
      canGoBack: tabId => {
        const tab = get().tabs.find(t => t.id === tabId);
        return tab?.historyIndex !== undefined && tab.historyIndex > 0;
      },
      canGoForward: tabId => {
        const tab = get().tabs.find(t => t.id === tabId);
        return (
          tab?.history !== undefined &&
          tab.historyIndex !== undefined &&
          tab.historyIndex < tab.history.length - 1
        );
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
    }),
    {
      name: 'regen:tabs-state',
      version: 1,
      partialize: state => ({
        tabs: state.tabs,
        activeId: state.activeId,
        recentlyClosed: state.recentlyClosed,
        tabGroups: state.tabGroups,
      }),
    }
  )
);
