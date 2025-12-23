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

export class SocketClient {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private isConnected = false;
  private reconnectCount = 0;
  private maxReconnectAttempts: number;
  private jobSubscriptions = new Map<string, JobSubscription>();
  private eventHandlers = new Map<string, Set<(data: any) => void>>();

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
        });

        this.socket.on('connect', () => {
          this.isConnected = true;
          this.reconnectCount = 0;
          this.emit('socket:connected', { timestamp: Date.now() });
          this.resubscribeAll();
          resolve();
        });

        this.socket.on('connect_error', (error: any) => {
          this.emit('socket:error', { error: error?.message || String(error) });
          if (this.reconnectCount === 0) reject(error);
        });

        this.socket.on('disconnect', (reason: string) => {
          this.isConnected = false;
          this.emit('socket:disconnected', { reason });
        });

        this.socket.on('reconnect_attempt', () => {
          this.reconnectCount++;
          this.emit('socket:reconnecting', { attempt: this.reconnectCount });
        });

        this.setupEventListeners();
      } catch (error) {
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
    this.socket.emit('subscribe:job', jobId);
    return () => this.unsubscribeFromJob(jobId);
  }

  unsubscribeFromJob(jobId: string): void {
    if (!this.socket) return;
    this.jobSubscriptions.delete(jobId);
    this.socket.emit('unsubscribe:job', jobId);
  }

  cancelJob(jobId: string): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('cancel:job', jobId);
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
    };
  }
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      this.jobSubscriptions.clear();
      this.eventHandlers.clear();
    }
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
