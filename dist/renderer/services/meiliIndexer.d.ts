import type { Tab } from '../state/tabsStore';
/**
 * Initialize MeiliSearch indexing
 */
export declare function initMeiliIndexing(): Promise<void>;
/**
 * Index a single tab
 */
export declare function indexTab(tab: Tab): Promise<void>;
/**
 * Index multiple tabs (batch)
 */
export declare function indexTabs(tabs: Tab[]): Promise<void>;
/**
 * Index research document
 */
export declare function indexResearch(doc: {
    id: string;
    title: string;
    content: string;
    url?: string;
    tags?: string[];
    timestamp?: number;
}): Promise<void>;
/**
 * Index note
 */
export declare function indexNote(doc: {
    id: string;
    title: string;
    content: string;
    tags?: string[];
    timestamp?: number;
}): Promise<void>;
/**
 * Enable/disable indexing
 */
export declare function setIndexingEnabled(enabled: boolean): void;
