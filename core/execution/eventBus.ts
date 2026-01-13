/**
 * Browser-compatible event bus for real-time communication across the application
 * All task-related events flow through this central hub
 */

type EventCallback = (...args: any[]) => void;

class BrowserEventEmitter {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(...args));
    }
  }

  setMaxListeners(_count: number) {
    // Browser version - no-op for now
  }
}

export const eventBus = new BrowserEventEmitter();
