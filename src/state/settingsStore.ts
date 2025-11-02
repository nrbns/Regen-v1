import { create } from 'zustand';

type SettingsState = {
  videoDownloadConsent: boolean;
  setConsent: (v: boolean) => void;
  searchEngine: 'google' | 'duckduckgo' | 'bing' | 'yahoo' | 'all';
  setSearchEngine: (e: SettingsState['searchEngine']) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  videoDownloadConsent: false,
  setConsent: (v) => set({ videoDownloadConsent: v }),
  searchEngine: 'google',
  setSearchEngine: (e) => set({ searchEngine: e })
}));


