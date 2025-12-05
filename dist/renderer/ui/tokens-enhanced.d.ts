/**
 * Enhanced Design Tokens
 * Loads from tokens.json and provides runtime access to all design tokens
 */
export type ThemeName = 'light' | 'dark';
export type ModeId = 'browse' | 'research' | 'trade' | 'dev';
export interface ColorTokens {
    primary: Record<string, string>;
    surface: Record<string, string>;
    text: Record<string, string>;
    accent: string;
    error: string;
    warning: string;
    success: string;
    info: string;
}
export interface SpacingTokens {
    [key: string]: string;
}
export interface FontSizeTokens {
    [key: string]: string;
}
export interface RadiusTokens {
    [key: string]: string;
}
export interface ShadowTokens {
    [key: string]: string;
}
export interface ThemeTokens {
    colors: ColorTokens;
    spacing: SpacingTokens;
    fontSize: FontSizeTokens;
    radius: RadiusTokens;
    shadow: ShadowTokens;
}
export interface ModeConfig {
    themeHints: {
        primary: string;
        accent: string;
    };
    tools: string[];
}
export interface Tokens {
    themes: {
        light: ThemeTokens;
        dark: ThemeTokens;
    };
    modes: Record<ModeId, ModeConfig>;
    animations: {
        duration: Record<string, string>;
        easing: Record<string, string>;
    };
    breakpoints: Record<string, string>;
}
export declare const tokens: Tokens;
/**
 * Get theme tokens for a specific theme
 */
export declare function getThemeTokens(theme: ThemeName): ThemeTokens;
/**
 * Get mode configuration
 */
export declare function getModeConfig(modeId: ModeId): ModeConfig;
/**
 * Get available modes
 */
export declare function getAvailableModes(): Array<{
    id: ModeId;
    config: ModeConfig;
}>;
/**
 * Get CSS variable name for a token
 */
export declare function getCSSVar(path: string[]): string;
/**
 * Get spacing value
 */
export declare function getSpacing(n: number | string): string;
/**
 * Get color value for current theme
 */
export declare function getColor(theme: ThemeName, category: string, shade?: string): string;
