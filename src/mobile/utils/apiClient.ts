/**
 * Mobile API Client
 *
 * Mobile-specific API client that works in both PWA and native mobile contexts.
 * Uses the same backend API as desktop, with mobile-optimized error handling.
 */

// Mobile API client - optimized for mobile devices

// Get API base URL - same as desktop, but can be overridden for mobile
const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Check for mobile-specific override first
    const mobileOverride = (window as any).__MOBILE_API_BASE_URL;
    if (mobileOverride) return mobileOverride;

    // Fall back to standard API base URL
    return (
      (window as any).__API_BASE_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_APP_API_URL ||
      'http://127.0.0.1:8000' // Match backend server port
    );
  }

  return (
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_APP_API_URL || 'http://127.0.0.1:8000' // Match backend server port
  );
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Make an API request from mobile
 */
export async function mobileApiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const API_BASE_URL = getApiBaseUrl();
  const { method = 'GET', body, headers = {}, timeout = 10000 } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return (await response.text()) as unknown as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }

      // Provide mobile-friendly error messages
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(
          'Cannot connect to server. ' + 'Make sure the backend API is running: npm run dev:api'
        );
      }
    }

    throw error;
  }
}

/**
 * Check if API server is available
 */
export async function checkMobileApiHealth(): Promise<boolean> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Mobile-specific API endpoints
 */
export const mobileApi = {
  // Health check
  health: () => mobileApiRequest<{ status: string }>('/health'),

  // Sync endpoints (for mobile sync)
  sync: {
    upload: (data: unknown) =>
      mobileApiRequest<{ success: boolean }>('/api/sync/upload', {
        method: 'POST',
        body: data,
      }),
    download: () => mobileApiRequest<unknown>('/api/sync/download'),
    status: () => mobileApiRequest<{ status: string; lastSync?: number }>('/api/sync/status'),
  },

  // Research endpoints (optimized for mobile)
  research: {
    query: (query: string) =>
      mobileApiRequest<{ results: unknown[] }>('/api/research/enhanced', {
        method: 'POST',
        body: { query },
        timeout: 15000, // Longer timeout for research queries
      }),
  },

  // Redix endpoints (Green Intelligence Engine)
  redix: {
    query: (query: string, options?: { provider?: string; maxTokens?: number }) =>
      mobileApiRequest<{ text: string; provider: string; greenScore: number }>('/api/redix/query', {
        method: 'POST',
        body: { query, options },
        timeout: 30000, // Longer timeout for AI queries
      }),
    health: () => mobileApiRequest<{ status: string }>('/api/redix/health'),
    ecoScore: (provider: string, tokens: number) =>
      mobileApiRequest<{ score: number; energyWh: number }>('/api/redix/eco/score', {
        method: 'POST',
        body: { provider, tokens },
      }),
  },

  // Tabs (for mobile tab sync)
  tabs: {
    list: () => mobileApiRequest<Array<unknown>>('/api/tabs'),
    create: (url: string) =>
      mobileApiRequest<{ id: string }>('/api/tabs', {
        method: 'POST',
        body: { url },
      }),
  },
};
