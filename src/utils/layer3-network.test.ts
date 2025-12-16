/**
 * Layer 3: Network & Offline Resilience Tests
 * Tests for offline detection, request retry, offline queue, and smart fetch
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NetworkMonitor,
  fetchWithRetry,
  OfflineRequestQueue,
  smartFetch,
} from './layer3-network';

// Mock navigator.onLine
let mockOnline = true;
Object.defineProperty(global.navigator, 'onLine', {
  get: () => mockOnline,
  configurable: true,
});

// Mock NetworkInformation API
const mockConnection = {
  effectiveType: '4g' as const,
  downlink: 10,
  rtt: 50,
  saveData: false,
};

Object.defineProperty(global.navigator, 'connection', {
  get: () => mockConnection,
  configurable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

describe('Layer 3: NetworkMonitor', () => {
  let monitor: NetworkMonitor;

  beforeEach(() => {
    mockOnline = true;
    mockConnection.effectiveType = '4g';
    monitor = new NetworkMonitor();
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  it('should detect online state correctly', () => {
    mockOnline = true;
    const state = monitor.getCurrentNetworkState();
    expect(state.isOnline).toBe(true);
  });

  it('should detect offline state correctly', () => {
    mockOnline = false;
    const state = monitor.getCurrentNetworkState();
    expect(state.isOnline).toBe(false);
  });

  it('should detect connection quality', () => {
    mockConnection.effectiveType = '4g';
    const state = monitor.getCurrentNetworkState();
    expect(state.quality).toBe('4g');
  });

  it('should detect slow connection (2g)', () => {
    mockConnection.effectiveType = '2g';
    const state = monitor.getCurrentNetworkState();
    expect(state.isSlow).toBe(true);
    expect(state.quality).toBe('2g');
  });

  it('should subscribe to network changes', () => {
    const callback = vi.fn();
    const unsubscribe = monitor.subscribe(callback);

    // Simulate network change
    mockOnline = false;
    window.dispatchEvent(new Event('offline'));

    expect(callback).toHaveBeenCalled();
    unsubscribe();
  });

  it('should start and stop monitoring', () => {
    monitor.startMonitoring();
    expect(monitor['intervalId']).toBeDefined();

    monitor.stopMonitoring();
    expect(monitor['intervalId']).toBeNull();
  });
});

describe('Layer 3: fetchWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should succeed on first attempt', async () => {
    const mockResponse = new Response('success', { status: 200 });
    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const response = await fetchWithRetry('https://api.example.com/data');
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on network error', async () => {
    (global.fetch as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(new Response('success', { status: 200 }));

    const response = await fetchWithRetry('https://api.example.com/data');
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should retry on 5xx errors', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(new Response('error', { status: 500 }))
      .mockResolvedValueOnce(new Response('error', { status: 502 }))
      .mockResolvedValueOnce(new Response('success', { status: 200 }));

    const response = await fetchWithRetry('https://api.example.com/data');
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should not retry on 4xx errors (except 408, 429)', async () => {
    (global.fetch as any).mockResolvedValueOnce(new Response('error', { status: 404 }));

    const response = await fetchWithRetry('https://api.example.com/data');
    expect(response.status).toBe(404);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on 408 (Request Timeout)', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(new Response('timeout', { status: 408 }))
      .mockResolvedValueOnce(new Response('success', { status: 200 }));

    const response = await fetchWithRetry('https://api.example.com/data');
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should give up after max retries', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    await expect(fetchWithRetry('https://api.example.com/data')).rejects.toThrow(
      'Network error'
    );
    expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries = 3
  });

  it('should use exponential backoff with jitter', async () => {
    vi.useFakeTimers();
    (global.fetch as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(new Response('success', { status: 200 }));

    const promise = fetchWithRetry('https://api.example.com/data');

    // First retry after ~1000ms (with jitter)
    await vi.advanceTimersByTimeAsync(1200);
    await promise;

    expect(global.fetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('Layer 3: OfflineRequestQueue', () => {
  let queue: OfflineRequestQueue;

  beforeEach(() => {
    localStorageMock.clear();
    queue = new OfflineRequestQueue();
    mockOnline = true;
  });

  afterEach(() => {
    queue.stopAutoProcess();
  });

  it('should add request to queue', async () => {
    await queue.add('https://api.example.com/data', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' }),
    });

    const pending = queue.getPendingRequests();
    expect(pending).toHaveLength(1);
    expect(pending[0].url).toBe('https://api.example.com/data');
  });

  it('should persist queue to localStorage', async () => {
    await queue.add('https://api.example.com/data', { method: 'POST' });

    const stored = localStorageMock.getItem('offline-request-queue');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
  });

  it('should load queue from localStorage', () => {
    const mockQueue = [
      {
        id: '123',
        url: 'https://api.example.com/data',
        options: { method: 'POST' },
        timestamp: Date.now(),
        retries: 0,
      },
    ];
    localStorageMock.setItem('offline-request-queue', JSON.stringify(mockQueue));

    const newQueue = new OfflineRequestQueue();
    const pending = newQueue.getPendingRequests();
    expect(pending).toHaveLength(1);
    expect(pending[0].url).toBe('https://api.example.com/data');
  });

  it('should process queue when online', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('success', { status: 200 }));

    await queue.add('https://api.example.com/data', { method: 'POST' });
    expect(queue.getPendingRequests()).toHaveLength(1);

    await queue.processQueue();

    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/data', {
      method: 'POST',
    });
    expect(queue.getPendingRequests()).toHaveLength(0);
  });

  it('should not process queue when offline', async () => {
    global.fetch = vi.fn();
    mockOnline = false;

    await queue.add('https://api.example.com/data', { method: 'POST' });
    await queue.processQueue();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(queue.getPendingRequests()).toHaveLength(1);
  });

  it('should remove request after max retries', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await queue.add('https://api.example.com/data', { method: 'POST' });

    // Exhaust retries
    for (let i = 0; i < 6; i++) {
      await queue.processQueue();
    }

    expect(queue.getPendingRequests()).toHaveLength(0);
  });

  it('should start auto-processing on reconnect', async () => {
    const processSpy = vi.spyOn(queue, 'processQueue');
    queue.startAutoProcess();

    // Simulate going online
    mockOnline = true;
    window.dispatchEvent(new Event('online'));

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(processSpy).toHaveBeenCalled();
  });
});

describe('Layer 3: smartFetch', () => {
  let queue: OfflineRequestQueue;

  beforeEach(() => {
    localStorageMock.clear();
    queue = new OfflineRequestQueue();
    global.fetch = vi.fn();
    mockOnline = true;
  });

  it('should fetch directly when online', async () => {
    (global.fetch as any).mockResolvedValueOnce(new Response('success', { status: 200 }));

    const response = await smartFetch('https://api.example.com/data', {}, queue);
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should queue request when offline', async () => {
    mockOnline = false;

    await smartFetch('https://api.example.com/data', { method: 'POST' }, queue);

    const pending = queue.getPendingRequests();
    expect(pending).toHaveLength(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return cached response when offline with cache-first', async () => {
    mockOnline = false;
    const mockCache = {
      match: vi.fn().mockResolvedValueOnce(new Response('cached', { status: 200 })),
    };
    global.caches = {
      open: vi.fn().mockResolvedValueOnce(mockCache),
    } as any;

    const response = await smartFetch(
      'https://api.example.com/data',
      { cacheFirst: true },
      queue
    );

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('cached');
  });

  it('should throw error when offline and no cache available', async () => {
    mockOnline = false;
    const mockCache = {
      match: vi.fn().mockResolvedValueOnce(undefined),
    };
    global.caches = {
      open: vi.fn().mockResolvedValueOnce(mockCache),
    } as any;

    await expect(
      smartFetch('https://api.example.com/data', { cacheFirst: true }, queue)
    ).rejects.toThrow('Offline and no cached response available');
  });

  it('should use fetchWithRetry for network requests', async () => {
    (global.fetch as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(new Response('success', { status: 200 }));

    const response = await smartFetch('https://api.example.com/data', {}, queue);
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });
});

describe('Layer 3: Performance Benchmarks', () => {
  it('should complete network state check in <5ms', () => {
    const monitor = new NetworkMonitor();
    const start = performance.now();
    monitor.getCurrentNetworkState();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
    monitor.stopMonitoring();
  });

  it('should add 100 requests to queue in <50ms', async () => {
    const queue = new OfflineRequestQueue();
    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      await queue.add(`https://api.example.com/data/${i}`, { method: 'POST' });
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
    expect(queue.getPendingRequests()).toHaveLength(100);
  });

  it('should process 50 queued requests in <500ms', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('success', { status: 200 }));
    const queue = new OfflineRequestQueue();

    for (let i = 0; i < 50; i++) {
      await queue.add(`https://api.example.com/data/${i}`, { method: 'POST' });
    }

    const start = performance.now();
    await queue.processQueue();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500);
    expect(queue.getPendingRequests()).toHaveLength(0);
  });
});
