/**
 * Mobile Redix Client
 *
 * Mobile-specific Redix client that works in both PWA and native mobile contexts.
 * Provides access to Redix AI engine, eco-scoring, and optimization features.
 */

/**
 * Mobile Redix Client
 *
 * Mobile-specific Redix client that works in both PWA and native mobile contexts.
 * Provides access to Redix AI engine, eco-scoring, and optimization features.
 */

// Get API base URL for Redix backend
const getRedixApiUrl = (): string => {
  // Use main API server (port 8000) which includes Redix routes
  // Redix routes are at /api/redix/* in the main API server
  const baseApiUrl =
    typeof window !== 'undefined'
      ? (window as any).__API_BASE_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_APP_API_URL ||
        'http://127.0.0.1:8000'
      : import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_APP_API_URL ||
        'http://127.0.0.1:8000';

  // Check for Redix-specific override
  if (typeof window !== 'undefined') {
    const redixOverride = (window as any).__REDIX_API_URL || import.meta.env.VITE_REDIX_HTTP_URL;
    if (redixOverride) return redixOverride;
  }

  // Default to main API server with /api/redix prefix
  return `${baseApiUrl}/api/redix`;
};

// WebSocket URL for Redix (optional, falls back to HTTP)
// Note: Currently using HTTP/SSE for mobile, WebSocket can be added later if needed

export interface RedixQueryRequest {
  query: string;
  context?: {
    url?: string;
    title?: string;
    tabId?: string;
  };
  options?: {
    provider?: 'openai' | 'anthropic' | 'mistral' | 'ollama' | 'auto';
    maxTokens?: number;
    temperature?: number;
  };
}

export interface RedixQueryResponse {
  text: string;
  provider: string;
  greenScore: number;
  latency: number;
  tokensUsed?: number;
}

/**
 * Query Redix AI engine
 * Uses /api/redix/ask endpoint (FastAPI backend) or /api/ai/task (if redix route not available)
 */
export async function queryRedix(request: RedixQueryRequest): Promise<RedixQueryResponse> {
  const API_BASE_URL = getRedixApiUrl();

  try {
    // Try Redix-specific endpoint first
    let response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.query,
        session_id: request.context?.tabId || 'mobile',
        stream: false,
        options: request.options,
      }),
    });

    // Fallback to main AI task endpoint if Redix endpoint not available
    if (!response.ok && response.status === 404) {
      const baseApiUrl = API_BASE_URL.replace('/api/redix', '');
      response = await fetch(`${baseApiUrl}/api/ai/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'chat',
          prompt: request.query,
          context: request.context,
          mode: 'research',
          llm: request.options,
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Redix query failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();

    // Normalize response format
    return {
      text: data.text || data.response || '',
      provider: data.provider || 'auto',
      greenScore: data.greenScore || data.green_score || 0,
      latency: data.latency || data.latency_ms || 0,
      tokensUsed: data.tokensUsed || data.tokens_used || data.usage?.total_tokens,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(
          'Cannot connect to Redix server. ' +
            'Make sure the API backend is running: npm run dev:api'
        );
      }
    }
    throw error;
  }
}

/**
 * Stream query from Redix (using Server-Sent Events)
 */
export function streamRedixQuery(
  request: RedixQueryRequest,
  onToken: (token: string) => void,
  onComplete: (response: RedixQueryResponse) => void,
  onError: (error: Error) => void
): { cancel: () => void } {
  const API_BASE_URL = getRedixApiUrl();
  const url = new URL(`${API_BASE_URL}/ask`, window.location.origin);
  url.searchParams.set('q', request.query);
  if (request.context?.url) {
    url.searchParams.set('contextUrl', request.context.url);
  }
  if (request.options?.provider) {
    url.searchParams.set('provider', request.options.provider);
  }

  const eventSource = new EventSource(url.toString());
  let fullText = '';
  let isComplete = false;

  const cleanup = () => {
    eventSource.close();
  };

  eventSource.addEventListener('token', (event: MessageEvent) => {
    if (isComplete) return;
    try {
      const data = JSON.parse(event.data);
      const token = data.token || data.text || '';
      if (token) {
        fullText += token;
        onToken(token);
      }
    } catch {
      // Ignore parse errors
    }
  });

  eventSource.addEventListener('done', (event: MessageEvent) => {
    if (isComplete) return;
    isComplete = true;
    try {
      const data = JSON.parse(event.data);
      onComplete({
        text: fullText || data.text || '',
        provider: data.provider || 'auto',
        greenScore: data.greenScore || 0,
        latency: data.latency || 0,
        tokensUsed: data.tokensUsed,
      });
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to parse response'));
    }
    cleanup();
  });

  eventSource.addEventListener('error', (event: MessageEvent) => {
    if (isComplete) return;
    isComplete = true;
    try {
      const data = JSON.parse(event.data);
      onError(new Error(data.message || 'Redix query error'));
    } catch {
      onError(new Error('Redix query failed'));
    }
    cleanup();
  });

  eventSource.onerror = () => {
    if (isComplete) return;
    isComplete = true;
    onError(new Error('Connection to Redix server failed'));
    cleanup();
  };

  return { cancel: cleanup };
}

/**
 * Check if Redix server is available
 */
export async function checkRedixHealth(): Promise<boolean> {
  try {
    const API_BASE_URL = getRedixApiUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
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
 * Get Redix eco score for an AI task
 */
export interface EcoScoreRequest {
  provider: string;
  tokens: number;
  energyWh?: number;
}

export interface EcoScoreResponse {
  score: number;
  energyWh: number;
  co2Grams?: number;
}

export async function getEcoScore(request: EcoScoreRequest): Promise<EcoScoreResponse> {
  const API_BASE_URL = getRedixApiUrl();

  try {
    const response = await fetch(`${API_BASE_URL}/eco/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Eco score calculation failed: ${response.status}`);
    }

    return await response.json();
  } catch {
    // Fallback calculation if API unavailable
    const energyWh = request.energyWh || (request.tokens / 1000) * 0.05;
    const score = Math.max(0, Math.min(100, 100 - (energyWh * 10 + request.tokens * 0.001)));

    return {
      score: Math.round(score),
      energyWh,
    };
  }
}

/**
 * Mobile Redix API client
 */
export const mobileRedix = {
  query: queryRedix,
  streamQuery: streamRedixQuery,
  checkHealth: checkRedixHealth,
  getEcoScore,
};
