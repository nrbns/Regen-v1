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
}

export class NetworkMonitor {
  private listeners = new Set<(state: NetworkState) => void>();
  private currentState: NetworkState;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.currentState = this.getCurrentNetworkState();
    this.startMonitoring();
  }

  private getCurrentNetworkState(): NetworkState {
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
    };
  }

  private getConnectionInfo() {
    if (typeof navigator === 'undefined') return null;
    
    const connection = (navigator as any).connection ||
                      (navigator as any).mozConnection ||
                      (navigator as any).webkitConnection;
    
    return connection;
  }

  private startMonitoring(): void {
    // Listen to online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleStateChange());
      window.addEventListener('offline', () => this.handleStateChange());
    }

    // Listen to connection changes
    const connection = this.getConnectionInfo();
    if (connection) {
      connection.addEventListener('change', () => this.handleStateChange());
    }

    // Periodic check (every 30 seconds)
    this.checkInterval = setInterval(() => {
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

  cleanup(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
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
  const [state, setState] = useState<NetworkState>(() => 
    getNetworkMonitor().getState()
  );

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
  maxRetries: 3,
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
  fetchFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fetchFn();
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

export class OfflineRequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private storageKey = 'offline-request-queue';

  constructor() {
    this.loadFromStorage();
    this.startProcessing();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
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

  add(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): void {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queuedRequest);
    this.saveToStorage();

    // Try to process immediately if online
    if (getNetworkMonitor().isOnline()) {
      this.processQueue();
    }
  }

  private startProcessing(): void {
    // Listen for online events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[OfflineQueue] Coming online, processing queue');
        this.processQueue();
      });
    }

    // Also subscribe to network monitor
    getNetworkMonitor().subscribe(state => {
      if (state.status === 'online' && this.queue.length > 0) {
        this.processQueue();
      }
    });
  }

  async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    if (!getNetworkMonitor().isOnline()) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue[0];

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
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  getQueue(): QueuedRequest[] {
    return [...this.queue];
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
  options: SmartFetchOptions = {}
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
      getOfflineQueue().add({
        url,
        method: fetchOptions.method || 'GET',
        body: fetchOptions.body,
        headers: fetchOptions.headers as Record<string, string>,
      });
      
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
  const response = await fetchWithRetry(
    () => fetch(url, fetchOptions),
    retry
  );

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
    if (options.refetchOnReconnect && networkState.status === 'online' && data === null && !loading) {
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
