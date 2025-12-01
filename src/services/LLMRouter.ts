/**
 * LLM Router - Hybrid offline/cloud LLM routing
 * Routes requests to local LLM (offline) or cloud provider (online)
 *
 * Priority: Local (if available) → Cloud (fallback)
 */

import { isTauriRuntime } from '../lib/env';
import { ipc } from '../lib/ipc-typed';

import type { LLMProvider } from '../core/llm/adapter';

export interface LLMRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  text: string;
  provider: LLMProvider | 'local';
  model: string;
  latency: number;
  tokensUsed?: number;
}

/**
 * Check if local LLM (Ollama) is available
 */
async function isLocalLLMAvailable(): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false;
  }

  try {
    // Try to invoke Tauri command to check Ollama
    const result = await (ipc as any).invoke('check_ollama_status');
    return result?.available === true;
  } catch {
    return false;
  }
}

/**
 * Query local LLM (Ollama)
 */
async function queryLocalLLM(request: LLMRequest): Promise<LLMResponse> {
  const startTime = performance.now();

  try {
    if (!isTauriRuntime()) {
      throw new Error('Tauri runtime not available');
    }

    // Invoke Tauri command for local LLM
    const response = await (ipc as any).invoke('llm_query_local', {
      prompt: request.prompt,
      model: request.model || 'phi3:mini',
      temperature: request.temperature || 0.7,
      maxTokens: request.maxTokens || 1000,
    });

    const latency = performance.now() - startTime;

    return {
      text: response.text || response.response || '',
      provider: 'ollama',
      model: response.model || 'phi3:mini',
      latency,
      tokensUsed: response.tokensUsed,
    };
  } catch (error) {
    console.error('[LLMRouter] Local LLM query failed:', error);
    throw error;
  }
}

/**
 * Query cloud LLM (OpenAI/Anthropic/HuggingFace)
 */
async function queryCloudLLM(
  request: LLMRequest,
  provider: LLMProvider = 'openai'
): Promise<LLMResponse> {
  const startTime = performance.now();

  try {
    // Use existing AI engine for cloud providers
    const { aiEngine } = await import('../core/ai');

    const result = await aiEngine.runTask({
      kind: 'chat',
      prompt: request.prompt,
      llm: {
        provider,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        stream: request.stream,
      },
    });

    const latency = performance.now() - startTime;

    return {
      text: result.text || '',
      provider: (result.provider || provider) as LLMProvider,
      model: result.model || 'gpt-4o-mini',
      latency,
      tokensUsed: result.usage?.totalTokens,
    };
  } catch (error) {
    console.error(`[LLMRouter] Cloud LLM query failed (${provider}):`, error);
    throw error;
  }
}

/**
 * Main LLM Router - Routes to local or cloud based on availability
 */
export async function queryLLM(request: LLMRequest): Promise<LLMResponse> {
  // Check if offline mode is preferred
  const preferOffline = localStorage.getItem('llm_prefer_offline') === 'true';

  // Try local LLM first if preferred or if cloud is unavailable
  if (preferOffline) {
    const localAvailable = await isLocalLLMAvailable();
    if (localAvailable) {
      try {
        return await queryLocalLLM(request);
      } catch (error) {
        console.warn('[LLMRouter] Local LLM failed, falling back to cloud:', error);
        // Fall through to cloud
      }
    }
  }

  // Try cloud providers in order
  const providers: LLMProvider[] = ['openai', 'anthropic'];

  for (const provider of providers) {
    try {
      return await queryCloudLLM(request, provider);
    } catch (error) {
      console.warn(`[LLMRouter] ${provider} failed, trying next provider:`, error);
      continue;
    }
  }

  // If all cloud providers fail, try local as last resort
  const localAvailable = await isLocalLLMAvailable();
  if (localAvailable) {
    try {
      return await queryLocalLLM(request);
    } catch (error) {
      console.error('[LLMRouter] All providers failed:', error);
      throw new Error('All LLM providers unavailable');
    }
  }

  throw new Error('No LLM providers available');
}

/**
 * Stream LLM response (for real-time updates)
 */
export async function* streamLLM(request: LLMRequest): AsyncGenerator<string, void, unknown> {
  const preferOffline = localStorage.getItem('llm_prefer_offline') === 'true';

  // Try local streaming first
  if (preferOffline) {
    const localAvailable = await isLocalLLMAvailable();
    if (localAvailable && isTauriRuntime()) {
      try {
        // Use Tauri event listener for streaming
        const { listen } = await import('@tauri-apps/api/event');
        const unlisten = await listen('llm-stream-token', (event: any) => {
          // Yield tokens as they arrive
          return event.payload.text;
        });

        // Start streaming
        await (ipc as any).invoke('llm_query_local_stream', {
          prompt: request.prompt,
          model: request.model || 'phi3:mini',
        });

        // Cleanup
        unlisten();
        return;
      } catch (error) {
        console.warn('[LLMRouter] Local streaming failed, falling back:', error);
      }
    }
  }

  // Fallback to cloud streaming
  const { aiEngine } = await import('../core/ai');

  let streamBuffer = '';

  await aiEngine.runTask(
    {
      kind: 'chat',
      prompt: request.prompt,
      llm: {
        provider: 'openai',
        model: request.model,
        stream: true,
      },
    },
    event => {
      if (event.type === 'token' && typeof event.data === 'string') {
        streamBuffer += event.data;
      }
    }
  );

  // Yield accumulated tokens
  if (streamBuffer) {
    yield streamBuffer;
  }
}

/**
 * Set LLM preference (offline-first or cloud-first)
 */
export function setLLMPreference(preferOffline: boolean): void {
  localStorage.setItem('llm_prefer_offline', preferOffline.toString());
}

/**
 * Get current LLM preference
 */
export function getLLMPreference(): boolean {
  return localStorage.getItem('llm_prefer_offline') === 'true';
}
