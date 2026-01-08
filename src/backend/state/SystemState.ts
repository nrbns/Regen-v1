// Browser-compatible event emitter
class BrowserEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => callback(...args));
  }
}

// Single source of truth for all system state
export interface Tab {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  webviewId?: string; // For real WebView integration
}

export interface Download {
  id: string;
  name: string;
  url: string;
  status: 'downloading' | 'completed' | 'failed';
  progress: number;
  time: number;
}

export interface AIState {
  available: boolean;
  running: boolean;
  lastTask?: string;
}

export interface SystemStateType {
  tabs: Tab[];
  activeTabId: string | null;
  status: 'idle' | 'working' | 'recovering';
  downloads: Download[];
  ai: AIState;
  lastError?: string;
}

export class SystemStateManager extends BrowserEventEmitter {
  private state: SystemStateType;

  constructor() {
    super();
    this.state = this.loadPersistedState() || this.getInitialState();
    this.persistState(); // Save initial state
  }

  private getInitialState(): SystemStateType {
    return {
      tabs: [],
      activeTabId: null,
      status: 'idle',
      downloads: [],
      ai: {
        available: false,
        running: false,
      },
    };
  }

  private loadPersistedState(): SystemStateType | null {
    try {
      const persisted = localStorage.getItem('regen-system-state');
      if (persisted) {
        const parsed = JSON.parse(persisted);
        // Validate and sanitize persisted state
        if (parsed && typeof parsed === 'object') {
          return {
            ...this.getInitialState(),
            ...parsed,
            // Ensure arrays exist
            tabs: Array.isArray(parsed.tabs) ? parsed.tabs : [],
            downloads: Array.isArray(parsed.downloads) ? parsed.downloads : [],
          };
        }
      }
    } catch (error) {
      console.warn('[SystemState] Failed to load persisted state:', error);
    }
    return null;
  }

  private persistState() {
    try {
      localStorage.setItem('regen-system-state', JSON.stringify(this.state));
    } catch (error) {
      console.warn('[SystemState] Failed to persist state:', error);
    }
  }

  // Get current state (read-only for UI)
  getState(): SystemStateType {
    return { ...this.state };
  }

  // Update state and emit change event
  private updateState(updates: Partial<SystemStateType>) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };

    // Persist state immediately
    this.persistState();

    // Emit change event for UI updates
    this.emit('state-changed', this.state, oldState);
  }

  // Tab management
  addTab(url: string = ''): string {
    const tab: Tab = {
      id: crypto.randomUUID(),
      url: url || '',
      title: url ? url : 'New Tab',
      isLoading: false,
    };

    this.updateState({
      tabs: [...this.state.tabs, tab],
      activeTabId: this.state.tabs.length === 0 ? tab.id : this.state.activeTabId,
    });

    return tab.id;
  }

  removeTab(tabId: string) {
    const newTabs = this.state.tabs.filter(tab => tab.id !== tabId);
    let newActiveTabId = this.state.activeTabId;

    if (this.state.activeTabId === tabId) {
      const currentIndex = this.state.tabs.findIndex(tab => tab.id === tabId);
      if (newTabs.length > 0) {
        newActiveTabId = currentIndex > 0 ? newTabs[currentIndex - 1].id : newTabs[0].id;
      } else {
        newActiveTabId = null;
      }
    }

    this.updateState({
      tabs: newTabs,
      activeTabId: newActiveTabId,
    });
  }

  switchTab(tabId: string) {
    if (this.state.tabs.find(tab => tab.id === tabId)) {
      this.updateState({ activeTabId: tabId });
    }
  }

  updateTab(tabId: string, updates: Partial<Tab>) {
    const newTabs = this.state.tabs.map(tab =>
      tab.id === tabId ? { ...tab, ...updates } : tab
    );

    this.updateState({ tabs: newTabs });
  }

  // Navigation
  navigate(tabId: string, url: string) {
    const normalizedUrl = this.normalizeUrl(url);
    this.updateTab(tabId, {
      url: normalizedUrl,
      title: normalizedUrl,
      isLoading: true,
    });

    // Simulate navigation completion
    setTimeout(() => {
      this.updateTab(tabId, { isLoading: false });
    }, 1000);
  }

  private normalizeUrl(url: string): string {
    if (!url) return '';

    // Add https if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }

    return url;
  }

  // Status management
  setStatus(status: 'idle' | 'working' | 'recovering') {
    this.updateState({ status });
  }

  // Downloads
  addDownload(name: string, url: string): string {
    const download: Download = {
      id: crypto.randomUUID(),
      name,
      url,
      status: 'downloading',
      progress: 0,
      time: Date.now(),
    };

    this.updateState({
      downloads: [...this.state.downloads, download],
    });

    // Simulate download completion
    setTimeout(() => {
      const updatedDownloads = this.state.downloads.map(d =>
        d.id === download.id ? { ...d, status: 'completed' as const, progress: 100 } : d
      );
      this.updateState({ downloads: updatedDownloads });
    }, 2000);

    return download.id;
  }

  // AI state
  setAIAvailable(available: boolean) {
    this.updateState({
      ai: { ...this.state.ai, available },
    });
  }

  setAIRunning(running: boolean, task?: string) {
    this.updateState({
      ai: {
        ...this.state.ai,
        running,
        lastTask: task || this.state.ai.lastTask,
      },
      status: running ? 'working' : 'idle',
    });
  }

  // Error handling
  setError(error: string) {
    this.updateState({
      status: 'recovering',
      lastError: error,
    });

    // Auto-recover after a delay
    setTimeout(() => {
      this.updateState({
        status: 'idle',
        lastError: undefined,
      });
    }, 3000);
  }
}

// Global instance
export const systemState = new SystemStateManager();
