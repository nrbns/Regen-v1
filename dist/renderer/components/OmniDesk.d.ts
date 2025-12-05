/**
 * OmniDesk - Central dashboard for empty state (no tabs open)
 * Think: ChatGPT home + Arc Spaces + Obsidian Quick Launch
 */
type OmniDeskVariant = 'overlay' | 'split';
interface OmniDeskProps {
    variant?: OmniDeskVariant;
    forceShow?: boolean;
    useChromeStyle?: boolean;
}
export declare function OmniDesk({ variant, forceShow, useChromeStyle: _useChromeStyle, }: OmniDeskProps): import("react/jsx-runtime").JSX.Element | null;
export {};
