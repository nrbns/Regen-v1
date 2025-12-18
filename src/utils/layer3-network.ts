/**
 * Layer 3: Network & Offline Resilience
 *
 * Implements:
 * 1. Offline detection and state management
 * 2. Request retry with exponential backoff
 * 3. Request queue for offline requests
 * 4. Network quality monitoring
 * 5. Cache management
 */

import { useEffect, useState, useCallback } from 'react';

// ============================================================================
// 1. Offline Detection & State Management
// ============================================================================

export type ConnectionStatus = 'online' | 'offline' | 'slow';

export interface NetworkState {
  status: ConnectionStatus;
  quality: 'fast' | 'medium' | 'slow';
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
  isOnline: boolean;
  isSlow: boolean;
}

export class NetworkMonitor {
  private listeners = new Set<(state: NetworkState) => void>();
  private currentState: NetworkState;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onlineHandler?: () => void;
  private offlineHandler?: () => void;
  private connectionChangeHandler?: () => void;

  constructor() {
    this.currentState = this.getCurrentNetworkState();
    this.startMonitoring();
  }

  getCurrentNetworkState(): NetworkState {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const connection = this.getConnectionInfo();

    let quality: 'fast' | 'medium' | 'slow' = 'fast';
    let status: ConnectionStatus = online ? 'online' : 'offline';

    if (online && connection) {
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        quality = 'slow';
        status = 'slow';
      } else if (connection.effectiveType === '3g') {
        quality = 'medium';
      }

      if (connection.saveData) {
        quality = 'slow';
      }
    }

    return {
      status,
      quality,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 10,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false,
      isOnline: status !== 'offline',
      isSlow: quality === 'slow' || status === 'slow',
    };
  }

  private getConnectionInfo() {
    if (typeof navigator === 'undefined') return null;

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    return connection;
  }

  startMonitoring(): void {
    // Listen to online/offline events
    if (typeof window !== 'undefined') {
      this.onlineHandler = () => this.handleStateChange();
      this.offlineHandler = () => this.handleStateChange();
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }

    // Listen to connection changes
    const connection = this.getConnectionInfo();
    if (connection && typeof connection.addEventListener === 'function') {
      this.connectionChangeHandler = () => this.handleStateChange();
      connection.addEventListener('change', this.connectionChangeHandler);
    }

    // Periodic check (every 30 seconds)
    this.intervalId = setInterval(() => {
      this.handleStateChange();
    }, 30000);
  }

  private handleStateChange(): void {
    const newState = this.getCurrentNetworkState();

    // Only notify if state actually changed
    if (JSON.stringify(newState) !== JSON.stringify(this.currentState)) {
      this.currentState = newState;
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  subscribe(listener: (state: NetworkState) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.currentState);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): NetworkState {
    return this.currentState;
  }

  isOnline(): boolean {
    return this.currentState.status !== 'offline';
  }

  isFastConnection(): boolean {
    return this.currentState.quality === 'fast' && this.currentState.status === 'online';
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (typeof window !== 'undefined') {
      if (this.onlineHandler) window.removeEventListener('online', this.onlineHandler);
      if (this.offlineHandler) window.removeEventListener('offline', this.offlineHandler);
    }

    const connection = this.getConnectionInfo();
    if (
      connection &&
      typeof connection.removeEventListener === 'function' &&
      this.connectionChangeHandler
    ) {
      connection.removeEventListener('change', this.connectionChangeHandler);
    }
  }

  cleanup(): void {
    this.stopMonitoring();
    this.listeners.clear();
  }
}

// Singleton instance
let networkMonitorInstance: NetworkMonitor | null = null;

export function getNetworkMonitor(): NetworkMonitor {
  if (!networkMonitorInstance) {
    networkMonitorInstance = new NetworkMonitor();
  }
  return networkMonitorInstance;
}

/**
 * React hook for network state
 */
export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>(() => getNetworkMonitor().getState());

  useEffect(() => {
    const monitor = getNetworkMonitor();
    const unsubscribe = monitor.subscribe(setState);
    return unsubscribe;
  }, []);

  return state;
}

// ============================================================================
// 2. Request Retry with Exponential Backoff
// ============================================================================

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryOn?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 2,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  retryOn: (error: any) => {
    // Retry on network errors or 5xx server errors
    if (error?.name === 'TypeError' || error?.message?.includes('network')) {
      return true;
    }
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    if (error?.status === 408 || error?.status === 429) {
      return true; // Request timeout or rate limit
    }
    return false;
  },
  onRetry: () => {},
};

export async function fetchWithRetry<T>(
  fetchFnOrUrl: (() => Promise<T>) | RequestInfo,
  options: RetryOptions = {},
  fetchOptions?: RequestInit
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  const exec = async () => {
    if (typeof fetchFnOrUrl === 'function') {
      return await fetchFnOrUrl();
    }

    const response = await fetch(fetchFnOrUrl, fetchOptions);
    if (response instanceof Response && !response.ok) {
      const error: any = new Error(response.statusText || 'Request failed');
      error.status = response.status;
      throw error;
    }
    return response as unknown as T;
  };

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await exec();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === opts.maxRetries || !opts.retryOn(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt),
        opts.maxDelay
      );

      // Add jitter (±20%)
      const jitter = delay * 0.2 * (Math.random() * 2 - 1);
      const finalDelay = Math.max(0, delay + jitter);

      opts.onRetry(attempt + 1, error);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }

  throw lastError;
}

// ============================================================================
// 3. Offline Request Queue
// ============================================================================

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

export interface OfflineQueueOptions {
  maxSize?: number;
  batchSize?: number;
}

export class OfflineRequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private storageKey = 'offline-request-queue';
  private autoProcessInterval: ReturnType<typeof setInterval> | null = null;
  private maxSize: number;
  private batchSize: number;
  private onlineListener?: () => void;

  constructor(options: OfflineQueueOptions = {}) {
    this.maxSize = options.maxSize ?? 50;
    this.batchSize = options.batchSize ?? 10;
    this.loadFromStorage();
    this.startAutoProcess();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.queue = (Array.isArray(parsed) ? parsed : []).map((item: any) => ({
          id: item.id || Math.random().toString(36).substring(7),
          url: item.url || item.options?.url || '',
          method: item.method || item.options?.method || 'GET',
          body: item.body ?? item.options?.body,
          headers: item.headers || item.options?.headers,
          timestamp: item.timestamp || Date.now(),
          retryCount: item.retryCount ?? item.retries ?? 0,
        }));
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[OfflineQueue] Failed to save to storage:', error);
    }
  }

  async add(
    requestOrUrl: string | Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>,
    options?: RequestInit
  ): Promise<void> {
    const base: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'> =
      typeof requestOrUrl === 'string'
        ? {
            url: requestOrUrl,
            method: options?.method || 'GET',
            body: options?.body,
            headers: options?.headers as Record<string, string> | undefined,
          }
        : requestOrUrl;

    const queuedRequest: QueuedRequest = {
      ...base,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queuedRequest);

    // Cap queue size - drop oldest first
    if (this.queue.length > this.maxSize) {
      this.queue = this.queue.slice(this.queue.length - this.maxSize);
    }

    this.saveToStorage();

    // Try to process immediately if online
    if (getNetworkMonitor().isOnline()) {
      await this.processQueue();
    }
  }

  startAutoProcess(intervalMs: number = 2000): void {
    if (this.autoProcessInterval) return;

    if (typeof window !== 'undefined') {
      this.onlineListener = () => {
        if (this.queue.length > 0) {
          this.processQueue();
        }
      };
      window.addEventListener('online', this.onlineListener);
    }

    this.autoProcessInterval = setInterval(() => {
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }, intervalMs);
  }

  stopAutoProcess(): void {
    if (this.autoProcessInterval) {
      clearInterval(this.autoProcessInterval);
      this.autoProcessInterval = null;
    }
    if (typeof window !== 'undefined' && this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }
  }

  async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    if (!getNetworkMonitor().isOnline()) {
      return;
    }

    this.processing = true;

    const batch = [...this.queue.slice(0, this.batchSize)];

    for (const request of batch) {
      try {
        await this.executeRequest(request);

        // Success - remove from queue
        this.queue.shift();
        this.saveToStorage();
      } catch (error) {
        console.error('[OfflineQueue] Failed to execute request:', error);

        request.retryCount++;

        // Max retries reached, remove from queue
        if (request.retryCount >= 5) {
          console.warn('[OfflineQueue] Max retries reached, discarding request:', request.id);
          this.queue.shift();
          this.saveToStorage();
        } else {
          // Keep in queue, will retry later
          break;
        }
      }
    }

    this.processing = false;
  }

  private async executeRequest(request: QueuedRequest): Promise<void> {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body:
        typeof request.body === 'string'
          ? request.body
          : request.body
            ? JSON.stringify(request.body)
            : undefined,
    });

    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }
  }

  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  getPendingRequests(): QueuedRequest[] {
    return this.getQueue();
  }

  clear(): void {
    this.queue = [];
    this.saveToStorage();
  }

  getSize(): number {
    return this.queue.length;
  }
}

// Singleton instance
let offlineQueueInstance: OfflineRequestQueue | null = null;

export function getOfflineQueue(): OfflineRequestQueue {
  if (!offlineQueueInstance) {
    offlineQueueInstance = new OfflineRequestQueue();
  }
  return offlineQueueInstance;
}

// ============================================================================
// 4. Smart Fetch with Offline Support
// ============================================================================

export interface SmartFetchOptions extends RequestInit {
  retry?: RetryOptions;
  queueIfOffline?: boolean;
  cacheFirst?: boolean;
  cacheDuration?: number; // milliseconds
}

export async function smartFetch(
  url: string,
  options: SmartFetchOptions = {},
  queue: OfflineRequestQueue = getOfflineQueue()
): Promise<Response> {
  const {
    retry,
    queueIfOffline = false,
    cacheFirst = false,
    cacheDuration,
    ...fetchOptions
  } = options;

  const monitor = getNetworkMonitor();

  // Check if offline
  if (!monitor.isOnline()) {
    if (queueIfOffline && (fetchOptions.method === 'POST' || fetchOptions.method === 'PUT')) {
      // Queue for later execution
      await queue.add(url, fetchOptions);
      throw new Error('Offline: Request queued for later');
    }

    // Try cache
    if (cacheFirst && 'caches' in window) {
      const cached = await caches.match(url);
      if (cached) {
        return cached;
      }
    }

    throw new Error('Offline: No cached response available');
  }

  // Check cache first if requested
  if (cacheFirst && 'caches' in window) {
    const cached = await caches.match(url);
    if (cached) {
      const cacheTime = cached.headers.get('x-cache-time');
      if (cacheTime && cacheDuration) {
        const age = Date.now() - parseInt(cacheTime, 10);
        if (age < cacheDuration) {
          return cached;
        }
      } else if (!cacheDuration) {
        return cached;
      }
    }
  }

  // Execute with retry
  const response = await fetchWithRetry<Response>(url, retry, fetchOptions);

  // Cache response if requested
  if (cacheFirst && response.ok && 'caches' in window) {
    try {
      const cache = await caches.open('smart-fetch-cache');
      const clonedResponse = response.clone();

      // Add cache timestamp
      const headers = new Headers(clonedResponse.headers);
      headers.set('x-cache-time', Date.now().toString());

      const cachedResponse = new Response(clonedResponse.body, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers,
      });

      await cache.put(url, cachedResponse);
    } catch (error) {
      console.warn('[SmartFetch] Failed to cache response:', error);
    }
  }

  return response;
}

// ============================================================================
// 5. React Hooks
// ============================================================================

/**
 * Hook for offline-aware data fetching
 */
export function useOfflineFetch<T>(
  fetchFn: () => Promise<T>,
  options: {
    enabled?: boolean;
    refetchOnReconnect?: boolean;
  } = {}
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isOffline: boolean;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const networkState = useNetworkState();

  const execute = useCallback(async () => {
    if (options.enabled === false) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, options.enabled]);

  // Initial fetch
  useEffect(() => {
    execute();
  }, [execute]);

  // Refetch on reconnect
  useEffect(() => {
    if (
      options.refetchOnReconnect &&
      networkState.status === 'online' &&
      data === null &&
      !loading
    ) {
      execute();
    }
  }, [networkState.status, options.refetchOnReconnect, data, loading, execute]);

  return {
    data,
    loading,
    error,
    refetch: execute,
    isOffline: networkState.status === 'offline',
  };
}
