/**
 * TabManager Service
 * Ensures one active job per tab and supports session restore.
 */

export interface TabInfo {
  id: string;
  activeJobId?: string | null;
  lastActiveAt: number;
}

type Listener = (info: TabInfo) => void;

class TabManager {
  private storageKey = 'regen:tabs';
  private tabIdKey = 'regen:tabId';
  private listeners = new Set<Listener>();
  private info: TabInfo;

  constructor() {
    const id = this.ensureTabId();
    const all = this.getAllTabs();
    const existing = all[id] || { id, activeJobId: null, lastActiveAt: Date.now() };
    this.info = existing;
    // Persist initial state
    this.saveTab(existing);
    // Heartbeat update on visibility changes
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.touch();
      });
      window.addEventListener('beforeunload', () => {
        this.touch();
      });
    }
  }

  private ensureTabId(): string {
    let id = sessionStorage.getItem(this.tabIdKey);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(this.tabIdKey, id);
    }
    return id;
  }

  private getAllTabs(): Record<string, TabInfo> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private setAllTabs(data: Record<string, TabInfo>) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  private saveTab(info: TabInfo) {
    const all = this.getAllTabs();
    all[info.id] = info;
    this.setAllTabs(all);
  }

  private touch() {
    this.info.lastActiveAt = Date.now();
    this.saveTab(this.info);
  }

  getTabId(): string {
    return this.info.id;
  }

  getActiveJob(): string | null | undefined {
    return this.info.activeJobId;
  }

  setActiveJob(jobId: string | null) {
    this.info.activeJobId = jobId;
    this.touch();
    this.emit();
  }

  clearActiveJob() {
    this.setActiveJob(null);
  }

  listOpenTabs(): TabInfo[] {
    const all = this.getAllTabs();
    return Object.values(all).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // emit current state immediately
    listener({ ...this.info });
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snapshot = { ...this.info };
    this.listeners.forEach(fn => {
      try {
        fn(snapshot);
      } catch {
        // ignore
      }
    });
  }
}

export const tabManager = new TabManager();
