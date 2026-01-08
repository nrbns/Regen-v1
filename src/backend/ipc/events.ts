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

// IPC Handler - UI can invoke Tauri commands, backend responds via events
export class IPCHandler {
  private static listeners: Map<string, Function[]> = new Map();

  static async send(event: string, payload?: any) {
    try {
      // Use Tauri invoke to call backend commands
      const result = await (window as any).__TAURI__.invoke(event, payload);

      // Dispatch to any registered listeners
      const listeners = this.listeners.get(event) || [];
      listeners.forEach(listener => listener(result));

      return result;
    } catch (error) {
      console.error(`[IPC] Error invoking ${event}:`, error);
      throw error;
    }
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
    // This should be called via IPC to get real state from backend
    // For now, return empty state (will be populated by backend)
    return {
      tabs: [],
      activeTabId: null,
      status: 'idle',
      downloads: [],
      ai: { available: false, running: false },
    };
  }
}
