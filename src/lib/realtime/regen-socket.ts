/**
 * Regen Real-Time WebSocket Client
 * Connects to backend and handles real-time events
 */

import { v4 as uuidv4 } from 'uuid';
import { ipc } from '../ipc-typed';

export type RegenSocketEvent =
  | RegenMessageEvent
  | RegenStatusEvent
  | RegenCommandEvent
  | RegenNotificationEvent
  | RegenErrorEvent;

export interface BaseEvent {
  id: string;
  clientId: string;
  sessionId: string;
  timestamp: number;
  version: 1;
}

export interface RegenMessageEvent extends BaseEvent {
  type: 'message';
  role: 'assistant' | 'user';
  mode: 'research' | 'trade' | 'browser' | 'automation' | 'handsFree';
  language: string;
  text: string;
  done?: boolean;
}

export interface RegenStatusEvent extends BaseEvent {
  type: 'status';
  phase: 'planning' | 'searching' | 'scraping' | 'calling_workflow' | 'executing_command' | 'idle';
  detail?: string;
}

export interface RegenCommandEvent extends BaseEvent {
  type: 'command';
  command:
    | { kind: 'OPEN_TAB'; url: string; background?: boolean }
    | { kind: 'SCROLL'; tabId: string; amount: number }
    | { kind: 'CLICK_ELEMENT'; tabId: string; elementId: string; selector?: string }
    | { kind: 'GO_BACK'; tabId: string }
    | { kind: 'GO_FORWARD'; tabId: string }
    | { kind: 'SWITCH_TAB'; tabId: string }
    | { kind: 'CLOSE_TAB'; tabId: string }
    | { kind: 'SPEAK'; text: string; language: string }
    | { kind: 'STOP_SPEAKING' }
    | { kind: 'TYPE_INTO_ELEMENT'; tabId: string; selector: string; text: string };
}

export interface RegenNotificationEvent extends BaseEvent {
  type: 'notification';
  level: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}

export interface RegenErrorEvent extends BaseEvent {
  type: 'error';
  code: string;
  message: string;
  recoverable?: boolean;
}

type EventHandler = (event: RegenSocketEvent) => void;

class RegenSocketClient {
  private socket: WebSocket | null = null;
  private clientId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000;
  private isReconnecting = false;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private messageBuffer: string = ''; // For streaming messages

  constructor(clientId?: string) {
    this.clientId = clientId || `client-${uuidv4()}`;
  }

  /**
   * Connect to WebSocket server
   */
  connect(sessionId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Prevent multiple connection attempts
      if (
        this.socket &&
        (this.socket.readyState === WebSocket.OPEN ||
          this.socket.readyState === WebSocket.CONNECTING)
      ) {
        console.log('[RegenSocket] Already connected or connecting');
        resolve();
        return;
      }

      // Use window.location for WebSocket URL in Electron
      const wsUrl = process.env.VITE_REDIX_URL || 'ws://localhost:4000';
      const url = `${wsUrl}/agent/stream?clientId=${this.clientId}${sessionId ? `&sessionId=${sessionId}` : ''}`;

      try {
        this.socket = new WebSocket(url);

        // Set connection timeout
        const timeout = setTimeout(() => {
          if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
            this.socket.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 second timeout

        this.socket.onopen = () => {
          clearTimeout(timeout);
          console.log('[RegenSocket] Connected', { clientId: this.clientId });
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          this.emit('connected', {} as any);
          resolve();
        };

        this.socket.onmessage = ev => {
          try {
            const event: RegenSocketEvent = JSON.parse(ev.data);
            this.handleEvent(event);
          } catch (error) {
            console.error('[RegenSocket] Failed to parse event', error);
          }
        };

        this.socket.onclose = event => {
          clearTimeout(timeout);
          console.log('[RegenSocket] Disconnected', { code: event.code, reason: event.reason });
          this.emit('disconnected', {} as any);

          // Only attempt reconnect if not a manual close
          if (event.code !== 1000) {
            this.attemptReconnect(sessionId);
          }
        };

        this.socket.onerror = error => {
          clearTimeout(timeout);
          console.error('[RegenSocket] Error', error);
          this.emit('error', {
            id: uuidv4(),
            clientId: this.clientId,
            sessionId: sessionId || '',
            type: 'error',
            code: 'WEBSOCKET_ERROR',
            message: 'WebSocket connection error',
            timestamp: Date.now(),
            version: 1,
          } as RegenErrorEvent);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(sessionId?: string) {
    if (this.isReconnecting) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RegenSocket] Max reconnect attempts reached');
      this.emit('reconnect_failed', {} as any);
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    console.log(`[RegenSocket] Reconnecting (attempt ${this.reconnectAttempts})...`);

    setTimeout(() => {
      this.connect(sessionId).catch(() => {
        this.isReconnecting = false;
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Handle incoming event
   */
  private handleEvent(event: RegenSocketEvent) {
    // Emit to specific type handlers
    this.emit(event.type, event);

    // Emit to all handlers
    this.emit('*', event);

    // Handle commands immediately
    if (event.type === 'command') {
      this.handleCommand(event.command);
    }
  }

  /**
   * Handle Regen commands
   */
  private async handleCommand(cmd: RegenCommandEvent['command']) {
    try {
      switch (cmd.kind) {
        case 'OPEN_TAB':
          await ipc.regen.openTab({ url: cmd.url, background: cmd.background });
          break;

        case 'SCROLL':
          await ipc.regen.scroll({ tabId: cmd.tabId, amount: cmd.amount });
          break;

        case 'CLICK_ELEMENT':
          if (cmd.selector) {
            await ipc.regen.clickElement({ tabId: cmd.tabId, selector: cmd.selector });
          }
          break;

        case 'GO_BACK':
          await ipc.regen.goBack({ tabId: cmd.tabId });
          break;

        case 'GO_FORWARD':
          await ipc.regen.goForward({ tabId: cmd.tabId });
          break;

        case 'SWITCH_TAB':
          await ipc.regen.switchTab({ id: cmd.tabId });
          break;

        case 'CLOSE_TAB':
          await ipc.regen.closeTab({ tabId: cmd.tabId });
          break;

        case 'TYPE_INTO_ELEMENT':
          await ipc.regen.typeIntoElement({
            tabId: cmd.tabId,
            selector: cmd.selector,
            text: cmd.text,
          });
          break;

        case 'SPEAK':
          // Use browser TTS
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(cmd.text);
            utterance.lang = cmd.language;
            window.speechSynthesis.speak(utterance);
          }
          break;

        case 'STOP_SPEAKING':
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          break;
      }
    } catch (error) {
      console.error('[RegenSocket] Command execution failed', { cmd, error });
    }
  }

  /**
   * Subscribe to events
   */
  on(eventType: string, handler: EventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Unsubscribe from events
   */
  off(eventType: string, handler: EventHandler) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to handlers
   */
  private emit(eventType: string, event: RegenSocketEvent) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('[RegenSocket] Handler error', { eventType, error });
        }
      });
    }
  }

  /**
   * Send message to server
   */
  send(message: Record<string, unknown>) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('[RegenSocket] Cannot send message, socket not open');
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Get client ID
   */
  getClientId(): string {
    return this.clientId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let socketInstance: RegenSocketClient | null = null;

/**
 * Get or create socket instance
 */
export function getRegenSocket(clientId?: string): RegenSocketClient {
  if (!socketInstance) {
    socketInstance = new RegenSocketClient(clientId);
  }
  return socketInstance;
}

/**
 * Connect Regen socket
 */
export function connectRegenSocket(sessionId?: string): Promise<void> {
  const socket = getRegenSocket();
  return socket.connect(sessionId);
}

export default RegenSocketClient;
