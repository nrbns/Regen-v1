/**
 * llama.cpp Server Client
 * Connects to local llama-server via WebSocket
 */

export interface ServerConnection {
  connected: boolean;
  port: number;
  modelLoaded: boolean;
  modelName?: string;
}

export interface GenerationRequest {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop?: string[];
  stream?: boolean;
}

export interface GenerationResponse {
  text: string;
  tokens: number;
  done: boolean;
}

type TokenCallback = (token: string) => void;

/**
 * Connect to local llama-server
 */
export async function connectToLlamaServer(port: number = 8080): Promise<ServerConnection> {
  try {
    // Check if server is running
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    if (!response.ok) {
      throw new Error('Server not responding');
    }

    const status = await response.json();

    return {
      connected: true,
      port,
      modelLoaded: status.model_loaded || false,
      modelName: status.model_name,
    };
  } catch {
    return {
      connected: false,
      port,
      modelLoaded: false,
    };
  }
}

/**
 * Generate text via WebSocket to llama-server
 */
export async function generateViaServer(
  request: GenerationRequest,
  port: number = 8080,
  onToken?: TokenCallback
): Promise<string> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/generate`);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'generate',
        ...request,
      }));
    };

    let fullText = '';

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'token') {
          fullText += data.token;
          onToken?.(data.token);
        } else if (data.type === 'done') {
          ws.close();
          resolve(fullText);
        } else if (data.type === 'error') {
          ws.close();
          reject(new Error(data.error));
        }
      } catch (parseError) {
        console.error('[LlamaServerClient] Parse error:', parseError);
      }
    };

    ws.onerror = () => {
      ws.close();
      reject(new Error('WebSocket connection failed'));
    };

    ws.onclose = () => {
      if (fullText) {
        resolve(fullText);
      } else {
        reject(new Error('Connection closed unexpectedly'));
      }
    };
  });
}

/**
 * Generate text via HTTP (non-streaming)
 */
export async function generateViaHTTP(
  request: GenerationRequest,
  port: number = 8080
): Promise<GenerationResponse> {
  const response = await fetch(`http://127.0.0.1:${port}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Start llama-server (via Tauri)
 */
export async function startLlamaServer(modelPath: string): Promise<ServerConnection> {
  if (typeof window === 'undefined' || !(window as any).__TAURI__) {
    throw new Error('Tauri runtime required to start server');
  }

  const { invoke } = await import('@tauri-apps/api/core');
  const status = await invoke('start_llama_server', { modelPath }) as {
    running: boolean;
    port?: number;
    model_loaded: boolean;
    model_name?: string;
  };

  return {
    connected: status.running,
    port: status.port || 8080,
    modelLoaded: status.model_loaded,
    modelName: status.model_name,
  };
}

/**
 * Stop llama-server
 */
export async function stopLlamaServer(): Promise<void> {
  if (typeof window === 'undefined' || !(window as any).__TAURI__) {
    return;
  }

  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('stop_llama_server');
}

/**
 * Get server status
 */
export async function getLlamaServerStatus(): Promise<ServerConnection> {
  if (typeof window === 'undefined' || !(window as any).__TAURI__) {
    // Try HTTP connection
    return await connectToLlamaServer();
  }

  const { invoke } = await import('@tauri-apps/api/core');
  const status = await invoke('get_llama_server_status') as {
    running: boolean;
    port?: number;
    model_loaded: boolean;
    model_name?: string;
  };

  return {
    connected: status.running,
    port: status.port || 8080,
    modelLoaded: status.model_loaded,
    modelName: status.model_name,
  };
}


