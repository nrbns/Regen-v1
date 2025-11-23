/**
 * Electron Adapter for Omni Engine
 * Makes it easy for Electron to call the engine API
 */

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:3030';

export interface EngineCommandRequest {
  command: string;
  context?: {
    url?: string;
    html?: string;
    title?: string;
    tabId?: string;
    sessionId?: string;
  };
  mode?: 'research' | 'trade' | 'browser' | 'automation';
  language?: string;
}

export interface EngineCommandResponse {
  success: boolean;
  plan: {
    steps: Array<{
      action: string;
      params: Record<string, unknown>;
      description: string;
    }>;
  };
  result?: unknown;
  error?: string;
}

/**
 * Call Omni Engine API
 */
export async function callEngine(request: EngineCommandRequest): Promise<EngineCommandResponse> {
  try {
    const response = await fetch(`${ENGINE_URL}/api/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Engine API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw new Error(`Failed to call engine: ${err.message}`);
  }
}

/**
 * Connect to engine WebSocket
 */
export function connectEngineWebSocket(
  onMessage: (data: unknown) => void,
  onError?: (error: Error) => void
): WebSocket {
  const ws = new WebSocket(`${ENGINE_URL.replace('http', 'ws')}/ws`);

  ws.onopen = () => {
    console.log('[Engine] WebSocket connected');
  };

  ws.onmessage = event => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('[Engine] Failed to parse WebSocket message', error);
    }
  };

  ws.onerror = error => {
    console.error('[Engine] WebSocket error', error);
    if (onError) {
      onError(new Error('WebSocket connection failed'));
    }
  };

  ws.onclose = () => {
    console.log('[Engine] WebSocket disconnected');
  };

  return ws;
}
