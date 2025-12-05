/**
 * TopBar Component
 * Main application chrome with mode tabs, address bar, and quick actions
 */
export interface TopBarProps {
    className?: string;
    compact?: boolean;
    showAddressBar?: boolean;
    showQuickActions?: boolean;
    onModeChange?: (mode: string) => void;
    onAddressBarSubmit?: (query: string) => void;
    currentUrl?: string;
}
export declare function TopBar({ className, compact, showAddressBar, showQuickActions, onModeChange, onAddressBarSubmit, currentUrl, }: TopBarProps): import("react/jsx-runtime").JSX.Element;
