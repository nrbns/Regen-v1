import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// FIX: Global navigation confirmation listener (backend-owned navigation)
if (typeof window !== 'undefined') {
  window.addEventListener('regen:navigate:confirmed', ((e: CustomEvent<{ url: string; tabId?: string; success: boolean; title?: string }>) => {
    const { url, tabId, success, title } = e.detail;
    if (!success || !url) return;

    // Backend confirmed navigation - update tab through tabsStore
    // Import here to avoid circular dependency
    import('./tabsStore').then(({ useTabsStore }) => {
      const state = useTabsStore.getState();
      const targetTabId = tabId || state.activeTabId;
      
      if (targetTabId) {
        state.navigateTab(targetTabId, url);
        if (title) {
          state.updateTab(targetTabId, { title });
        }
      }
    }).catch((error) => {
      console.error('[TabsStore] Failed to handle navigation confirmation:', error);
    });
  }) as EventListener);
}

export interface Tab {
  id: string;
  url: string;
  title: string;
  isLoading?: boolean;
  pinned?: boolean;
  lastActiveAt?: number;
  createdAt?: number;
  active?: boolean;
  history?: string[];
  historyIndex?: number;
  groupId?: string;
}

// Initialize navigation handler on module load (if in browser)
if (typeof window !== 'undefined') {
  import('../lib/navigation/NavigationHandler').then(({ initNavigationHandler }) => {
    initNavigationHandler();
  }).catch(() => {
    // Navigation handler not available - will initialize later
  });
}

interface RecentlyClosedEntry {
  closedId: string;
  tab: Tab;
  closedAt: number;
}

interface TabGroup {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  activeId: string | null;
  recentlyClosed: RecentlyClosedEntry[];
  tabGroups: TabGroup[];

  // Actions (legacy + test-focused)
  addTab: (url?: string) => void;
  add: (tab: Tab) => void;
  closeTab: (tabId: string) => void;
  remove: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  setActive: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  // FIX: loadUrl is deprecated - use backend navigation events instead
  // This method is kept for backward compatibility but should not be called directly
  loadUrl: (tabId: string, url: string) => void;
  navigateTab: (tabId: string, url: string) => void; // Backend-owned navigation
  goBack: (tabId: string) => void;
  goForward: (tabId: string) => void;
  canGoBack: (tabId: string) => boolean;
  canGoForward: (tabId: string) => boolean;
  rememberClosedTab: (tab: Tab) => void;
  popRecentlyClosed: () => RecentlyClosedEntry | undefined;
  createGroup: (group: { name: string; color?: string }) => TabGroup;
  assignTabToGroup: (tabId: string, groupId: string) => void;
  
  // NEW: Navigation methods that listen to backend events
  onNavigationConfirmed: (tabId: string, url: string, title?: string) => void;
}

const MAX_TABS = 15;

const withHistory = (tab: Tab): Tab => {
  const initialUrl = tab.url || '';
  return {
    history: [initialUrl],
    historyIndex: 0,
    isLoading: false,
    ...tab,
    title: tab.title || initialUrl || 'New Tab',
  };
};

const setActiveFlags = (tabs: Tab[], activeId: string | null) =>
  tabs.map(tab => ({ ...tab, active: tab.id === activeId }));

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => {
      return {
        tabs: [],
        activeTabId: null,
        activeId: null,
        recentlyClosed: [],
        tabGroups: [],

      addTab: (url = '') => {
        const baseTab: Tab = {
          id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url,
          title: url || 'New Tab',
        };
        get().add(baseTab);
      },

      add: (tab: Tab) => {
        set((state) => {
          if (state.tabs.length >= MAX_TABS) {
            return state;
          }
          const normalized = withHistory(tab);
          const tabs = setActiveFlags([...state.tabs, normalized], normalized.id);
          const activeId = normalized.id;
          const activeTabId = normalized.id;

          if (typeof window !== 'undefined') {
            import('../core/events/eventBus').then(({ regenEventBus }) => {
              regenEventBus.emit({
                type: 'TAB_OPEN',
                payload: { tabId: normalized.id, url: normalized.url },
              });
            }).catch(() => {});
          }

          return { tabs, activeId, activeTabId };
        });
      },

      closeTab: (tabId: string) => {
        get().remove(tabId);
      },

      remove: (tabId: string) => {
        set((state) => {
          const tabToClose = state.tabs.find(tab => tab.id === tabId);
          if (!tabToClose || tabToClose.pinned) return state;

          const newTabs = state.tabs.filter(tab => tab.id !== tabId);
          let newActiveId = state.activeId;

          if (state.activeId === tabId) {
            const currentIndex = state.tabs.findIndex(tab => tab.id === tabId);
            if (newTabs.length > 0) {
              newActiveId = currentIndex > 0 ? newTabs[currentIndex - 1].id : newTabs[0].id;
            } else {
              newActiveId = null;
            }
          }

          if (typeof window !== 'undefined') {
            import('../core/events/eventBus').then(({ regenEventBus }) => {
              regenEventBus.emit({
                type: 'TAB_CLOSE',
                payload: { tabId },
              });
            }).catch(() => {});
          }

          return {
            tabs: setActiveFlags(newTabs, newActiveId),
            activeId: newActiveId,
            activeTabId: newActiveId,
          };
        });
      },

      switchTab: (tabId: string) => {
        get().setActive(tabId);
      },

      setActive: (tabId: string) => {
        set((state) => ({
          activeId: tabId,
          activeTabId: tabId,
          tabs: setActiveFlags(state.tabs, tabId),
        }));
      },

      updateTab: (tabId: string, updates: Partial<Tab>) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, ...updates } : tab
          ),
        }));
      },

      loadUrl: (tabId: string, url: string) => {
        console.warn('[TabsStore] loadUrl called directly. Use CommandController.handleNavigate() instead.');
        get().navigateTab(tabId, url);
      },

      navigateTab: (tabId: string, url: string) => {
        set((state) => {
          const tab = state.tabs.find(t => t.id === tabId);
          if (!tab) return state;

          const history = tab.history ? [...tab.history] : [tab.url || ''];
          const historyIndex = tab.historyIndex ?? history.length - 1;

          // drop forward history if not at end
          const trimmed = history.slice(0, historyIndex + 1);
          trimmed.push(url);

          const nextIndex = trimmed.length - 1;
          const updatedTab: Tab = {
            ...tab,
            url,
            title: url || tab.title || 'New Tab',
            history: trimmed,
            historyIndex: nextIndex,
            lastActiveAt: Date.now(),
          };

          return {
            ...state,
            tabs: state.tabs.map(t => (t.id === tabId ? updatedTab : t)),
          };
        });
      },

      goBack: (tabId: string) => {
        set((state) => {
          const tab = state.tabs.find(t => t.id === tabId);
          if (!tab || !tab.history) return state;
          const historyIndex = tab.historyIndex ?? tab.history.length - 1;
          if (historyIndex <= 0) return state;
          const nextIndex = historyIndex - 1;
          const url = tab.history[nextIndex] ?? tab.url;
          const updated: Tab = { ...tab, historyIndex: nextIndex, url, title: url || tab.title };
          return {
            ...state,
            tabs: state.tabs.map(t => (t.id === tabId ? updated : t)),
          };
        });
      },

      goForward: (tabId: string) => {
        set((state) => {
          const tab = state.tabs.find(t => t.id === tabId);
          if (!tab || !tab.history) return state;
          const historyIndex = tab.historyIndex ?? tab.history.length - 1;
          if (historyIndex >= tab.history.length - 1) return state;
          const nextIndex = historyIndex + 1;
          const url = tab.history[nextIndex] ?? tab.url;
          const updated: Tab = { ...tab, historyIndex: nextIndex, url, title: url || tab.title };
          return {
            ...state,
            tabs: state.tabs.map(t => (t.id === tabId ? updated : t)),
          };
        });
      },

      canGoBack: (tabId: string) => {
        const tab = get().tabs.find(t => t.id === tabId);
        if (!tab || !tab.history) return false;
        const historyIndex = tab.historyIndex ?? tab.history.length - 1;
        return historyIndex > 0;
      },

      canGoForward: (tabId: string) => {
        const tab = get().tabs.find(t => t.id === tabId);
        if (!tab || !tab.history) return false;
        const historyIndex = tab.historyIndex ?? tab.history.length - 1;
        return historyIndex < tab.history.length - 1;
      },

      rememberClosedTab: (tab: Tab) => {
        set((state) => ({
          recentlyClosed: [...state.recentlyClosed, { closedId: tab.id, tab, closedAt: Date.now() }],
        }));
      },

      popRecentlyClosed: () => {
        const state = get();
        const clone = [...state.recentlyClosed];
        const last = clone.pop();
        set({ recentlyClosed: clone });
        return last;
      },

      createGroup: ({ name, color }) => {
        const group: TabGroup = {
          id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          color,
          createdAt: Date.now(),
        };
        set((state) => ({ tabGroups: [...state.tabGroups, group] }));
        return group;
      },

      assignTabToGroup: (tabId: string, groupId: string) => {
        set((state) => ({
          tabs: state.tabs.map(tab => (tab.id === tabId ? { ...tab, groupId } : tab)),
        }));
      },

      // NEW: Called by backend when navigation is confirmed
      onNavigationConfirmed: (tabId: string, url: string, title?: string) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, url, title: title || url, isLoading: false }
              : tab
          ),
        }));
      },
    };
    },
    {
      name: 'regen-tabs',
      partialize: (state) => ({
        tabs: state.tabs.map(tab => ({ ...tab, isLoading: false })), // Don't persist loading state
        activeTabId: state.activeTabId,
        activeId: state.activeId,
        recentlyClosed: state.recentlyClosed,
        tabGroups: state.tabGroups,
      }),
    }
  )
);