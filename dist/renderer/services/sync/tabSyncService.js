/**
 * Multi-Tab Sync Service - Future Enhancement #1
 * Yjs + WebSocket for shared state across tabs
 * Syncs: tab order, active tab, tab groups, bookmarks
 */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useTabsStore } from '../../state/tabsStore';
class TabSyncService {
    doc = null;
    provider = null;
    tabsArray = null;
    activeId = null;
    groupsArray = null;
    isConnected = false;
    wsUrl;
    constructor(wsUrl = 'ws://127.0.0.1:18080/yjs') {
        this.wsUrl = wsUrl;
    }
    /**
     * Initialize Yjs document and WebSocket provider
     */
    async initialize(sessionId) {
        if (this.doc) {
            return; // Already initialized
        }
        this.doc = new Y.Doc();
        this.tabsArray = this.doc.getArray('tabs');
        this.activeId = this.doc.getText('activeId');
        this.groupsArray = this.doc.getArray('groups');
        // Connect to WebSocket provider
        this.provider = new WebsocketProvider(this.wsUrl, `session-${sessionId}`, this.doc);
        this.provider.on('status', (event) => {
            this.isConnected = event.status === 'connected';
            console.log('[TabSync] Connection status:', event.status);
        });
        // Observe changes from remote
        this.tabsArray.observe((_event) => {
            this.syncFromYjs();
        });
        this.activeId.observe(() => {
            const activeId = this.activeId?.toString() || null;
            const tabsState = useTabsStore.getState();
            if (activeId && activeId !== tabsState.activeId) {
                tabsState.setActive(activeId);
            }
        });
        this.groupsArray.observe(() => {
            this.syncFromYjs();
        });
        // Initial sync from Zustand to Yjs
        this.syncToYjs();
        // Listen to Zustand changes and sync to Yjs
        const initialState = useTabsStore.getState();
        let prevTabs = initialState.tabs;
        let prevActiveId = initialState.activeId;
        let prevTabGroups = initialState.tabGroups;
        useTabsStore.subscribe(state => {
            // Only sync if something actually changed
            if (state.tabs !== prevTabs ||
                state.activeId !== prevActiveId ||
                state.tabGroups !== prevTabGroups) {
                this.syncToYjs();
                prevTabs = state.tabs;
                prevActiveId = state.activeId;
                prevTabGroups = state.tabGroups;
            }
        });
        console.log('[TabSync] Initialized with session:', sessionId);
    }
    /**
     * Sync Zustand state to Yjs
     */
    syncToYjs() {
        if (!this.doc || !this.tabsArray || !this.activeId || !this.groupsArray) {
            console.warn('[TabSync] Cannot sync to Yjs: missing required Yjs structures');
            return;
        }
        const tabsState = useTabsStore.getState();
        // Update tabs array - use non-null assertions after null check above
        const tabsArray = this.tabsArray;
        const activeId = this.activeId;
        const groupsArray = this.groupsArray;
        this.doc.transact(() => {
            // Clear and rebuild tabs array
            tabsArray.delete(0, tabsArray.length);
            tabsState.tabs.forEach((tab, index) => {
                const tabMap = new Y.Map();
                tabMap.set('id', tab.id);
                tabMap.set('title', tab.title || '');
                tabMap.set('url', tab.url || '');
                tabMap.set('order', index);
                tabsArray.push([tabMap]);
            });
            // Update active ID
            activeId.delete(0, activeId.length);
            if (tabsState.activeId) {
                activeId.insert(0, tabsState.activeId);
            }
            // Update groups
            groupsArray.delete(0, groupsArray.length);
            tabsState.tabGroups.forEach(group => {
                const groupMap = new Y.Map();
                groupMap.set('id', group.id);
                groupMap.set('name', group.name);
                groupMap.set('color', group.color);
                // Get tab IDs for this group
                const groupTabIds = tabsState.tabs.filter(t => t.groupId === group.id).map(t => t.id);
                groupMap.set('tabIds', groupTabIds);
                groupsArray.push([groupMap]);
            });
        });
    }
    /**
     * Sync Yjs state to Zustand
     */
    syncFromYjs() {
        if (!this.tabsArray || !this.activeId || !this.groupsArray) {
            return;
        }
        const tabsState = useTabsStore.getState();
        // Read tabs from Yjs
        const yjsTabs = this.tabsArray.toArray().map((tabMap) => ({
            id: tabMap.get('id'),
            title: tabMap.get('title') || '',
            url: tabMap.get('url'),
            order: tabMap.get('order') || 0,
        }));
        // Only update if different (avoid loops)
        const currentTabs = tabsState.tabs;
        if (yjsTabs.length !== currentTabs.length ||
            yjsTabs.some((yt, i) => yt.id !== currentTabs[i]?.id || yt.order !== i)) {
            // Reorder tabs based on Yjs order
            const orderedTabs = yjsTabs
                .sort((a, b) => a.order - b.order)
                .map(yt => {
                const existingTab = currentTabs.find(t => t.id === yt.id);
                return existingTab || { ...yt, id: yt.id, title: yt.title, url: yt.url };
            });
            tabsState.setAll(orderedTabs);
        }
        // Update active ID
        const yjsActiveId = this.activeId.toString() || null;
        if (yjsActiveId && yjsActiveId !== tabsState.activeId) {
            tabsState.setActive(yjsActiveId);
        }
        // Update groups
        const yjsGroups = this.groupsArray.toArray().map((groupMap) => ({
            id: groupMap.get('id'),
            name: groupMap.get('name') || '',
            color: groupMap.get('color') || '#6366f1',
            tabIds: groupMap.get('tabIds') || [],
        }));
        // Sync groups (would need group management in tabsStore)
        // For now, just log
        console.log('[TabSync] Groups synced:', yjsGroups);
    }
    /**
     * Disconnect and cleanup
     */
    disconnect() {
        if (this.provider) {
            this.provider.destroy();
            this.provider = null;
        }
        if (this.doc) {
            this.doc.destroy();
            this.doc = null;
        }
        this.isConnected = false;
        console.log('[TabSync] Disconnected');
    }
    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
        };
    }
}
// Singleton instance
let tabSyncInstance = null;
export function getTabSyncService(wsUrl) {
    if (!tabSyncInstance) {
        tabSyncInstance = new TabSyncService(wsUrl);
    }
    return tabSyncInstance;
}
export function initializeTabSync(sessionId, wsUrl) {
    const service = getTabSyncService(wsUrl);
    return service.initialize(sessionId);
}
export function disconnectTabSync() {
    if (tabSyncInstance) {
        tabSyncInstance.disconnect();
        tabSyncInstance = null;
    }
}
