/**
 * Redix Router - Bridge to Redix Core HTTP API
 * 
 * Provides a clean, typed interface for calling Redix Core endpoints:
 * - /ask: Simple AI queries
 * - /workflow: Agentic workflows (research, multi-agent, code, ethics)
 * - /voice: Voice companion processing
 * - /fuse: LangChain fusion (sequential, router, simple)
 * - /metrics: System metrics and green score
 */

const REDIX_CORE_URL = import.meta.env.VITE_REDIX_CORE_URL || 'http://localhost:8001';

export interface RedixAskRequest {
  query: string;
  context?: {
    url?: string;
    title?: string;
    selection?: string;
  };
  options?: {
    provider?: 'auto' | 'openai' | 'anthropic' | 'mistral' | 'ollama';
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  };
}

export interface RedixAskResponse {
  text: string;
  greenScore?: number;
  latency?: number;
  tokensUsed?: number;
  model?: string;
}

export interface RedixWorkflowRequest {
  query: string;
  context?: string | {
    url?: string;
    title?: string;
    selection?: string;
  };
  workflowType?: 'research' | 'multi-agent' | 'code' | 'ethics';
  tools?: string[];
  options?: {
    maxIterations?: number;
    maxTokens?: number;
    temperature?: number;
  };
}

export interface RedixWorkflowResponse {
  result: string;
  steps?: Array<{
    step: number;
    action: string;
    result: string;
    tokens?: number;
  }>;
  greenScore?: number;
  latency?: number;
  tokensUsed?: number;
}

export interface RedixFuseRequest {
  query: string;
  context?: string;
  chainType?: 'sequential' | 'router' | 'simple';
  options?: {
    maxTokens?: number;
    temperature?: number;
  };
}

export interface RedixFuseResponse {
  result: string;
  greenScore?: number;
  latency?: number;
  tokensUsed?: number;
  chain?: string;
}

export interface RedixVoiceRequest {
  transcript: string;
  url?: string;
  title?: string;
  selection?: string;
  tabId?: string;
  context?: {
    batteryLevel?: number;
    memoryUsage?: number;
  };
}

export interface RedixVoiceResponse {
  response: string;
  action: 'speak' | 'search' | 'summarize' | 'note' | 'none';
  ecoScore?: number;
  latency?: number;
  tokensUsed?: number;
}

export interface RedixMetricsResponse {
  cpu?: number;
  memory?: number;
  greenScore?: number;
  uptime?: number;
}

/**
 * Ask Redix a simple question
 */
export async function askRedix(request: RedixAskRequest): Promise<RedixAskResponse> {
  try {
    const response = await fetch(`${REDIX_CORE_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Redix /ask API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[RedixRouter] /ask failed:', error);
    throw error;
  }
}

/**
 * Run an agentic workflow (research, multi-agent, code, ethics)
 */
export async function runWorkflow(request: RedixWorkflowRequest): Promise<RedixWorkflowResponse> {
  try {
    const response = await fetch(`${REDIX_CORE_URL}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Redix /workflow API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[RedixRouter] /workflow failed:', error);
    throw error;
  }
}

/**
 * Run LangChain fusion (sequential, router, simple chains)
 */
export async function fuseChains(request: RedixFuseRequest): Promise<RedixFuseResponse> {
  try {
    const response = await fetch(`${REDIX_CORE_URL}/fuse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Redix /fuse API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[RedixRouter] /fuse failed:', error);
    throw error;
  }
}

/**
 * Process voice command through Redix Voice Companion
 */
export async function processVoice(request: RedixVoiceRequest): Promise<RedixVoiceResponse> {
  try {
    const response = await fetch(`${REDIX_CORE_URL}/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Redix /voice API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[RedixRouter] /voice failed:', error);
    throw error;
  }
}

/**
 * Get Redix system metrics and green score
 */
export async function getMetrics(): Promise<RedixMetricsResponse> {
  try {
    const response = await fetch(`${REDIX_CORE_URL}/metrics`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Redix /metrics API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[RedixRouter] /metrics failed:', error);
    throw error;
  }
}

/**
 * Check if Redix Core is available
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${REDIX_CORE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Stream Redix /ask response using EventSource (SSE)
 */
export function streamAsk(
  request: RedixAskRequest,
  onChunk: (chunk: string) => void,
  onComplete: (response: RedixAskResponse) => void,
  onError: (error: Error) => void
): () => void {
  const url = new URL(`${REDIX_CORE_URL}/ask`);
  url.searchParams.set('stream', 'true');
  
  const eventSource = new EventSource(url.toString(), {
    withCredentials: false,
  });

  let fullText = '';

  eventSource.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.text) {
        fullText += data.text;
        onChunk(data.text);
      }
      if (data.done) {
        onComplete({
          text: fullText,
          greenScore: data.greenScore,
          latency: data.latency,
          tokensUsed: data.tokensUsed,
          model: data.model,
        });
        eventSource.close();
      }
    } catch (error) {
      console.error('[RedixRouter] Failed to parse SSE message:', error);
    }
  });

  eventSource.addEventListener('error', (error) => {
    onError(new Error('SSE connection failed'));
    eventSource.close();
  });

  // Send the request via POST (SSE doesn't support body, so we'll use query params for simple cases)
  // For complex requests, we'd need to use a different approach
  if (request.query) {
    url.searchParams.set('q', request.query);
  }

  return () => {
    eventSource.close();
  };
}

