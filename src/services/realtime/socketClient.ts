/**
 * Web Socket Client (Socket.IO)
 * Mirrors the desktop client API for renderer builds.
 */
import { io, Socket } from 'socket.io-client';

// Event constants (shared with desktop)
const EVENTS = {
  JOB_PROGRESS: 'job:progress:v1',
  JOB_COMPLETED: 'job:completed:v1',
  JOB_FAILED: 'job:failed:v1',
  MODEL_CHUNK: 'model:chunk:v1',
} as const;

export interface SocketConfig {
  url: string;
  token: string | null;
  deviceId?: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

interface JobSubscription {
  jobId: string;
  onProgress: (data: any) => void;
  onComplete: (data: any) => void;
  onError: (error: string) => void;
}

interface QueuedMessage {
  id: string;
  event: string;
  data: any;
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
  retries: number;
}

interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: number;
  reconnectAttempts: number;
  error?: string;
  offlineQueueSize: number;
  sessionRestored: boolean;
}

export class SocketClient {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private isConnected = false;
  private reconnectCount = 0;
  private maxReconnectAttempts: number;
  private jobSubscriptions = new Map<string, JobSubscription>();
  private eventHandlers = new Map<string, Set<(data: any) => void>>();
  private offlineQueue: QueuedMessage[] = [];
  private maxQueueSize = 100;
  private sessionData: Map<string, any> = new Map();
  private connectionStatusCallbacks = new Set<(status: ConnectionStatus) => void>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
    offlineQueueSize: 0,
    sessionRestored: false,
  };

  constructor(config: SocketConfig) {
    this.config = {
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      ...config,
    };
    this.maxReconnectAttempts = this.config.maxReconnectAttempts!;
  }

  async connect(): Promise<void> {
    if (!this.config.url) throw new Error('Socket URL missing');
    return new Promise((resolve, reject) => {
      try {
        this.updateConnectionStatus({
          connected: false,
          reconnecting: true,
          reconnectAttempts: this.reconnectCount,
        });

        this.socket = io(this.config.url, {
          auth: {
            token: this.config.token ?? undefined,
            deviceId: this.config.deviceId || `web-${Date.now()}`,
          },
          reconnection: true,
          reconnectionDelay: this.config.reconnectDelay,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: this.maxReconnectAttempts,
          transports: ['websocket', 'polling'],
          timeout: 10000, // Connection timeout
        });

        this.socket.on('connect', () => {
          console.log('[SocketClient] Connected successfully');
          this.isConnected = true;
          this.reconnectCount = 0;

          this.updateConnectionStatus({
            connected: true,
            reconnecting: false,
            reconnectAttempts: 0,
            lastConnected: Date.now(),
          });

          // Start heartbeat monitoring
          this.startHeartbeat();

          // Restore session and process offline queue
          this.restoreSession();
          this.processOfflineQueue();

          this.emit('socket:connected', { timestamp: Date.now() });
          resolve();
        });

        this.socket.on('connect_error', (error: any) => {
          console.error('[SocketClient] Connection error:', error);
          this.isConnected = false;

          const errorMessage = error?.message || String(error);
          this.updateConnectionStatus({
            connected: false,
            reconnecting: true,
            reconnectAttempts: this.reconnectCount,
            error: errorMessage,
          });

          this.emit('socket:error', { error: errorMessage });

          // Dispatch user-friendly connection error
          if (typeof window !== 'undefined') {
            try {
              const { dispatchConnectionError } = require('../../components/realtime/RealtimeErrorHandler');
              dispatchConnectionError(errorMessage, true);
            } catch {
              // Fallback if import fails
            }
          }

          if (this.reconnectCount === 0) reject(error);
        });

        this.socket.on('disconnect', (reason: string) => {
          console.log('[SocketClient] Disconnected:', reason);
          this.isConnected = false;
          this.stopHeartbeat();

          this.updateConnectionStatus({
            connected: false,
            reconnecting: reason === 'io server disconnect' || reason === 'io client disconnect',
            error: reason,
          });

          this.emit('socket:disconnected', { reason });
        });

        this.socket.on('reconnect_attempt', (attempt: number) => {
          this.reconnectCount = attempt;
          this.updateConnectionStatus({
            connected: false,
            reconnecting: true,
            reconnectAttempts: attempt,
          });

          this.emit('socket:reconnecting', { attempt });
        });

        this.socket.on('reconnect', () => {
          console.log('[SocketClient] Reconnected successfully');
          this.isConnected = true;
          this.reconnectCount = 0;

          this.updateConnectionStatus({
            connected: true,
            reconnecting: false,
            reconnectAttempts: 0,
            lastConnected: Date.now(),
          });

          this.startHeartbeat();
          this.restoreSession();
          this.processOfflineQueue();
        });

        this.socket.on('reconnect_error', (error: any) => {
          console.error('[SocketClient] Reconnect error:', error);
          this.updateConnectionStatus({
            connected: false,
            reconnecting: true,
            error: error?.message || String(error),
          });
        });

        this.socket.on('reconnect_failed', () => {
          console.error('[SocketClient] Reconnect failed after max attempts');
          this.updateConnectionStatus({
            connected: false,
            reconnecting: false,
            error: 'Max reconnection attempts reached',
          });
        });

        this.setupEventListeners();
      } catch (error) {
        console.error('[SocketClient] Connection setup error:', error);
        reject(error);
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;
    const onAny = (names: string[], handler: (data: any) => void) => {
      names.forEach(n => this.socket?.on(n, handler));
    };

    onAny(['job:progress', EVENTS.JOB_PROGRESS], (data: any) => {
      this.emit(EVENTS.JOB_PROGRESS, data);
      this.handleJobProgress(data);
    });

    onAny(['job:completed', EVENTS.JOB_COMPLETED], (data: any) => {
      this.emit(EVENTS.JOB_COMPLETED, data);
      this.handleJobComplete(data);
    });

    onAny(['job:failed', EVENTS.JOB_FAILED], (data: any) => {
      this.emit(EVENTS.JOB_FAILED, data);
      this.handleJobError(data);
    });

    onAny(['job:chunk', EVENTS.MODEL_CHUNK], (data: any) => {
      this.emit(EVENTS.MODEL_CHUNK, data);
    });
  }

  subscribeToJob(
    jobId: string,
    onProgress: (d: any) => void,
    onComplete: (d: any) => void,
    onError: (e: string) => void
  ): () => void {
    if (!this.socket) throw new Error('Socket not connected');
    const sub: JobSubscription = { jobId, onProgress, onComplete, onError };
    this.jobSubscriptions.set(jobId, sub);

    if (this.isConnected) {
      this.socket.emit('subscribe:job', jobId);
    } else {
      // Queue subscription for when connection is restored
      this.queueMessage('subscribe:job', jobId, 'high');
    }

    return () => this.unsubscribeFromJob(jobId);
  }

  unsubscribeFromJob(jobId: string): void {
    if (!this.socket) return;
    this.jobSubscriptions.delete(jobId);
    this.socket.emit('unsubscribe:job', jobId);
  }

  cancelJob(jobId: string): void {
    if (!this.socket) throw new Error('Socket not connected');

    if (this.isConnected) {
      this.socket.emit('cancel:job', jobId);
    } else {
      // Queue for when connection is restored
      this.queueMessage('cancel:job', jobId, 'high');
    }
  }

  private handleJobProgress(data: any): void {
    const sub = this.jobSubscriptions.get(data.jobId);
    if (sub) sub.onProgress(data);
  }
  private handleJobComplete(data: any): void {
    const sub = this.jobSubscriptions.get(data.jobId);
    if (sub) {
      sub.onComplete(data);
      this.unsubscribeFromJob(data.jobId);
    }
  }
  private handleJobError(data: any): void {
    const sub = this.jobSubscriptions.get(data.jobId);
    if (sub) {
      sub.onError(data.error || 'unknown-error');
      this.unsubscribeFromJob(data.jobId);
    }
  }

  on(event: string, handler: (data: any) => void): () => void {
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, new Set());
    this.eventHandlers.get(event)!.add(handler);
    return () => this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: any): void {
    const hs = this.eventHandlers.get(event);
    if (hs)
      hs.forEach(h => {
        try {
          h(data);
        } catch {
          /* noop */
        }
      });
  }

  private resubscribeAll(): void {
    if (!this.socket || this.jobSubscriptions.size === 0) return;
    this.jobSubscriptions.forEach(sub => this.socket!.emit('subscribe:job', sub.jobId));
  }

  public isReady(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
  public getStatus() {
    return {
      connected: this.isConnected,
      reconnectCount: this.reconnectCount,
      subscriptions: this.jobSubscriptions.size,
      offlineQueueSize: this.offlineQueue.length,
      connectionStatus: { ...this.connectionStatus },
    };
  }
  async disconnect(): Promise<void> {
    this.stopHeartbeat();

    if (this.socket) {
      // Save session data before disconnecting
      this.saveSession();

      this.socket.disconnect();
      this.isConnected = false;
      this.jobSubscriptions.clear();
      this.eventHandlers.clear();
    }

    this.updateConnectionStatus({
      connected: false,
      reconnecting: false,
    });
  }

  /**
   * Queue message for offline delivery
   */
  private queueMessage(event: string, data: any, priority: 'high' | 'normal' | 'low' = 'normal'): void {
    if (this.offlineQueue.length >= this.maxQueueSize) {
      // Remove oldest low-priority message
      const lowPriorityIndex = this.offlineQueue.findIndex(msg => msg.priority === 'low');
      if (lowPriorityIndex >= 0) {
        this.offlineQueue.splice(lowPriorityIndex, 1);
      } else {
        // Remove oldest message
        this.offlineQueue.shift();
      }
    }

    this.offlineQueue.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event,
      data,
      timestamp: Date.now(),
      priority,
      retries: 0,
    });

    this.updateConnectionStatus({ offlineQueueSize: this.offlineQueue.length });
  }

  /**
   * Process offline queue when connection is restored
   */
  private processOfflineQueue(): void {
    if (this.offlineQueue.length === 0 || !this.socket) return;

    console.log(`[SocketClient] Processing ${this.offlineQueue.length} queued messages`);

    // Sort by priority (high first) then timestamp
    this.offlineQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.timestamp - b.timestamp;
    });

    const messagesToSend = [...this.offlineQueue];
    this.offlineQueue = [];

    this.updateConnectionStatus({ offlineQueueSize: 0 });

    // Send messages with small delays to avoid overwhelming
    messagesToSend.forEach((message, index) => {
      setTimeout(() => {
        try {
          if (this.socket && this.isConnected) {
            this.socket.emit(message.event, message.data);
            console.log(`[SocketClient] Sent queued message: ${message.event}`);
          } else {
            // Re-queue if still not connected
            this.queueMessage(message.event, message.data, message.priority);
          }
        } catch (error) {
          console.error(`[SocketClient] Failed to send queued message:`, error);
          // Re-queue on failure
          this.queueMessage(message.event, message.data, message.priority);
        }
      }, index * 100); // 100ms delay between messages
    });
  }

  /**
   * Save session data for restoration
   */
  private saveSession(): void {
    try {
      const sessionData = {
        subscriptions: Array.from(this.jobSubscriptions.keys()),
        timestamp: Date.now(),
      };
      localStorage.setItem('regen:socket:session', JSON.stringify(sessionData));
    } catch (error) {
      console.warn('[SocketClient] Failed to save session:', error);
    }
  }

  /**
   * Restore session data after reconnection
   */
  private restoreSession(): void {
    try {
      const savedSession = localStorage.getItem('regen:socket:session');
      if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        const age = Date.now() - sessionData.timestamp;

        // Only restore if session is less than 1 hour old
        if (age < 60 * 60 * 1000) {
          console.log(`[SocketClient] Restoring session with ${sessionData.subscriptions.length} subscriptions`);
          this.resubscribeJobs(sessionData.subscriptions);
          this.updateConnectionStatus({ sessionRestored: true });
        } else {
          localStorage.removeItem('regen:socket:session');
        }
      }
    } catch (error) {
      console.warn('[SocketClient] Failed to restore session:', error);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping', { timestamp: Date.now() });
      }
    }, 30000); // 30 second heartbeats
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Update connection status and notify callbacks
   */
  private updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...updates };
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback({ ...this.connectionStatus });
      } catch (error) {
        console.error('[SocketClient] Connection status callback error:', error);
      }
    });
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.connectionStatusCallbacks.add(callback);
    // Immediately call with current status
    callback({ ...this.connectionStatus });
    return () => this.connectionStatusCallbacks.delete(callback);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Resubscribe to specific job IDs
   */
  private resubscribeJobs(jobIds: string[]): void {
    if (!this.socket) return;

    jobIds.forEach(jobId => {
      this.socket.emit('subscribe:job', jobId);
    });
  }
}

let socketClient: SocketClient | null = null;
export function getSocketClient(): SocketClient {
  if (!socketClient) throw new Error('SocketClient not initialized. Call initSocketClient first.');
  return socketClient;
}
export async function initSocketClient(config: SocketConfig): Promise<SocketClient> {
  if (!socketClient) {
    socketClient = new SocketClient(config);
    await socketClient.connect();
  }
  return socketClient;
}
export function closeSocketClient(): void {
  if (socketClient) {
    socketClient.disconnect();
    socketClient = null;
  }
}
