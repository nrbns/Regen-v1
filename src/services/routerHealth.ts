/**
 * Router Health Service - Tier 2
 * Monitors health status of AI providers (Ollama + Hugging Face)
 */

export interface RouterHealth {
  ok: boolean;
  ollama: {
    available: boolean;
    avgLatencyMs: number | null;
  };
  hf: {
    available: boolean;
    avgLatencyMs: number | null;
  };
  redis?: 'connected' | 'disconnected';
  metrics?: {
    requests: {
      total: number;
      ollama: number;
      hf: number;
      fallbacks: number;
    };
  };
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let healthCallback: ((health: RouterHealth) => void) | null = null;

/**
 * Check router health status
 */
export async function checkRouterHealth(): Promise<RouterHealth> {
  try {
    // Check Ollama
    const ollamaHealth = await checkOllamaHealth();

    // Check Hugging Face
    const hfHealth = await checkHuggingFaceHealth();

    const ok = ollamaHealth.available || hfHealth.available;

    return {
      ok,
      ollama: ollamaHealth,
      hf: hfHealth,
      redis: 'connected', // TODO: Check Redis connection
      metrics: {
        requests: {
          total: 0,
          ollama: 0,
          hf: 0,
          fallbacks: 0,
        },
      },
    };
  } catch (error) {
    console.error('[RouterHealth] Health check failed', error);
    return {
      ok: false,
      ollama: { available: false, avgLatencyMs: null },
      hf: { available: false, avgLatencyMs: null },
    };
  }
}

/**
 * Check Ollama health
 */
async function checkOllamaHealth(): Promise<{ available: boolean; avgLatencyMs: number | null }> {
  const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (response.ok) {
      return { available: true, avgLatencyMs: latency };
    }
    return { available: false, avgLatencyMs: null };
  } catch {
    return { available: false, avgLatencyMs: null };
  }
}

/**
 * Check Hugging Face health
 */
async function checkHuggingFaceHealth(): Promise<{
  available: boolean;
  avgLatencyMs: number | null;
}> {
  // Hugging Face is cloud-based, so we assume it's available
  // In a real implementation, you'd ping their API
  return { available: true, avgLatencyMs: null };
}

/**
 * Start health polling
 */
export function startHealthPolling(callback: (health: RouterHealth) => void): void {
  healthCallback = callback;

  // Initial check
  checkRouterHealth().then(callback);

  // Poll every 30 seconds
  pollingInterval = setInterval(async () => {
    const health = await checkRouterHealth();
    if (healthCallback) {
      healthCallback(health);
    }
  }, 30000);
}

/**
 * Stop health polling
 */
export function stopHealthPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  healthCallback = null;
}
