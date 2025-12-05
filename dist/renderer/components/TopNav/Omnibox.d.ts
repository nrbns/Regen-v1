/**
 * Omnibox - URL bar with autocomplete suggestions and search
 * Fully functional search and navigation
 */
export interface OmniboxHandle {
    focus: (selectAll?: boolean) => void;
    blur: () => void;
}
export declare const Omnibox: import("react").ForwardRefExoticComponent<{
    onCommandPalette: () => void;
    onRedixOpen?: (prompt: string) => void;
} & import("react").RefAttributes<OmniboxHandle>>;
