import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState } from './appStore';

type SearchEngine = 'google' | 'duckduckgo' | 'bing' | 'yahoo' | 'all' | 'mock';

type GeneralSettings = {
  defaultMode: AppState['mode'];
  startupBehavior: 'newTab' | 'restore';
  telemetryOptIn: boolean;
  showKeyboardHints: boolean;
  allowBetaUpdates: boolean;
  voiceEditBeforeExecute?: boolean; // Phase 1, Day 5: Edit voice commands before executing
  voiceTTSEnabled?: boolean; // Phase 2, Day 4: Enable text-to-speech responses
  voiceAutoDetectLanguage?: boolean; // Phase 2, Day 4: Auto-detect language for voice
};

type PrivacySettings = {
  localOnlyMode: boolean;
  doNotTrack: boolean;
  clearOnExit: boolean;
  blockThirdPartyCookies: boolean;
  safeBrowsing: boolean;
  trackerProtection: boolean;
  adBlockEnabled: boolean;
  malwareProtection: boolean;
  autoUpdateFilters: boolean;
};

type AppearanceSettings = {
  theme: 'light' | 'dark' | 'system';
  compactUI: boolean;
  showTabNumbers: boolean;
  accent: 'blue' | 'purple' | 'emerald';
  chromeNewTabPage?: boolean; // Enable Chrome-style new tab page
  fontSize?: 'small' | 'medium' | 'large';
  smoothScrolling?: boolean;
  reducedMotion?: boolean;
};

type AccountSettings = {
  displayName: string;
  email: string;
  workspace: string;
  avatarUrl?: string;
  avatarColor?: string; // Tier 2: Avatar color for profile
  lastSyncedAt?: number;
};

export type SettingsData = {
  general: GeneralSettings;
  privacy: PrivacySettings;
  appearance: AppearanceSettings;
  account: AccountSettings;
  videoDownloadConsent: boolean;
  searchEngine: SearchEngine;
  language?: string; // Language code (e.g., 'hi', 'en', 'auto')
};

type SettingsState = SettingsData & {
  setConsent: (value: boolean) => void;
  setSearchEngine: (engine: SearchEngine) => void;
  setLanguage: (language: string) => void;
  updateGeneral: (partial: Partial<GeneralSettings>) => void;
  updatePrivacy: (partial: Partial<PrivacySettings>) => void;
  updateAppearance: (partial: Partial<AppearanceSettings>) => void;
  updateAccount: (partial: Partial<AccountSettings>) => void;
  resetSettings: () => void;
};

const createDefaults = (): SettingsData => ({
  general: {
    defaultMode: 'Browse',
    startupBehavior: 'newTab',
    telemetryOptIn: false,
    showKeyboardHints: true,
    allowBetaUpdates: false,
    voiceEditBeforeExecute: true, // Phase 1, Day 5: Default to enabled
    voiceTTSEnabled: true, // Phase 2, Day 4: Default to enabled
    voiceAutoDetectLanguage: true, // Phase 2, Day 4: Default to enabled
  },
  privacy: {
    localOnlyMode: false,
    doNotTrack: true,
    clearOnExit: false,
    blockThirdPartyCookies: true,
    safeBrowsing: true,
    trackerProtection: true,
    adBlockEnabled: true,
    malwareProtection: true,
    autoUpdateFilters: true,
  },
  appearance: {
    theme: 'dark',
    compactUI: false,
    showTabNumbers: true,
    accent: 'purple',
    chromeNewTabPage: true, // Chrome-style new tab page is now the default UI
    fontSize: 'medium',
    smoothScrolling: true,
    reducedMotion: false,
  },
  account: {
    displayName: 'Explorer',
    email: 'you@regen.app',
    workspace: 'Personal',
    avatarUrl: undefined,
    avatarColor: '#8b5cf6', // Default purple
    lastSyncedAt: Date.now(),
  },
  videoDownloadConsent: false,
  searchEngine: 'duckduckgo',
  language: 'auto',
});

const dataKeys: Array<keyof SettingsData> = [
  'general',
  'privacy',
  'appearance',
  'account',
  'videoDownloadConsent',
  'searchEngine',
];

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, _get) => ({
      ...createDefaults(),
      setConsent: value => set({ videoDownloadConsent: value }),
      setSearchEngine: searchEngine => set({ searchEngine }),
      setLanguage: language => set({ language }),
      updateGeneral: partial => set(state => ({ general: { ...state.general, ...partial } })),
      updatePrivacy: partial => set(state => ({ privacy: { ...state.privacy, ...partial } })),
      updateAppearance: partial =>
        set(state => ({ appearance: { ...state.appearance, ...partial } })),
      updateAccount: partial => set(state => ({ account: { ...state.account, ...partial } })),
      resetSettings: () => {
        const defaults = createDefaults();
        set(() => defaults);
      },
    }),
    {
      name: 'regen:settings-v1',
      version: 1,
      partialize: state => {
        const persisted: Partial<SettingsData> = {};
        for (const key of dataKeys) {
          // @ts-ignore - dynamic assignment
          persisted[key] = state[key];
        }
        return persisted;
      },
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<SettingsData>),
      }),
    }
  )
);
