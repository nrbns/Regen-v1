/**
 * GOAL:
 * Create a reusable Socket.IO client for Regen Browser UI.
 *
 * REQUIREMENTS:
 * - Connect using JWT token
 * - Auto-reconnect with exponential backoff
 * - Expose methods:
 *   - connect(token)
 *   - disconnect()
 *   - startJob(payload)
 *   - cancelJob(jobId)
 * - Expose listeners:
 *   - onJobChunk
 *   - onJobProgress
 *   - onJobComplete
 *   - onJobFail
 * - Handle duplicate messages safely
 *
 * UX:
 * - Emit connection status events for UI (online/offline/reconnecting)
 */

import { io, Socket } from 'socket.io-client';

type ConnectionStatus = 'online' | 'offline' | 'reconnecting' | 'error';

interface JobEventPayload {
  jobId: string;
  payload: any;
  sequence: number;
  timestamp: number;
}

// Realtime Health Contract
export type RealtimeHealthMode = 'realtime' | 'degraded' | 'offline';
export interface RealtimeHealthContract {
  mode: RealtimeHealthMode;
  latencyMs: number;
  lastEventTs: number;
  source: 'ws' | 'polling' | 'cache';
}

interface RealtimeSocketConfig {
  serverUrl: string;
  autoConnect?: boolean;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  reconnectionAttempts?: number;
}

type StatusListener = (status: ConnectionStatus) => void;
type JobChunkListener = (data: JobEventPayload) => void;
type JobProgressListener = (data: JobEventPayload) => void;
type JobCheckpointListener = (data: JobEventPayload) => void;
type JobCompleteListener = (data: JobEventPayload) => void;
type JobFailListener = (data: JobEventPayload) => void;

const DEFAULT_CONFIG: Partial<RealtimeSocketConfig> = {
  autoConnect: false,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: Infinity,
};

/**
 * Realtime Socket Service for Regen Browser
 *
 * Handles WebSocket connection, job events, and reconnection logic
 */
export class RealtimeSocketService {
  private health: RealtimeHealthContract = {
    mode: 'offline',
    latencyMs: 0,
    lastEventTs: 0,
    source: 'ws',
  };
  private socket: Socket | null = null;
  private config: Required<RealtimeSocketConfig>;
  private token: string | null = null;
  private connectionStatus: ConnectionStatus = 'offline';

  // Listeners
  private statusListeners = new Set<StatusListener>();
  private jobChunkListeners = new Map<string, Set<JobChunkListener>>();
  private jobProgressListeners = new Map<string, Set<JobProgressListener>>();
  private jobCheckpointListeners = new Map<string, Set<JobCheckpointListener>>();
  private jobCompleteListeners = new Map<string, Set<JobCompleteListener>>();
  private jobFailListeners = new Map<string, Set<JobFailListener>>();

  // Deduplication tracking
  private processedSequences = new Map<string, Set<number>>();
  private subscribedJobs = new Set<string>();

  constructor(config: RealtimeSocketConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<RealtimeSocketConfig>;
  }

  /**
   * Connect to realtime server with JWT token
   */
  async connect(token: string): Promise<void> {
    if (this.socket?.connected) {
      console.warn('[RealtimeSocket] Already connected');
      return;
    }

    this.token = token;
    this.setStatus('reconnecting');

    try {
      this.socket = io(this.config.serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionDelayMax: this.config.reconnectionDelayMax,
        reconnectionAttempts: this.config.reconnectionAttempts,
      });

      this.setupEventHandlers();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket!.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.socket!.once('connect_error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      this.setStatus('online');
      console.log('[RealtimeSocket] Connected successfully');
    } catch (error) {
      this.setStatus('error');
      console.error('[RealtimeSocket] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from realtime server
   */
  disconnect(): void {
    if (!this.socket) return;

    this.socket.disconnect();
    this.socket = null;
    this.token = null;
    this.setStatus('offline');

    // Clear deduplication tracking
    this.processedSequences.clear();

    console.log('[RealtimeSocket] Disconnected');
  }

  /**
   * Start a new job
   */
  async startJob(payload: { type: string; input: any }): Promise<string> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit('start:job', payload, (response: { jobId?: string; error?: string }) => {
        if (response.error) {
          reject(new Error(response.error));
        } else if (response.jobId) {
          resolve(response.jobId);
        } else {
          reject(new Error('Invalid response from server'));
        }
      });
    });
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('cancel:job', jobId);
    console.log(`[RealtimeSocket] Cancelled job ${jobId}`);
  }

  async resumeJob(jobId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    await new Promise<void>((resolve, reject) => {
      this.socket!.emit('resume:job', jobId, (response: { ok?: boolean; error?: string }) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });

    console.log(`[RealtimeSocket] Resume requested for job ${jobId}`);
  }

  /**
   * Subscribe to job events
   */
  subscribeToJob(jobId: string): void {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('subscribe:job', jobId);
    this.subscribedJobs.add(jobId);

    // Initialize deduplication tracking for this job
    if (!this.processedSequences.has(jobId)) {
      this.processedSequences.set(jobId, new Set());
    }

    // Request a small backlog on initial subscribe for warm start
    this.socket.emit('reconnect:sync', { jobId, lastSequence: this.getLastSequence(jobId) });

    console.log(`[RealtimeSocket] Subscribed to job ${jobId}`);
  }

  /**
   * Unsubscribe from job events
   */
  unsubscribeFromJob(jobId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('unsubscribe:job', jobId);
    this.subscribedJobs.delete(jobId);

    // Clear deduplication tracking
    this.processedSequences.delete(jobId);

    console.log(`[RealtimeSocket] Unsubscribed from job ${jobId}`);
  }

  /**
   * Listen to connection status changes
   */
  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    // Immediately notify current status
    listener(this.connectionStatus);

    // Return unsubscribe function
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Listen to job chunk events
   */
  onJobChunk(jobId: string, listener: JobChunkListener): () => void {
    if (!this.jobChunkListeners.has(jobId)) {
      this.jobChunkListeners.set(jobId, new Set());
    }
    this.jobChunkListeners.get(jobId)!.add(listener);

    return () => this.jobChunkListeners.get(jobId)?.delete(listener);
  }

  /**
   * Listen to job progress events
   */
  onJobProgress(jobId: string, listener: JobProgressListener): () => void {
    if (!this.jobProgressListeners.has(jobId)) {
      this.jobProgressListeners.set(jobId, new Set());
    }
    this.jobProgressListeners.get(jobId)!.add(listener);

    return () => this.jobProgressListeners.get(jobId)?.delete(listener);
  }

  onJobCheckpoint(jobId: string, listener: JobCheckpointListener): () => void {
    if (!this.jobCheckpointListeners.has(jobId)) {
      this.jobCheckpointListeners.set(jobId, new Set());
    }
    this.jobCheckpointListeners.get(jobId)!.add(listener);

    return () => this.jobCheckpointListeners.get(jobId)?.delete(listener);
  }

  /**
   * Listen to job completion events
   */
  onJobComplete(jobId: string, listener: JobCompleteListener): () => void {
    if (!this.jobCompleteListeners.has(jobId)) {
      this.jobCompleteListeners.set(jobId, new Set());
    }
    this.jobCompleteListeners.get(jobId)!.add(listener);

    return () => this.jobCompleteListeners.get(jobId)?.delete(listener);
  }

  /**
   * Listen to job failure events
   */
  onJobFail(jobId: string, listener: JobFailListener): () => void {
    if (!this.jobFailListeners.has(jobId)) {
      this.jobFailListeners.set(jobId, new Set());
    }
    this.jobFailListeners.get(jobId)!.add(listener);

    return () => this.jobFailListeners.get(jobId)?.delete(listener);
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Setup event handlers on socket
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[RealtimeSocket] Connected');
      this.setStatus('online');
    });

    this.socket.on('disconnect', reason => {
      console.log(`[RealtimeSocket] Disconnected: ${reason}`);
      this.setStatus('offline');
    });

    this.socket.on('connect_error', error => {
      console.error('[RealtimeSocket] Connection error:', error);
      this.setStatus('error');
    });

    this.socket.io.on('reconnect_attempt', () => {
      console.log('[RealtimeSocket] Reconnecting...');
      this.setStatus('reconnecting');
    });

    this.socket.io.on('reconnect', () => {
      console.log('[RealtimeSocket] Reconnected successfully');
      this.setStatus('online');
      this.requestBacklog();
    });

    // Job events
    this.socket.on('job:chunk', (data: JobEventPayload) => {
      if (this.isDuplicate(data.jobId, data.sequence)) return;
      this.emitToListeners(this.jobChunkListeners, data.jobId, data);
    });

    this.socket.on('job:progress', (data: JobEventPayload) => {
      if (this.isDuplicate(data.jobId, data.sequence)) return;
      this.emitToListeners(this.jobProgressListeners, data.jobId, data);
    });

    this.socket.on('job:checkpoint', (data: JobEventPayload) => {
      if (this.isDuplicate(data.jobId, data.sequence)) return;
      this.emitToListeners(this.jobCheckpointListeners, data.jobId, data);
    });

    this.socket.on('job:completed', (data: JobEventPayload) => {
      if (this.isDuplicate(data.jobId, data.sequence)) return;
      this.emitToListeners(this.jobCompleteListeners, data.jobId, data);

      // Cleanup
      this.cleanupJobListeners(data.jobId);
    });

    this.socket.on('job:failed', (data: JobEventPayload) => {
      if (this.isDuplicate(data.jobId, data.sequence)) return;
      this.emitToListeners(this.jobFailListeners, data.jobId, data);

      // Cleanup
      this.cleanupJobListeners(data.jobId);
    });

    // Server events
    this.socket.on('server:shutdown', (data: { message: string }) => {
      console.warn('[RealtimeSocket] Server shutting down:', data.message);
      this.setStatus('reconnecting');
    });

    this.socket.on('sync:complete', (data: { jobId: string; replayed: number }) => {
      console.log(
        `[RealtimeSocket] Sync complete for job ${data.jobId}, replayed ${data.replayed}`
      );
    });
  }

  /**
   * Check if event is duplicate (based on sequence number)
   */
  private isDuplicate(jobId: string, sequence: number): boolean {
    const sequences = this.processedSequences.get(jobId);
    if (!sequences) return false;

    if (sequences.has(sequence)) {
      console.warn(`[RealtimeSocket] Duplicate event detected (job: ${jobId}, seq: ${sequence})`);
      return true;
    }

    sequences.add(sequence);
    return false;
  }

  /**
   * Emit event to all registered listeners for a job
   */
  private emitToListeners<T extends JobEventPayload>(
    listenersMap: Map<string, Set<(data: T) => void>>,
    jobId: string,
    data: T
  ): void {
    const listeners = listenersMap.get(jobId);
    if (!listeners) return;

    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('[RealtimeSocket] Listener error:', error);
      }
    });
  }

  /**
   * Cleanup listeners for completed/failed job
   */
  private cleanupJobListeners(jobId: string): void {
    this.jobChunkListeners.delete(jobId);
    this.jobProgressListeners.delete(jobId);
    this.jobCheckpointListeners.delete(jobId);
    this.jobCompleteListeners.delete(jobId);
    this.jobFailListeners.delete(jobId);
    this.processedSequences.delete(jobId);
    this.subscribedJobs.delete(jobId);
  }

  private requestBacklog(): void {
    if (!this.socket?.connected) return;

    this.subscribedJobs.forEach(jobId => {
      this.socket!.emit('reconnect:sync', {
        jobId,
        lastSequence: this.getLastSequence(jobId),
      });
    });
  }

  private getLastSequence(jobId: string): number {
    const sequences = this.processedSequences.get(jobId);
    if (!sequences || sequences.size === 0) return 0;
    return Math.max(...Array.from(sequences.values()));
  }

  /**
   * Update connection status and notify listeners
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.connectionStatus === status) return;

    this.connectionStatus = status;
    // Update health contract
    if (status === 'online') {
      this.health.mode = 'realtime';
      this.health.source = 'ws';
    } else if (status === 'reconnecting') {
      this.health.mode = 'degraded';
      this.health.source = 'polling';
    } else if (status === 'offline' || status === 'error') {
      this.health.mode = 'offline';
      this.health.source = 'cache';
    }
    this.health.lastEventTs = Date.now();
    // Latency calculation could be improved with ping/pong
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('[RealtimeSocket] Status listener error:', error);
      }
    });
  }

  /**
   * Get current realtime health contract
   */
  getHealth(): RealtimeHealthContract {
    return this.health;
  }
}

/**
 * Singleton instance for global access
 */
let globalSocketService: RealtimeSocketService | null = null;

/**
 * Get or create global socket service
 */
export function getSocketService(config?: RealtimeSocketConfig): RealtimeSocketService {
  if (!globalSocketService && config) {
    globalSocketService = new RealtimeSocketService(config);
  }

  if (!globalSocketService) {
    throw new Error('Socket service not initialized. Provide config on first call.');
  }

  return globalSocketService;
}

/**
 * Reset global socket service (for testing)
 */
export function resetSocketService(): void {
  if (globalSocketService) {
    globalSocketService.disconnect();
    globalSocketService = null;
  }
}
