/**
 * Multi-Tab Sync Service - Future Enhancement #1
 * Yjs + WebSocket for shared state across tabs
 * Syncs: tab order, active tab, tab groups, bookmarks
 */
export interface TabSyncState {
    tabs: Array<{
        id: string;
        title: string;
        url?: string;
        order: number;
    }>;
    activeId: string | null;
    groups: Array<{
        id: string;
        name: string;
        color: string;
        tabIds: string[];
    }>;
}
declare class TabSyncService {
    private doc;
    private provider;
    private tabsArray;
    private activeId;
    private groupsArray;
    private isConnected;
    private wsUrl;
    constructor(wsUrl?: string);
    /**
     * Initialize Yjs document and WebSocket provider
     */
    initialize(sessionId: string): Promise<void>;
    /**
     * Sync Zustand state to Yjs
     */
    private syncToYjs;
    /**
     * Sync Yjs state to Zustand
     */
    private syncFromYjs;
    /**
     * Disconnect and cleanup
     */
    disconnect(): void;
    /**
     * Get connection status
     */
    getStatus(): {
        connected: boolean;
        sessionId?: string;
    };
}
export declare function getTabSyncService(wsUrl?: string): TabSyncService;
export declare function initializeTabSync(sessionId: string, wsUrl?: string): Promise<void>;
export declare function disconnectTabSync(): void;
export {};
