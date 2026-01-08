import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tab {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;

  // Actions
  addTab: (url?: string) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  loadUrl: (tabId: string, url: string) => void;
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (url = '') => {
        const newTab: Tab = {
          id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url,
          title: url || 'New Tab',
          isLoading: false,
        };

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: state.tabs.length === 0 ? newTab.id : state.activeTabId,
        }));
      },

      closeTab: (tabId: string) => {
        set((state) => {
          const newTabs = state.tabs.filter(tab => tab.id !== tabId);
          let newActiveTabId = state.activeTabId;

          // If closing active tab, switch to another tab
          if (state.activeTabId === tabId) {
            const currentIndex = state.tabs.findIndex(tab => tab.id === tabId);
            if (newTabs.length > 0) {
              newActiveTabId = currentIndex > 0 ? newTabs[currentIndex - 1].id : newTabs[0].id;
            } else {
              newActiveTabId = null;
            }
          }

          return {
            tabs: newTabs,
            activeTabId: newActiveTabId,
          };
        });
      },

      switchTab: (tabId: string) => {
        set({ activeTabId: tabId });
      },

      updateTab: (tabId: string, updates: Partial<Tab>) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, ...updates } : tab
          ),
        }));
      },

      loadUrl: (tabId: string, url: string) => {
        get().updateTab(tabId, {
          url,
          title: url,
          isLoading: true,
        });

        // Simulate loading delay
        setTimeout(() => {
          get().updateTab(tabId, {
            title: url || 'New Tab',
            isLoading: false,
          });
        }, 1000);
      },
    }),
    {
      name: 'regen-tabs',
      partialize: (state) => ({
        tabs: state.tabs.map(tab => ({ ...tab, isLoading: false })), // Don't persist loading state
        activeTabId: state.activeTabId,
      }),
    }
  )
);