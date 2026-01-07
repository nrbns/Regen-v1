/**
 * SPRINT 0: Tab loading state store
 * Tracks loading state and progress for tabs to connect TabContentSurface → EnhancedURLBar
 */

import { create } from 'zustand';

interface TabLoadingState {
  [tabId: string]: {
    isLoading: boolean;
    progress?: number; // 0-100
  };
}

interface TabLoadingStore {
  loadingStates: TabLoadingState;
  setLoading: (tabId: string, isLoading: boolean, progress?: number) => void;
  getLoading: (tabId: string | null) => { isLoading: boolean; progress?: number };
  clearLoading: (tabId: string) => void;
}

export const useTabLoadingStore = create<TabLoadingStore>((set, get) => ({
  loadingStates: {},

  setLoading: (tabId: string, isLoading: boolean, progress?: number) => {
    set(state => ({
      loadingStates: {
        ...state.loadingStates,
        [tabId]: {
          isLoading,
          progress: progress !== undefined ? Math.max(0, Math.min(100, progress)) : undefined,
        },
      },
    }));

    // Clear loading state after 300ms when loading completes
    if (!isLoading) {
      setTimeout(() => {
        get().clearLoading(tabId);
      }, 300);
    }
  },

  getLoading: (tabId: string | null) => {
    if (!tabId) {
      return { isLoading: false };
    }
    return get().loadingStates[tabId] || { isLoading: false };
  },

  clearLoading: (tabId: string) => {
    set(state => {
      const newStates = { ...state.loadingStates };
      delete newStates[tabId];
      return { loadingStates: newStates };
    });
  },
}));
