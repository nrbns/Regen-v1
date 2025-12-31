import { eventBus, EVENTS } from './state/eventBus';
import { createIndexedDBStorage } from '../lib/storage/indexedDBStorage';

export type NavigationContext = {
  id: string;
  tabId: string;
  url: string;
  title?: string;
  timestamp: number;
  mode?: string;
};

class ContextEngine {
  private storageKey = 'regen:contexts';
  private storage = createIndexedDBStorage('regen-contexts', 'contexts');
  private unsubscribe: (() => void) | null = null;
  private maxEntries = 500; // keep last N contexts
  private pendingWrite: Promise<void> = Promise.resolve();

  start() {
    if (this.unsubscribe) return; // already started
    this.unsubscribe = eventBus.on(EVENTS.TAB_NAVIGATED, this.handleNavigation.bind(this));
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private async handleNavigation(payload: { tabId: string; url: string; tab?: any }) {
    try {
      const entry: NavigationContext = {
        id: typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `ctx-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        tabId: payload.tabId,
        url: payload.url,
        title: payload.tab?.title,
        timestamp: Date.now(),
        mode: payload.tab?.appMode,
      };

      await this.appendContext(entry);
    } catch (err) {
      console.error('[ContextEngine] Failed to handle navigation event', err);
    }
  }

  private async appendContext(entry: NavigationContext) {
    // Serialize writes to avoid races when multiple navigations happen close together
    this.pendingWrite = this.pendingWrite.then(async () => {
      const raw = await this.storage.getItem(this.storageKey);
      let list: NavigationContext[] = [];
      if (raw) {
        try {
          list = JSON.parse(raw) as NavigationContext[];
        } catch {
          list = [];
        }
      }

      list.push(entry);

      // Keep recent entries only
      if (list.length > this.maxEntries) {
        list = list.slice(-this.maxEntries);
      }

      try {
        await this.storage.setItem(this.storageKey, JSON.stringify(list));

        // Try to index context in Meili (best-effort)
        try {
          import('../services/meiliIndexer').then(({ indexContext }) => {
            try {
              void indexContext(entry);
            } catch {}
          });
        } catch {}
      } catch (err) {
        console.error('[ContextEngine] Failed to persist context', err);
      }
    });

    // Wait for the write to complete before returning
    await this.pendingWrite;
  }

  async getContexts(limit?: number): Promise<NavigationContext[]> {
    const raw = await this.storage.getItem(this.storageKey);
    if (!raw) return [];
    try {
      const list = JSON.parse(raw) as NavigationContext[];
      if (limit && list.length > limit) return list.slice(-limit);
      return list;
    } catch {
      return [];
    }
  }

  async clear() {
    await this.storage.removeItem(this.storageKey);
  }
}

export const contextEngine = new ContextEngine();
export default contextEngine;
