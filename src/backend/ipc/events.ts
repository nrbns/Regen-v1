// IPC Events - The only UI ↔ Backend communication channel

export const IPC_EVENTS = {
  // Navigation
  NAVIGATE: 'navigate',
  BACK: 'back',
  FORWARD: 'forward',
  RELOAD: 'reload',

  // Tabs
  NEW_TAB: 'new_tab',
  CLOSE_TAB: 'close_tab',
  SWITCH_TAB: 'switch_tab',

  // AI
  RUN_AI: 'run_ai',

  // Downloads
  DOWNLOAD: 'download',

  // System
  GET_STATE: 'get_state',
  STATE_CHANGED: 'state_changed',
} as const;

export type IPCEvent = typeof IPC_EVENTS[keyof typeof IPC_EVENTS];

// Event payload types
export interface NavigatePayload {
  tabId: string;
  url: string;
}

export interface TabPayload {
  tabId?: string;
  url?: string;
}

export interface AIPayload {
  task: string;
  context?: any;
}

export interface DownloadPayload {
  filename: string;
  url: string;
}

// IPC Handler - UI can send events, backend responds
export class IPCHandler {
  private static listeners: Map<string, Function[]> = new Map();

  static send(event: string, payload?: any) {
    // In a real implementation, this would use Tauri IPC or Electron IPC
    // For now, use custom events
    window.dispatchEvent(new CustomEvent(event, { detail: payload }));

    // Also dispatch to any registered listeners
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => listener(payload));
  }

  static on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  // UI-facing methods (what UI can call)
  static navigate(tabId: string, url: string) {
    this.send(IPC_EVENTS.NAVIGATE, { tabId, url });
  }

  static newTab(url?: string) {
    this.send(IPC_EVENTS.NEW_TAB, { url });
  }

  static closeTab(tabId: string) {
    this.send(IPC_EVENTS.CLOSE_TAB, { tabId });
  }

  static switchTab(tabId: string) {
    this.send(IPC_EVENTS.SWITCH_TAB, { tabId });
  }

  static runAI(task: string, context?: any) {
    this.send(IPC_EVENTS.RUN_AI, { task, context });
  }

  static download(filename: string, url: string) {
    this.send(IPC_EVENTS.DOWNLOAD, { filename, url });
  }

  // Get current system state (read-only for UI)
  static getState() {
    // In a real implementation, this would return the current system state
    // For now, return a mock
    return {
      tabs: [],
      activeTabId: null,
      status: 'idle',
      downloads: [],
      ai: { available: false, running: false },
    };
  }
}
