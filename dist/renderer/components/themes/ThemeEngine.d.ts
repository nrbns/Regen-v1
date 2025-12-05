/**
 * Theme Engine - Feature #6
 * Customizable themes with builder
 */
export interface Theme {
    id: string;
    name: string;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        accent: string;
    };
    wallpaper?: string;
    animated?: boolean;
}
export declare function ThemeEngine(): import("react/jsx-runtime").JSX.Element;
