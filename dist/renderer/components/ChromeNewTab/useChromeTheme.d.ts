/**
 * useChromeTheme - Hook for managing Chrome new tab themes and backgrounds
 */
interface ChromeTheme {
    backgroundImage?: string;
    themeColor?: string;
    name?: string;
}
export declare const CHROME_THEMES: ChromeTheme[];
export declare function useChromeTheme(): {
    backgroundImage: string | undefined;
    themeColor: string | undefined;
    themeName: string | undefined;
    setTheme: (newTheme: ChromeTheme) => void;
    setThemeById: (themeId: string) => void;
    availableThemes: ChromeTheme[];
};
export {};
