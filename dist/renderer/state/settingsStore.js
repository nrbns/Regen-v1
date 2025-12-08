import { create } from 'zustand';
import { persist } from 'zustand/middleware';
const createDefaults = () => ({
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
const dataKeys = [
    'general',
    'privacy',
    'appearance',
    'account',
    'videoDownloadConsent',
    'searchEngine',
];
export const useSettingsStore = create()(persist((set, _get) => ({
    ...createDefaults(),
    setConsent: value => set({ videoDownloadConsent: value }),
    setSearchEngine: searchEngine => set({ searchEngine }),
    setLanguage: language => set({ language }),
    updateGeneral: partial => set(state => ({ general: { ...state.general, ...partial } })),
    updatePrivacy: partial => set(state => ({ privacy: { ...state.privacy, ...partial } })),
    updateAppearance: partial => set(state => ({ appearance: { ...state.appearance, ...partial } })),
    updateAccount: partial => set(state => ({ account: { ...state.account, ...partial } })),
    resetSettings: () => {
        const defaults = createDefaults();
        set(() => defaults);
    },
}), {
    name: 'regen:settings-v1',
    version: 1,
    partialize: state => {
        const persisted = {};
        for (const key of dataKeys) {
            // @ts-ignore - dynamic assignment
            persisted[key] = state[key];
        }
        return persisted;
    },
    merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
    }),
}));
