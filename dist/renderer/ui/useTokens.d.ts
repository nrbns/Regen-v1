/**
 * useTokens Hook
 * Provides runtime access to design tokens
 */
export interface Tokens {
    spacing: {
        (n: number): string;
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
    };
    fontSize: {
        xs: string;
        sm: string;
        base: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
        '5xl': string;
    };
    color: {
        primary: string;
        primaryHover: string;
        primaryActive: string;
        surface: string;
        surfaceHover: string;
        surfaceActive: string;
        border: string;
        borderStrong: string;
        text: string;
        textMuted: string;
        accent: string;
    };
    radius: {
        sm: string;
        md: string;
        lg: string;
        pill: string;
    };
    shadow: {
        sm: string;
        md: string;
        lg: string;
    };
}
/**
 * useTokens Hook
 * Returns design tokens for runtime use
 */
export declare function useTokens(): Tokens;
/**
 * getTokens - Non-hook version for use outside React components
 */
export declare function getTokens(): Tokens;
