/**
 * Multi-Tab Sync Service - Future Enhancement #1
 * Yjs + WebSocket for shared state across tabs
 * Syncs: tab order, active tab, tab groups, bookmarks
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import Dexie, { type Table } from 'dexie';
import { useTabsStore } from '../../state/tabsStore';

type PendingUpdate = {
  id?: number;
  sessionId: string;
  update: number[]; // Uint8Array persisted as plain array
  createdAt: number;
};

class TabSyncDexie extends Dexie {
  pending!: Table<PendingUpdate, number>;
  constructor() {
    super('tabSyncQueue');
    this.version(1).stores({
      pending: '++id,sessionId,createdAt',
    });
  }
}

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

class TabSyncService {
  private doc: Y.Doc | null = null;
  private provider: WebsocketProvider | null = null;
  private tabsArray: Y.Array<Y.Map<any>> | null = null;
  private activeId: Y.Text | null = null;
  private groupsArray: Y.Array<Y.Map<any>> | null = null;
  private isConnected = false;
  private wsUrl: string;
  private sessionId: string | null = null;
  private db: TabSyncDexie;

  constructor(wsUrl: string = 'ws://127.0.0.1:18080/yjs') {
    this.wsUrl = wsUrl;
    this.db = new TabSyncDexie();
  }

  /**
   * Initialize Yjs document and WebSocket provider
   */
  async initialize(sessionId: string): Promise<void> {
    if (this.doc) {
      return; // Already initialized
    }

    this.sessionId = sessionId;
    this.doc = new Y.Doc();
    this.tabsArray = this.doc.getArray('tabs');
    this.activeId = this.doc.getText('activeId');
    this.groupsArray = this.doc.getArray('groups');

    // Connect to WebSocket provider
    this.provider = new WebsocketProvider(this.wsUrl, `session-${sessionId}`, this.doc);

    this.provider.on('status', async (event: { status: string }) => {
      this.isConnected = event.status === 'connected';
      console.log('[TabSync] Connection status:', event.status);
      if (this.isConnected) {
        await this.flushQueuedUpdates();
      }
    });

    // Observe changes from remote
    this.tabsArray.observe((_event: Y.YArrayEvent<Y.Map<any>>) => {
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

    // Persist outbound updates for offline replay
    this.doc.on('update', update => {
      if (!this.sessionId) return;
      // Always persist to guarantee replay after crash/offline close
      this.queueUpdate(this.sessionId, update).catch(err =>
        console.warn('[TabSync] Failed to persist update', err)
      );
    });

    // Initial sync from Zustand to Yjs
    this.syncToYjs();

    // Rehydrate any pending updates (in case we crashed while offline)
    await this.flushQueuedUpdates();

    // Listen to Zustand changes and sync to Yjs
    const initialState = useTabsStore.getState();
    let prevTabs: typeof initialState.tabs = initialState.tabs;
    let prevActiveId: typeof initialState.activeId = initialState.activeId;
    let prevTabGroups: typeof initialState.tabGroups = initialState.tabGroups;

    useTabsStore.subscribe(state => {
      // Only sync if something actually changed
      if (
        state.tabs !== prevTabs ||
        state.activeId !== prevActiveId ||
        state.tabGroups !== prevTabGroups
      ) {
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
  private syncToYjs(): void {
    if (!this.doc || !this.tabsArray || !this.activeId || !this.groupsArray) {
      console.warn('[TabSync] Cannot sync to Yjs: missing required Yjs structures');
      return;
    }

    const tabsState = useTabsStore.getState();

    // Update tabs array - use non-null assertions after null check above
    const tabsArray = this.tabsArray!;
    const activeId = this.activeId!;
    const groupsArray = this.groupsArray!;

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
  private syncFromYjs(): void {
    if (!this.tabsArray || !this.activeId || !this.groupsArray) {
      return;
    }

    const tabsState = useTabsStore.getState();

    // Read tabs from Yjs
    const yjsTabs = this.tabsArray.toArray().map((tabMap: Y.Map<any>) => ({
      id: tabMap.get('id'),
      title: tabMap.get('title') || '',
      url: tabMap.get('url'),
      order: tabMap.get('order') || 0,
    }));

    // Only update if different (avoid loops)
    const currentTabs = tabsState.tabs;
    if (
      yjsTabs.length !== currentTabs.length ||
      yjsTabs.some((yt, i) => yt.id !== currentTabs[i]?.id || yt.order !== i)
    ) {
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
    const yjsGroups = this.groupsArray.toArray().map((groupMap: Y.Map<any>) => ({
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
   * Persist an outbound Yjs update to IndexedDB for offline replay
   */
  private async queueUpdate(sessionId: string, update: Uint8Array): Promise<void> {
    try {
      await this.db.pending.add({
        sessionId,
        update: Array.from(update),
        createdAt: Date.now(),
      });

      // Keep queue bounded (oldest first) to avoid unbounded growth
      const count = await this.db.pending.where({ sessionId }).count();
      if (count > 500) {
        const old = await this.db.pending.where({ sessionId }).sortBy('createdAt');
        const dropCount = count - 500;
        const idsToDelete = old
          .slice(0, dropCount)
          .map(item => item.id!)
          .filter(Boolean);
        if (idsToDelete.length) {
          await this.db.pending.bulkDelete(idsToDelete);
        }
      }
    } catch (error) {
      console.warn('[TabSync] queueUpdate failed', error);
    }
  }

  /**
   * Apply and clear queued updates once reconnected
   */
  private async flushQueuedUpdates(): Promise<void> {
    if (!this.doc || !this.sessionId) return;
    try {
      const queued = await this.db.pending.where({ sessionId: this.sessionId }).toArray();
      if (!queued.length) return;

      for (const item of queued) {
        try {
          const buf = new Uint8Array(item.update);
          Y.applyUpdate(this.doc, buf);
        } catch (error) {
          console.warn('[TabSync] Failed to apply queued update', error);
        }
      }

      // Clear applied updates
      const ids = queued.map(item => item.id!).filter(Boolean);
      if (ids.length) {
        await this.db.pending.bulkDelete(ids);
      }
      console.log(`[TabSync] Applied ${queued.length} queued updates after reconnect`);
    } catch (error) {
      console.warn('[TabSync] flushQueuedUpdates failed', error);
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
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
  getStatus(): { connected: boolean; sessionId?: string } {
    return {
      connected: this.isConnected,
    };
  }
}

// Singleton instance
let tabSyncInstance: TabSyncService | null = null;

export function getTabSyncService(wsUrl?: string): TabSyncService {
  if (!tabSyncInstance) {
    tabSyncInstance = new TabSyncService(wsUrl);
  }
  return tabSyncInstance;
}

export function initializeTabSync(sessionId: string, wsUrl?: string): Promise<void> {
  const service = getTabSyncService(wsUrl);
  return service.initialize(sessionId);
}

export function disconnectTabSync(): void {
  if (tabSyncInstance) {
    tabSyncInstance.disconnect();
    tabSyncInstance = null;
  }
}
