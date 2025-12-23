/**
 * Check if backend server is connected and available
 */
// import { researchApi, systemApi } from '../lib/api-client';

export interface BackendConnectionStatus {
  connected: boolean;
  endpoint?: string;
  error?: string;
  latency?: number;
}

/**
 * Check backend connection by pinging the server
 */
export async function checkBackendConnection(): Promise<BackendConnectionStatus> {
  const API_BASE_URL =
    typeof window !== 'undefined'
      ? (window as any).__API_BASE_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_APP_API_URL ||
        'http://127.0.0.1:8000' // Match backend server port
      : import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_APP_API_URL ||
        'http://127.0.0.1:8000'; // Match backend server port

  try {
    const startTime = performance.now();

    // Try ping endpoint first (lightweight)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(`${API_BASE_URL}/api/ping`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const latency = Math.round(performance.now() - startTime);

    if (response.ok) {
      return {
        connected: true,
        endpoint: API_BASE_URL,
        latency,
      };
    }

    return {
      connected: false,
      endpoint: API_BASE_URL,
      error: `Server returned status ${response.status}`,
      latency,
    };
  } catch (error) {
    const latency = error instanceof Error && error.name === 'AbortError' ? 3000 : undefined;

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return {
          connected: false,
          endpoint: API_BASE_URL,
          error: 'Connection timeout - server may not be running',
          latency,
        };
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
        return {
          connected: false,
          endpoint: API_BASE_URL,
          error: 'Backend server is not running. Start with: npm run dev:server',
          latency,
        };
      }
      return {
        connected: false,
        endpoint: API_BASE_URL,
        error: error.message,
        latency,
      };
    }

    return {
      connected: false,
      endpoint: API_BASE_URL,
      error: 'Unknown connection error',
      latency,
    };
  }
}

/**
 * Check if research API endpoint is available
 */
export async function checkResearchBackend(): Promise<BackendConnectionStatus> {
  const API_BASE_URL =
    typeof window !== 'undefined'
      ? (window as any).__API_BASE_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_APP_API_URL ||
        'http://127.0.0.1:8000' // Match backend server port
      : import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_APP_API_URL ||
        'http://127.0.0.1:8000'; // Match backend server port

  try {
    const startTime = performance.now();

    // Try a lightweight research endpoint check
    // We'll just check if the endpoint exists (OPTIONS or HEAD request)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_BASE_URL}/api/research/enhanced`, {
      method: 'OPTIONS',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const latency = Math.round(performance.now() - startTime);

    // OPTIONS might not be supported, so try a minimal POST
    if (!response.ok && response.status === 405) {
      // Method not allowed is OK - endpoint exists
      return {
        connected: true,
        endpoint: `${API_BASE_URL}/api/research/enhanced`,
        latency,
      };
    }

    if (response.ok || response.status === 405) {
      return {
        connected: true,
        endpoint: `${API_BASE_URL}/api/research/enhanced`,
        latency,
      };
    }

    return {
      connected: false,
      endpoint: `${API_BASE_URL}/api/research/enhanced`,
      error: `Research endpoint returned status ${response.status}`,
      latency,
    };
  } catch (error) {
    const latency = error instanceof Error && error.name === 'AbortError' ? 3000 : undefined;

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return {
          connected: false,
          endpoint: `${API_BASE_URL}/api/research/enhanced`,
          error: 'Research endpoint timeout - backend may not be running',
          latency,
        };
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
        return {
          connected: false,
          endpoint: `${API_BASE_URL}/api/research/enhanced`,
          error: 'Research backend is not running. Start with: npm run dev:server',
          latency,
        };
      }
      return {
        connected: false,
        endpoint: `${API_BASE_URL}/api/research/enhanced`,
        error: error.message,
        latency,
      };
    }

    return {
      connected: false,
      endpoint: `${API_BASE_URL}/api/research/enhanced`,
      error: 'Unknown connection error',
      latency,
    };
  }
}
