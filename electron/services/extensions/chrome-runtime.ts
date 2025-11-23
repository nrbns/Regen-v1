/**
 * Chrome Runtime API Implementation
 * Provides chrome.runtime.* APIs to extensions
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'node:crypto';

export interface RuntimeMessage {
  type: string;
  payload?: unknown;
  extensionId?: string;
}

export interface RuntimePort {
  name: string;
  postMessage: (message: unknown) => void;
  onMessage: EventEmitter;
  disconnect: () => void;
}

class ChromeRuntimeAPI extends EventEmitter {
  private messageListeners: Map<
    string,
    Set<(message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => void>
  > = new Map();
  private ports: Map<string, RuntimePort> = new Map();
  private extensionId: string;

  constructor(extensionId: string) {
    super();
    this.extensionId = extensionId;
  }

  /**
   * Get extension ID
   */
  get id(): string {
    return this.extensionId;
  }

  /**
   * Get extension URL
   */
  getURL(path: string = ''): string {
    return `chrome-extension://${this.extensionId}/${path}`;
  }

  /**
   * Send message to extension
   */
  sendMessage(message: unknown, responseCallback?: (response: unknown) => void): void {
    // In a real implementation, this would send to the extension's background page
    this.emit('message', message);

    if (responseCallback) {
      // Simulate async response
      setTimeout(() => {
        responseCallback({ success: true });
      }, 0);
    }
  }

  /**
   * Listen for messages
   */
  onMessage(
    callback: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => void
  ): void {
    if (!this.messageListeners.has(this.extensionId)) {
      this.messageListeners.set(this.extensionId, new Set());
    }
    this.messageListeners.get(this.extensionId)!.add(callback);
    this.on('message', message => {
      callback(message, { id: this.extensionId }, () => {});
    });
  }

  /**
   * Remove message listener
   */
  removeListener(event: string, callback: (...args: any[]) => void): this {
    const listeners = this.messageListeners.get(this.extensionId);
    if (listeners) {
      listeners.delete(callback);
    }
    return super.removeListener(event, callback);
  }

  /**
   * Connect to extension
   */
  connect(connectInfo?: { name?: string }): RuntimePort {
    const portId = randomUUID();
    const port: RuntimePort = {
      name: connectInfo?.name || '',
      postMessage: (message: unknown) => {
        this.emit('connect', { portId, message });
      },
      onMessage: new EventEmitter(),
      disconnect: () => {
        this.ports.delete(portId);
        this.emit('disconnect', { portId });
      },
    };

    this.ports.set(portId, port);
    return port;
  }

  /**
   * Get last error
   */
  getLastError(): { message: string } | undefined {
    // In a real implementation, track errors
    return undefined;
  }

  /**
   * Reload extension
   */
  reload(): void {
    this.emit('reload');
  }

  /**
   * Get manifest
   */
  getManifest(): unknown {
    // This would return the actual manifest
    return {};
  }
}

/**
 * Create runtime API instance for extension
 */
export function createChromeRuntime(extensionId: string): ChromeRuntimeAPI {
  return new ChromeRuntimeAPI(extensionId);
}
