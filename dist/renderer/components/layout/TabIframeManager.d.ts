/**
 * TabIframeManager - PR: Fix tab switch null issues in Tauri
 * Implements iframe-per-tab pattern: all iframes stay mounted, visibility toggled via CSS
 * This preserves page state and prevents null refs when switching tabs
 */
import type { Tab } from '../../state/tabsStore';
interface TabIframeManagerProps {
    tabs: Tab[];
    activeTabId: string | null;
}
export declare function TabIframeManager({ tabs, activeTabId }: TabIframeManagerProps): import("react/jsx-runtime").JSX.Element;
export {};
