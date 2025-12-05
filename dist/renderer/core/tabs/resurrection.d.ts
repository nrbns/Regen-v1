/**
 * Tab Resurrection System
 * Auto-saves tabs before crash and restores them on restart
 */
import { type Tab } from '../../state/tabsStore';
export interface ResurrectableTab {
    id: string;
    title: string;
    url?: string;
    appMode?: Tab['appMode'];
    mode?: Tab['mode'];
    containerId?: string;
    containerName?: string;
    containerColor?: string;
    groupId?: string;
    history?: Tab['history'];
    historyIndex?: number;
    savedAt: number;
    crashReason?: string;
}
export declare const RESURRECTION_DELAY_MS = 300000;
/**
 * Save tab for resurrection
 */
export declare function saveTabForResurrection(tab: Tab, crashReason?: string): void;
/**
 * Load all resurrectable tabs
 */
export declare function loadResurrectableTabs(): ResurrectableTab[];
/**
 * Resurrect a tab
 */
export declare function resurrectTab(resurrectable: ResurrectableTab): Promise<boolean>;
/**
 * Delete a resurrectable tab
 */
export declare function deleteResurrectableTab(tabId: string): void;
export declare function startAutoSaveTabs(): void;
export declare function stopAutoSaveTabs(): void;
/**
 * Check for tabs to resurrect on app start
 */
export declare function checkForResurrectableTabs(): ResurrectableTab[];
/**
 * Auto-resurrect tabs after delay
 */
export declare function scheduleAutoResurrection(delayMs?: number): void;
