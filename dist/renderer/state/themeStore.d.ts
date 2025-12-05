type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';
interface ThemeState {
    preference: ThemePreference;
    resolved: ResolvedTheme;
    setPreference: (preference: ThemePreference) => void;
    cyclePreference: () => void;
}
export declare const useThemeStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ThemeState>>;
export {};
