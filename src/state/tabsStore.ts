import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ipc } from '../lib/ipc-typed';
import { debouncedSaveSession } from '../services/session';
import { useAppStore } from './appStore';
import { createIndexedDBStorage, isIndexedDBAvailable } from '../lib/storage/indexedDBStorage';
import { isTauriRuntime } from '../lib/env';
import { eventBus, EVENTS } from '../core/state/eventBus';

export const TAB_GROUP_COLORS = ['#6366f1', '#8b5cf6', '#14b8a6', '#0ea5e9', '#f97316', '#facc15'];

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
  favicon?: string;
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
  add: (t: Tab) => Promise<void>;
  setActive: (id: string | null) => void;
  setAll: (tabs: Tab[]) => void;
  remove: (id: string) => Promise<void>;
  getTabsForMode: (mode: string) => Tab[];
  updateTab: (id: string, updates: Partial<Tab>) => Promise<void>;
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
  getMaxTabs: () => Promise<number>;
};

const MAX_RECENTLY_CLOSED = 12;
const DEFAULT_MAX_TABS = 15; // Tier 1: Limit tabs for MVP (overridden by Redix low-RAM mode)

// Derive max tabs dynamically based on low-RAM mode (Rust-controlled) or Redix mode
const resolveMaxTabs = async (): Promise<number> => {
  // ARCHITECTURE: Rust owns state, check Rust first
  if (isTauriRuntime()) {
    try {
      // Use a runtime-generated import path to avoid Vite static analysis
      const mod = await globalThis['import']('@tauri-apps/api/core');
      if (mod && typeof mod.invoke === 'function') {
        const maxTabs = await mod.invoke('system:get_max_tabs');
        return maxTabs;
      }
    } catch (error) {
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'test') {
        console.error('[tabsStore] Failed to get max tabs from Rust:', error);
      }
    }
  }

  // Fallback: Check Redix mode (legacy)
  try {
    // Lazy import to avoid breaking SSR/build if env differs
    const { getRedixConfig } = require('../lib/redix-mode');
    const cfg = getRedixConfig();
    return cfg?.enabled
      ? Math.min(cfg.maxTabs ?? DEFAULT_MAX_TABS, DEFAULT_MAX_TABS)
      : DEFAULT_MAX_TABS;
  } catch {
    return DEFAULT_MAX_TABS;
  }
};

// Synchronous version for immediate checks (uses cached value or default)
const resolveMaxTabsSync = (): number => {
  // For immediate checks, use default (async will update)
  return DEFAULT_MAX_TABS;
};

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeId: null,
      recentlyClosed: [],
      tabGroups: [],
      add: async tab => {
        // ARCHITECTURE: Rust owns state, Zustand is cache
        // Call Rust command first (source of truth)
        if (isTauriRuntime()) {
          try {
            const mod = await globalThis['import']('@tauri-apps/api/core');
            const _tabId = await mod.invoke('tabs:create', {
              url: tab.url || 'about:blank',
              privacyMode: tab.mode || 'normal',
              appMode: tab.appMode || 'Browse',
            });
            // After Rust creates tab, sync Zustand cache
            // This will be handled by useTabsSync hook
            return;
          } catch (error: any) {
            console.error('[tabsStore] Failed to create tab in Rust:', error);
            // If error contains tab limit message, show user-friendly message
            const errorMessage = error?.message || error?.toString() || 'Unknown error';
            if (errorMessage.includes('Tab limit reached') || errorMessage.includes('max')) {
              // Import toast dynamically to avoid circular dependencies
              import('../utils/toast').then(({ toast }) => {
                toast.error(errorMessage);
              });
            }
            // ARCHITECTURE: Fail gracefully, don't create fake state
            // In Tauri mode, Rust is source of truth - if it fails, we fail
            throw error; // Re-throw to let caller handle
          }
        }

        // ARCHITECTURE: Only allow fallback in non-Tauri environments (browser mode)
        // In Tauri mode, Rust must succeed or we fail
        if (!isTauriRuntime()) {
          set(state => {
            // Tier 1: Check tab limit (low-RAM aware)
            // Use sync version for immediate check (async will update)
            const maxTabs = resolveMaxTabsSync();
            if (state.tabs.length >= maxTabs) {
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
            // Emit event for tab opened
            eventBus.emit(EVENTS.TAB_OPENED, tab);
            return newState;
          });
        }
        eventBus.emit('tab:add', tab);
      },
      setActive: async id => {
        // ARCHITECTURE: Rust owns state, Zustand is cache
        // Call Rust command first (source of truth)
        if (isTauriRuntime() && id) {
          try {
            const mod = await globalThis['import']('@tauri-apps/api/core');
            await mod.invoke('tabs:set_active', { id });
            // After Rust sets active tab, sync Zustand cache
            // This will be handled by useTabsSync hook
            return;
          } catch (error) {
            console.error('[tabsStore] Failed to set active tab in Rust:', error);
            // Fall through to local fallback if Rust fails
          }
        }

        // Fallback: Local state (for non-Tauri environments)
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
              } else {
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

          // Emit event for tab activated
          const activeTab = newState.tabs.find(tab => tab.id === id);
          if (activeTab) {
            eventBus.emit(EVENTS.TAB_ACTIVATED, activeTab);
          }

          return newState;
        });
      },
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
      remove: async id => {
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
                    url: 'https://www.google.com', // Real homepage instead of blank
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

          // Emit event for tab closed
          eventBus.emit(EVENTS.TAB_CLOSED, { tabId: id });

          return newState;
        });
      },
      getTabsForMode: (mode: string) => {
        const state = get();
        return state.tabs.filter(tab => !tab.appMode || tab.appMode === mode);
      },
      updateTab: async (id: string, updates: Partial<Tab>) => {
        // ARCHITECTURE: Rust owns state, Zustand is cache
        // Call Rust command first (source of truth)
        if (isTauriRuntime()) {
          try {
            const mod = await globalThis['import']('@tauri-apps/api/core');
            await mod.invoke('tabs:update', {
              id,
              url: updates.url,
              title: updates.title,
              favicon: updates.favicon,
            });
            // After Rust updates tab, sync Zustand cache
            // This will be handled by useTabsSync hook
            return;
          } catch (error) {
            console.error('[tabsStore] Failed to update tab in Rust:', error);
            // Fall through to local fallback if Rust fails
          }
        }

        // Fallback: Local state (for non-Tauri environments)
        set(state => {
          const updatedTabs = state.tabs.map(tab => (tab.id === id ? { ...tab, ...updates } : tab));
          const updatedTab = updatedTabs.find(t => t.id === id);
          // Emit event for tab updated
          if (updatedTab) {
            eventBus.emit('tab:updated', updatedTab);
          }
          // Re-index updated tab in MeiliSearch
          if (updatedTab) {
            import('../services/meiliIndexer').then(({ indexTab }) => {
              indexTab(updatedTab).catch(console.error);
            });
          }
          return { tabs: updatedTabs };
        });
      },
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

          // Phase 1, Day 1: Improved navigation history tracking
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
          const newHistory =
            historyIndex < history.length - 1 ? history.slice(0, historyIndex + 1) : history;

          // Add new entry
          const newEntry: TabHistoryEntry = {
            url: newUrl,
            title: tab.title,
            timestamp: Date.now(),
          };

          const updatedTabs = state.tabs.map(t =>
            t.id === tabId
              ? {
                  ...t,
                  url: newUrl,
                  history: [...newHistory, newEntry],
                  historyIndex: newHistory.length, // Points to the new entry
                }
              : t
          );

          // Auto-save session after navigation
          const appMode = useAppStore.getState().mode;
          debouncedSaveSession({
            tabs: updatedTabs,
            activeTabId: state.activeId,
            mode: appMode,
            savedAt: Date.now(),
          });

          return { tabs: updatedTabs };
        }),
      goBack: tabId =>
        set(state => {
          const tab = state.tabs.find(t => t.id === tabId);
          if (!tab || !tab.history || tab.historyIndex === undefined || tab.historyIndex <= 0) {
            return state;
          }

          const newIndex = tab.historyIndex - 1;
          const entry = tab.history[newIndex];

          const updatedTabs = state.tabs.map(t =>
            t.id === tabId
              ? {
                  ...t,
                  url: entry.url,
                  title: entry.title || t.title,
                  historyIndex: newIndex,
                }
              : t
          );

          // Phase 1, Day 1: Auto-save session after navigation
          const appMode = useAppStore.getState().mode;
          debouncedSaveSession({
            tabs: updatedTabs,
            activeTabId: state.activeId,
            mode: appMode,
            savedAt: Date.now(),
          });

          return { tabs: updatedTabs };
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

          const updatedTabs = state.tabs.map(t =>
            t.id === tabId
              ? {
                  ...t,
                  url: entry.url,
                  title: entry.title || t.title,
                  historyIndex: newIndex,
                }
              : t
          );

          // Phase 1, Day 1: Auto-save session after navigation
          const appMode = useAppStore.getState().mode;
          debouncedSaveSession({
            tabs: updatedTabs,
            activeTabId: state.activeId,
            mode: appMode,
            savedAt: Date.now(),
          });

          return { tabs: updatedTabs };
        }),
      canGoBack: tabId => {
        const tab = get().tabs.find(t => t.id === tabId);
        if (!tab || !tab.history || tab.history.length === 0) return false;
        const historyIndex = tab.historyIndex ?? tab.history.length - 1;
        return historyIndex > 0;
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
        // Use sync version for immediate checks (may not reflect low-RAM mode immediately)
        // For accurate checks, use async resolveMaxTabs
        return get().tabs.length < resolveMaxTabsSync();
      },
      getTabCount: () => {
        return get().tabs.length;
      },
      getMaxTabs: async () => {
        return await resolveMaxTabs();
      },
    }),
    {
      name: 'regen:tabs-state',
      version: 1,
      // WEEK 1 TASK 4: Use IndexedDB for better performance and capacity
      storage: createJSONStorage(
        () =>
          isIndexedDBAvailable()
            ? createIndexedDBStorage('regen-tabs-storage', 'tabs-state')
            : localStorage // Fallback to localStorage if IndexedDB unavailable
      ),
      partialize: state => ({
        tabs: state.tabs,
        activeId: state.activeId,
        recentlyClosed: state.recentlyClosed,
        tabGroups: state.tabGroups,
      }),
      // WEEK 1 TASK 4: Handle migration and errors gracefully
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[TabsStore] Rehydration error:', error);
          // Optionally reset to default state on error
          // return { tabs: [], activeId: null, recentlyClosed: [], tabGroups: [] };
        } else if (state) {
          console.log('[TabsStore] Rehydrated', {
            tabCount: state.tabs.length,
            activeId: state.activeId,
          });
        }
      },
    }
  )
);

// EventBus subscriber: update Zustand state in response to tab events
eventBus.on('tab:add', tab => {
  useTabsStore.setState(state => {
    const maxTabs = resolveMaxTabsSync();
    if (state.tabs.length >= maxTabs) return state;
    return {
      ...state,
      tabs: [...state.tabs, { ...tab, createdAt: tab.createdAt ?? Date.now() }],
      activeId: tab.id,
    };
  });
});

eventBus.on('tab:setActive', id => {
  useTabsStore.setState(state => {
    if (id === state.activeId) return state;
    return {
      ...state,
      activeId: id,
      tabs: state.tabs.map(tab => ({
        ...tab,
        active: tab.id === id,
        lastActiveAt: tab.id === id ? Date.now() : tab.lastActiveAt,
      })),
    };
  });
});

eventBus.on('tab:setAll', tabs => {
  useTabsStore.setState(state => {
    const previousTabs = state.tabs;
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
      ...state,
      tabs: sorted,
      activeId: activeCandidate ? activeCandidate.id : null,
    };
  });
});

eventBus.on('tab:remove', id => {
  useTabsStore.setState(state => {
    const tabToRemove = state.tabs.find(t => t.id === id);
    if (tabToRemove?.pinned) return state;
    const remaining = state.tabs.filter(tab => tab.id !== id);
    const nextActive =
      state.activeId === id
        ? (remaining.find(tab => tab.appMode === state.tabs.find(t => t.id === id)?.appMode) ??
          remaining[0] ??
          null)
        : (state.tabs.find(tab => tab.id === state.activeId) ?? null);
    // If no tabs left, create a new blank tab
    const finalTabs =
      remaining.length === 0
        ? [{ id: `tab-${Date.now()}`, title: 'New Tab', createdAt: Date.now(), active: true }]
        : remaining;
    return {
      ...state,
      tabs: finalTabs,
      activeId: nextActive ? nextActive.id : (finalTabs[0]?.id ?? null),
    };
  });
});
