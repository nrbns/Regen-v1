/**
 * Socket Client Service
 * Central Socket.IO client for desktop/web apps
 *
 * Handles:
 * - Connection management with auto-reconnect
 * - Job progress subscriptions
 * - Event routing
 * - Exponential backoff retry
 * - Offline/online state
 */

import { io, Socket } from 'socket.io-client';
import { EVENTS } from '@shared/events';

interface SocketConfig {
  url: string;
  token: string;
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

export class SocketClient {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private isConnected = false;
  private reconnectCount = 0;
  private maxReconnectAttempts: number;
  private jobSubscriptions = new Map<string, JobSubscription>();
  private eventHandlers = new Map<string, Set<(data: any) => void>>();
  private backlog: any[] = [];
  private backlogLimit = 100;

  constructor(config: SocketConfig) {
    this.config = {
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      ...config,
    };
    this.maxReconnectAttempts = this.config.maxReconnectAttempts!;
  }

  /**
   * Connect to realtime server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Exponential backoff: 1s * 1.5^attempt, capped at 30s
        const calculateBackoff = (attempt: number) => {
          return Math.min(
            this.config.reconnectDelay! * Math.pow(1.5, Math.max(0, attempt - 1)),
            30000 // Max 30s between attempts
          );
        };

        this.socket = io(this.config.url, {
          auth: {
            token: this.config.token,
            deviceId: this.config.deviceId || `device-${Date.now()}`,
          },
          reconnection: true,
          reconnectionDelay: this.config.reconnectDelay,
          reconnectionDelayMax: 30000, // Max 30s between retries
          reconnectionAttempts: this.maxReconnectAttempts,
          transports: ['websocket', 'polling'],
          // Exponential backoff calculation
          reconnectionDelayFn: (attempt: number) => {
            const delay = calculateBackoff(attempt);
            console.log(
              `[SocketClient] Scheduled reconnect in ${Math.round(delay / 1000)}s (attempt ${attempt})`
            );
            return delay;
          },
        });

        // Connection established
        this.socket.on('connect', () => {
          console.log('[SocketClient] Connected to realtime server');
          this.isConnected = true;
          this.reconnectCount = 0;
          this.flushBacklog();
          // Re-subscribe to all jobs to recover after reconnect
          this.resubscribeAll();
          this.emit('socket:connected', { timestamp: Date.now() });
          resolve();
        });

        // Connection failed
        this.socket.on('connect_error', (error: any) => {
          console.error('[SocketClient] Connection error:', error);
          this.emit('socket:error', { error: error.message });
          if (this.reconnectCount === 0) {
            reject(error);
          }
        });

        // Disconnected
        this.socket.on('disconnect', (reason: string) => {
          console.log('[SocketClient] Disconnected:', reason);
          this.isConnected = false;
          this.emit('socket:disconnected', { reason });
        });

        // Reconnecting
        this.socket.on('reconnect_attempt', () => {
          this.reconnectCount++;
          console.log(
            `[SocketClient] Reconnection attempt ${this.reconnectCount}/${this.maxReconnectAttempts}`
          );
          this.emit('socket:reconnecting', { attempt: this.reconnectCount });
        });

        // Setup event listeners
        this.setupEventListeners();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Setup general event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    const onAny = (names: string[], handler: (data: any) => void) => {
      names.forEach(name => this.socket?.on(name, handler));
    };

    // Job progress (support v1 and legacy)
    onAny(['job:progress', EVENTS.JOB_PROGRESS], (data: any) => {
      this.emit(EVENTS.JOB_PROGRESS, data);
      this.handleJobProgress(data);
    });

    // Job completed
    onAny(['job:completed', EVENTS.JOB_COMPLETED], (data: any) => {
      this.emit(EVENTS.JOB_COMPLETED, data);
      this.handleJobComplete(data);
    });

    // Job error / failed
    onAny(['job:failed', EVENTS.JOB_FAILED], (data: any) => {
      this.emit(EVENTS.JOB_FAILED, data);
      this.handleJobError(data);
    });

    // Job chunk (streaming)
    onAny(['job:chunk', EVENTS.MODEL_CHUNK], (data: any) => {
      this.emit(EVENTS.MODEL_CHUNK, data);
    });

    // User notifications
    this.socket.on('user:notification', (data: any) => {
      this.emit('user:notification', data);
    });

    // Sync complete (backlog replay)
    this.socket.on('sync:complete', (data: any) => {
      console.log(`[SocketClient] Sync complete: replayed ${data.replayed} events`);
      this.emit('socket:synced', data);
    });
  }

  /**
   * Subscribe to job progress
   */
  subscribeToJob(
    jobId: string,
    onProgress: (data: any) => void,
    onComplete: (data: any) => void,
    onError: (error: string) => void
  ): () => void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    const subscription: JobSubscription = {
      jobId,
      onProgress,
      onComplete,
      onError,
    };

    this.jobSubscriptions.set(jobId, subscription);

    // Emit subscription to server
    this.socket.emit('subscribe:job', jobId);

    console.log(`[SocketClient] Subscribed to job ${jobId}`);

    // Return unsubscribe function
    return () => this.unsubscribeFromJob(jobId);
  }

  /**
   * Unsubscribe from job
   */
  unsubscribeFromJob(jobId: string): void {
    if (!this.socket) return;

    this.jobSubscriptions.delete(jobId);
    this.socket.emit('unsubscribe:job', jobId);

    console.log(`[SocketClient] Unsubscribed from job ${jobId}`);
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('cancel:job', jobId);
    console.log(`[SocketClient] Sent cancel signal for job ${jobId}`);
  }

  /**
   * Sync state after reconnection
   */
  reconnectSync(jobId: string, lastSequence: number): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('reconnect:sync', { jobId, lastSequence });
    console.log(`[SocketClient] Requested sync for job ${jobId} from sequence ${lastSequence}`);
  }

  /**
   * Handle job progress updates
   */
  private handleJobProgress(data: any): void {
    const subscription = this.jobSubscriptions.get(data.jobId);
    if (subscription) {
      subscription.onProgress(data);
    }
  }

  /**
   * Handle job completion
   */
  private handleJobComplete(data: any): void {
    const subscription = this.jobSubscriptions.get(data.jobId);
    if (subscription) {
      subscription.onComplete(data);
      this.unsubscribeFromJob(data.jobId);
    }
  }

  /**
   * Handle job errors
   */
  private handleJobError(data: any): void {
    const subscription = this.jobSubscriptions.get(data.jobId);
    if (subscription) {
      subscription.onError(data.error);
      this.unsubscribeFromJob(data.jobId);
    }
  }

  /**
   * On event (for custom listeners)
   */
  on(event: string, handler: (data: any) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[SocketClient] Handler error for ${event}:`, error);
        }
      });
    }

    // Add to backlog for debugging/replay
    if (this.backlog.length >= this.backlogLimit) {
      this.backlog.shift();
    }
    this.backlog.push({ event, data, timestamp: Date.now() });
  }

  /**
   * Flush backlogged messages when reconnected
   */
  private flushBacklog(): void {
    if (this.backlog.length > 0) {
      console.log(`[SocketClient] Processing ${this.backlog.length} backlogged events`);
      this.backlog.forEach(({ event, data }) => {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error(`[SocketClient] Handler error for ${event}:`, error);
            }
          });
        }
      });
      this.backlog = [];
    }
  }

  /**
   * Re-subscribe to all active job rooms after reconnect
   */
  private resubscribeAll(): void {
    if (!this.socket || this.jobSubscriptions.size === 0) return;
    this.jobSubscriptions.forEach(sub => {
      this.socket!.emit('subscribe:job', sub.jobId);
    });
  }

  /**
   * Check connection status
   */
  public isReady(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get connection status
   */
  public getStatus(): {
    connected: boolean;
    reconnectCount: number;
    subscriptions: number;
  } {
    return {
      connected: this.isConnected,
      reconnectCount: this.reconnectCount,
      subscriptions: this.jobSubscriptions.size,
    };
  }

  /**
   * Get backlog for debugging
   */
  public getBacklog(): any[] {
    return [...this.backlog];
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      this.jobSubscriptions.clear();
      this.eventHandlers.clear();
    }
  }
}

/**
 * Singleton instance
 */
let socketClient: SocketClient | null = null;

export function getSocketClient(): SocketClient {
  if (!socketClient) {
    throw new Error('SocketClient not initialized. Call initSocketClient first.');
  }
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
