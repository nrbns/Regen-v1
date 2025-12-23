/**
 * Socket.IO Client Service
 * Unified real-time client for all real-time features
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Offline queue for actions
 * - Connection status UI
 * - Event type safety
 */

import { io, Socket } from 'socket.io-client';
import { EVENTS, type EventType } from '../../../packages/shared/events';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_WS_URL?.replace('ws://', 'http://').replace('wss://', 'https://') ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_APP_API_URL ||
  'http://127.0.0.1:4000'; // Default to match .env specification

export interface SocketConfig {
  token?: string;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private config: SocketConfig = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private offlineQueue: Array<{ event: string; data: any; attempts?: number }> = [];
  private pendingAcks: Map<
    string,
    {
      event: string;
      data: any;
      resolve: (value: any) => void;
      reject: (error: any) => void;
      attempts: number;
    }
  > = new Map();
  private isConnected = false;
  private connectionStatusListeners: Set<(connected: boolean) => void> = new Set();

  /**
   * Initialize and connect to Socket.IO server
   */
  connect(config: SocketConfig = {}): void {
    if (this.socket?.connected) {
      console.log('[SocketService] Already connected');
      return;
    }

    this.config = config;

    const token = config.token || localStorage.getItem('auth_token') || undefined;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'], // Fallback to polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
    });

    this.setupEventHandlers();

    if (config.autoConnect !== false) {
      this.socket.connect();
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('[SocketService] Connected', { sessionId: this.socket?.id });

      // Flush offline queue
      this.flushOfflineQueue();

      // Update connection status
      this.updateConnectionStatus(true);

      this.config.onConnect?.();
    });

    this.socket.on('disconnect', reason => {
      this.isConnected = false;
      console.log('[SocketService] Disconnected', { reason });

      this.updateConnectionStatus(false);
      this.config.onDisconnect?.();
    });

    this.socket.on('connect_error', error => {
      this.reconnectAttempts++;
      console.error('[SocketService] Connection error', {
        error: error.message,
        attempts: this.reconnectAttempts,
      });

      this.updateConnectionStatus(false);
      this.config.onError?.(error);
    });

    this.socket.on('reconnect', attemptNumber => {
      console.log('[SocketService] Reconnected', { attempts: attemptNumber });
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
    });

    this.socket.on('reconnect_attempt', attemptNumber => {
      console.log('[SocketService] Reconnecting...', { attempt: attemptNumber });
      this.updateConnectionStatus(false);
    });

    // Listen to all real-time events
    Object.values(EVENTS).forEach(eventType => {
      this.socket?.on(eventType, data => {
        // Emit custom event for React components to listen
        window.dispatchEvent(new CustomEvent(`socket:${eventType}`, { detail: data }));
      });
    });
  }

  /**
   * Emit event to server
   */
  emit(event: EventType | string, data?: any, requireAck: boolean = false): Promise<any> | void {
    if (!this.socket || !this.isConnected) {
      console.warn('[SocketService] Not connected, buffering event', { event });
      this.offlineQueue.push({ event, data, attempts: 0 });
      return requireAck ? Promise.reject('Socket not connected') : undefined;
    }
    if (!requireAck) {
      this.socket.emit(event, data);
      return;
    }
    // Ack-based delivery
    return new Promise((resolve, reject) => {
      const ackId = `${event}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      this.pendingAcks.set(ackId, { event, data, resolve, reject, attempts: 0 });
      if (!this.socket) {
        reject('Socket not connected');
        return;
      }
      this.socket.emit(event, { ...data, ackId }, (response: any) => {
        if (response?.ok) {
          this.pendingAcks.delete(ackId);
          resolve(response);
        } else {
          this.retryAck(ackId);
        }
      });
    });
  }

  private retryAck(ackId: string) {
    const entry = this.pendingAcks.get(ackId);
    if (!entry) return;
    entry.attempts++;
    if (entry.attempts > 5) {
      entry.reject('Max ack retries');
      this.pendingAcks.delete(ackId);
      return;
    }
    setTimeout(
      () => {
        this.socket?.emit(entry.event, { ...entry.data, ackId }, (response: any) => {
          if (response?.ok) {
            this.pendingAcks.delete(ackId);
            entry.resolve(response);
          } else {
            this.retryAck(ackId);
          }
        });
      },
      Math.min(1000 * Math.pow(2, entry.attempts), 10000)
    );
  }

  /**
   * Start search and listen for results
   */
  startSearch(query: string, filters?: any): string {
    const jobId = `search_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    this.emit(EVENTS.START_SEARCH, {
      query,
      filters,
      jobId,
    });

    return jobId;
  }

  /**
   * Cancel a task
   */
  cancelTask(jobId: string): void {
    this.emit(EVENTS.CANCEL_TASK, { jobId });
  }

  /**
   * Subscribe to event
   */
  on(event: EventType | string, handler: (data: any) => void): () => void {
    if (!this.socket) {
      console.warn('[SocketService] Cannot subscribe, not connected');
      return () => {};
    }

    this.socket.on(event, handler);

    // Return unsubscribe function
    return () => {
      this.socket?.off(event, handler);
    };
  }

  /**
   * Unsubscribe from event
   */
  off(event: EventType | string, handler?: (data: any) => void): void {
    if (this.socket) {
      if (handler) {
        this.socket.off(event, handler);
      } else {
        this.socket.removeAllListeners(event);
      }
    }
  }

  /**
   * Flush offline queue when reconnected
   */
  private flushOfflineQueue(): void {
    if (this.offlineQueue.length === 0) return;
    console.log('[SocketService] Flushing offline queue', { count: this.offlineQueue.length });
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    queue.forEach(({ event, data }) => {
      this.emit(event, data, false);
    });
  }

  /**
   * Update connection status and notify listeners
   */
  private updateConnectionStatus(connected: boolean): void {
    this.isConnected = connected;
    this.connectionStatusListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('[SocketService] Status listener error', error);
      }
    });
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatusChange(listener: (connected: boolean) => void): () => void {
    this.connectionStatusListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.connectionStatusListeners.delete(listener);
    };
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.updateConnectionStatus(false);
  }

  /**
   * Get connection status
   */
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get socket instance (for advanced usage)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Singleton instance
export const socketService = new SocketService();

// TIERED ARCHITECTURE: Do NOT auto-connect
// Socket.IO only connects when L2 layer is activated (Research/Trade modes)
// Connection is managed by layerManager in core/layers/layerManager.ts

export default socketService;
