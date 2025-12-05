/**
 * TabStrip Component
 * Horizontal tab container with keyboard navigation and grouping
 */
import React from 'react';
export interface Tab {
    id: string;
    label: string;
    url?: string;
    icon?: React.ReactNode;
    pinned?: boolean;
    groupId?: string;
    active?: boolean;
}
export interface TabGroup {
    id: string;
    label: string;
    tabs: Tab[];
    collapsed?: boolean;
}
export interface TabStripProps {
    tabs: Tab[];
    groups?: TabGroup[];
    activeTabId?: string;
    onTabClick?: (tabId: string) => void;
    onTabClose?: (tabId: string) => void;
    onTabNew?: () => void;
    onTabPin?: (tabId: string, pinned: boolean) => void;
    className?: string;
    compact?: boolean;
}
/**
 * TabStrip - Horizontal tab container
 *
 * Keyboard shortcuts:
 * - Ctrl+T / Cmd+T: New tab
 * - Ctrl+W / Cmd+W: Close tab
 * - Ctrl+Tab / Ctrl+PageDown: Next tab
 * - Ctrl+Shift+Tab / Ctrl+PageUp: Previous tab
 * - Ctrl+1-9: Switch to tab by number
 */
export declare function TabStrip({ tabs, groups: _groups, activeTabId, onTabClick, onTabClose, onTabNew, onTabPin: _onTabPin, className, compact, }: TabStripProps): import("react/jsx-runtime").JSX.Element;
