/**
 * UnifiedSidePanel - Combined History, Bookmarks, and Downloads panel
 * Based on Figma UI/UX Prototype Flow redesign
 */
export interface UnifiedSidePanelProps {
    open: boolean;
    onClose: () => void;
    defaultTab?: 'history' | 'bookmarks' | 'workspaces' | 'downloads';
    width?: number;
}
export declare function UnifiedSidePanel({ open, onClose, defaultTab, width, }: UnifiedSidePanelProps): import("react/jsx-runtime").JSX.Element | null;
