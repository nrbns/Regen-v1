import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState } from './appStore';
import { isTauriRuntime } from '../lib/env';

type SearchEngine =
  | 'google'
  | 'duckduckgo'
  | 'bing'
  | 'yahoo'
  | 'startpage'
  | 'ecosia'
  | 'all'
  | 'mock';

type GeneralSettings = {
  defaultMode: AppState['mode'];
  startupBehavior: 'newTab' | 'restore';
  telemetryOptIn: boolean;
  showKeyboardHints: boolean;
  allowBetaUpdates: boolean;
  disableAutoActions?: boolean; // Toggle predictive actions
  voiceEditBeforeExecute?: boolean; // Phase 1, Day 5: Edit voice commands before executing
  voiceTTSEnabled?: boolean; // Phase 2, Day 4: Enable text-to-speech responses
  voiceAutoDetectLanguage?: boolean; // Phase 2, Day 4: Auto-detect language for voice
  hasSeenOnboardingTour?: boolean; // AUDIT FIX #6: Track if user has seen onboarding tour
  lowDataMode?: boolean; // SPRINT 0: Low-data mode (disable images, reduce quality, limit bandwidth)
  lowRamMode?: boolean; // Phase A: Low-RAM mode (disable animations, reduce features for low-end devices)
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
  // SPRINT 2: Layout preferences
  layoutModeOverride?: 'auto' | 'full' | 'compact' | 'minimal'; // 'auto' = use network detection, others override
  verticalTabsOverride?: boolean | null; // null = auto, true/false = override
  compactTabsOverride?: boolean | null; // null = auto, true/false = override
  hideSidebarsOverride?: boolean | null; // null = auto, true/false = override
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
  setLanguage: (language: string) => Promise<void>;
  updateGeneral: (partial: Partial<GeneralSettings>) => void;
  updatePrivacy: (partial: Partial<PrivacySettings>) => void;
  updateAppearance: (partial: Partial<AppearanceSettings>) => void;
  updateAccount: (partial: Partial<AccountSettings>) => void;
  resetSettings: () => void;
  hasSeenOnboardingTour: () => boolean; // AUDIT FIX #6: Check if tour was seen
  setHasSeenOnboardingTour: (seen: boolean) => void; // AUDIT FIX #6: Mark tour as seen
};

const createDefaults = (): SettingsData => ({
  general: {
    defaultMode: 'Browse',
    startupBehavior: 'newTab',
    telemetryOptIn: false,
    showKeyboardHints: true,
    allowBetaUpdates: false,
    disableAutoActions: false,
    voiceEditBeforeExecute: true, // Phase 1, Day 5: Default to enabled
    voiceTTSEnabled: true, // Phase 2, Day 4: Default to enabled
    voiceAutoDetectLanguage: true, // Phase 2, Day 4: Default to enabled
    lowDataMode: false, // SPRINT 0: Default to disabled
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
    // SPRINT 2: Layout preferences default to 'auto' (network-based)
    layoutModeOverride: 'auto',
    verticalTabsOverride: null,
    compactTabsOverride: null,
    hideSidebarsOverride: null,
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
  searchEngine: 'startpage', // Default: Startpage (iframe-friendly and privacy-focused)
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
    (set, get) => ({
      ...createDefaults(),
      setConsent: value => set({ videoDownloadConsent: value }),
      setSearchEngine: searchEngine => set({ searchEngine }),
      setLanguage: async language => {
        // ARCHITECTURE: Rust owns state, Zustand is cache
        // Call Rust command first (source of truth)
        if (isTauriRuntime()) {
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('settings:set_language', { language });

            // After Rust updates language, sync Zustand cache
            // This will be handled by useSettingsSync hook
            return;
          } catch (error) {
            console.error('[settingsStore] Failed to set language in Rust:', error);
            // ARCHITECTURE: Fail gracefully, don't create fake state
            // In Tauri mode, Rust is source of truth - if it fails, we fail
            throw error; // Re-throw to let caller handle
          }
        }

        // ARCHITECTURE: Only allow fallback in non-Tauri environments (browser mode)
        // In Tauri mode, Rust must succeed or we fail
        if (!isTauriRuntime()) {
          // Fallback: Local state (for non-Tauri environments only)
          set({ language });
        } else {
          // In Tauri mode, if we reach here, Rust failed and we should not continue
          throw new Error('Failed to set language: Rust backend unavailable');
        }
      },
      updateGeneral: partial => set(state => ({ general: { ...state.general, ...partial } })),
      updatePrivacy: partial => set(state => ({ privacy: { ...state.privacy, ...partial } })),
      updateAppearance: partial =>
        set(state => ({ appearance: { ...state.appearance, ...partial } })),
      updateAccount: partial => set(state => ({ account: { ...state.account, ...partial } })),
      resetSettings: () => {
        const defaults = createDefaults();
        set(() => defaults);
      },
      hasSeenOnboardingTour: (): boolean => {
        const state = get();
        return state.general.hasSeenOnboardingTour ?? false;
      },
      setHasSeenOnboardingTour: (seen: boolean) => {
        set(state => ({
          general: { ...state.general, hasSeenOnboardingTour: seen },
        }));
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
