import type { AppState } from './appStore';
type SearchEngine = 'google' | 'duckduckgo' | 'bing' | 'yahoo' | 'all' | 'mock';
type GeneralSettings = {
    defaultMode: AppState['mode'];
    startupBehavior: 'newTab' | 'restore';
    telemetryOptIn: boolean;
    showKeyboardHints: boolean;
    allowBetaUpdates: boolean;
    voiceEditBeforeExecute?: boolean;
    voiceTTSEnabled?: boolean;
    voiceAutoDetectLanguage?: boolean;
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
    chromeNewTabPage?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
    smoothScrolling?: boolean;
    reducedMotion?: boolean;
};
type AccountSettings = {
    displayName: string;
    email: string;
    workspace: string;
    avatarUrl?: string;
    avatarColor?: string;
    lastSyncedAt?: number;
};
export type SettingsData = {
    general: GeneralSettings;
    privacy: PrivacySettings;
    appearance: AppearanceSettings;
    account: AccountSettings;
    videoDownloadConsent: boolean;
    searchEngine: SearchEngine;
    language?: string;
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
export declare const useSettingsStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<SettingsState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<SettingsState, Partial<SettingsData>>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: SettingsState) => void) => () => void;
        onFinishHydration: (fn: (state: SettingsState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<SettingsState, Partial<SettingsData>>>;
    };
}>;
export {};
