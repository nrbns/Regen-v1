/**
 * SuggestionCard - Card-based suggestion UI for Omnibox
 * Based on Figma UI/UX Prototype Flow redesign
 */
export type SuggestionType = 'history' | 'tab' | 'search' | 'ai' | 'command' | 'bookmark';
export interface SuggestionCardProps {
    type: SuggestionType;
    title: string;
    subtitle?: string;
    url?: string;
    icon?: React.ReactNode;
    badge?: string;
    onClick: () => void;
    onHover?: () => void;
    selected?: boolean;
    metadata?: {
        visitCount?: number;
        lastVisit?: number;
        favicon?: string;
    };
}
export declare function SuggestionCard({ type, title, subtitle, url, icon, badge, onClick, onHover, selected, metadata, }: SuggestionCardProps): import("react/jsx-runtime").JSX.Element;
export interface SuggestionCardGroupProps {
    title: string;
    suggestions: Omit<SuggestionCardProps, 'onClick' | 'onHover' | 'selected'>[];
    onSelect: (index: number) => void;
    selectedIndex?: number;
}
export declare function SuggestionCardGroup({ title, suggestions, onSelect, selectedIndex, }: SuggestionCardGroupProps): import("react/jsx-runtime").JSX.Element | null;
