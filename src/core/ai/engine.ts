import { sendPrompt, type LLMOptions, type LLMResponse, type LLMProvider } from '../llm/adapter';
import { trackAction } from '../supermemory/tracker';
// @ts-ignore - p-queue types may not be available
import PQueue from 'p-queue';

export type AITaskKind = 'search' | 'agent' | 'chat' | 'summary';

export interface AITaskRequest {
  kind: AITaskKind;
  prompt: string;
  context?: Record<string, unknown>;
  mode?: string;
  metadata?: Record<string, string | number | boolean>;
  llm?: LLMOptions;
  stream?: boolean;
  signal?: AbortSignal | null;
}

export interface AITaskResult {
  text: string;
  provider: string;
  model: string;
  usage?: LLMResponse['usage'];
  latency?: number;
  citations?: Array<{ title?: string; url?: string; snippet?: string; source?: string }>;
  estimated_cost_usd?: number;
}

type StreamHandler = (event: {
  type: 'token' | 'done' | 'error';
  data?: string | AITaskResult;
}) => void;

/**
 * Enhanced AI Engine with provider chaining, rate limiting, and state persistence
 */
export class AIEngine {
  private readonly apiBase =
    import.meta.env.VITE_APP_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' ? window.__OB_API_BASE__ : '');

  // WEEK 1 TASK 2: Rate limiting optimized for parallel voice queries <1.5s
  // Max 6 concurrent AI requests - allows reasoning + summary + other tasks simultaneously
  private readonly requestQueue = new PQueue({
    concurrency: 6, // Increased for better parallel performance
    timeout: 2000, // 2s timeout per task to prevent hanging
  });

  // Provider chain: try in order, fallback to next on failure
  private readonly providerChain: LLMProvider[] = ['openai', 'anthropic', 'ollama'];

  // State persistence key
  private readonly STATE_KEY = 'regen:ai_engine_state';

  async runTask(request: AITaskRequest, onStream?: StreamHandler): Promise<AITaskResult> {
    if (!request.prompt?.trim()) {
      throw new Error('Prompt is required for AI tasks');
    }

    // Save state before running
    this.saveState(request);

    // Use queue to limit concurrency (max 4 concurrent requests for parallel execution)
    return (await this.requestQueue.add(async (): Promise<AITaskResult> => {
      // Try backend first
      const backendResult = await this.callBackendTask(request, onStream);
      if (backendResult) {
        this.saveState(request, backendResult);
        return backendResult;
      }

      // Fallback to local LLM with provider chaining
      const localResult = await this.runLocalLLMWithFallback(request, onStream);
      this.saveState(request, localResult);
      return localResult;
    })) as AITaskResult;
  }

  /**
   * Run multiple AI tasks in parallel (e.g., reasoning + summarization)
   * This allows independent tasks to execute simultaneously for faster responses
   */
  async runParallelTasks(
    requests: AITaskRequest[],
    onStream?: (index: number, event: Parameters<StreamHandler>[0]) => void
  ): Promise<AITaskResult[]> {
    if (!requests.length) {
      return [];
    }

    // Execute all tasks in parallel (queue handles concurrency)
    const promises = requests.map((request, index) =>
      this.runTask(request, onStream ? event => onStream(index, event) : undefined)
    );

    return Promise.all(promises);
  }

  /**
   * Convenience helper: run reasoning + summarization in parallel for faster UX.
   * WEEK 1 TASK 2: Optimized for <1.5s voice query responses
   */
  async runReasonAndSummary(
    prompt: string,
    shared?: { context?: Record<string, unknown>; mode?: string }
  ): Promise<{ reasoning: AITaskResult; summary: AITaskResult }> {
    // Optimize prompts for speed: shorter, more focused prompts
    const optimizedPrompt = prompt.length > 200 ? `${prompt.substring(0, 200)}...` : prompt;

    const [reasoning, summary] = await this.runParallelTasks([
      {
        kind: 'agent',
        prompt: optimizedPrompt,
        context: shared?.context,
        mode: shared?.mode,
        llm: {
          temperature: 0.2,
          maxTokens: 150, // Limit tokens for faster response
        },
      },
      {
        kind: 'summary',
        prompt: `Brief summary:\n${optimizedPrompt}`,
        context: shared?.context,
        mode: shared?.mode,
        llm: {
          temperature: 0.1,
          maxTokens: 100, // Even shorter for summary
        },
      },
    ]);

    return { reasoning, summary };
  }

  private async callBackendTask(
    request: AITaskRequest,
    onStream?: StreamHandler
  ): Promise<AITaskResult | null> {
    if (!this.apiBase || typeof fetch === 'undefined') {
      return null;
    }
    const base = this.apiBase.replace(/\/$/, '');

    // Create AbortController with timeout (30 seconds default, 60 for streaming)
    const timeoutMs = request.stream ? 60000 : 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Combine user signal with timeout signal
    const combinedSignal = request.signal
      ? (() => {
          const combined = new AbortController();
          request.signal!.addEventListener('abort', () => combined.abort());
          controller.signal.addEventListener('abort', () => combined.abort());
          return combined.signal;
        })()
      : controller.signal;

    try {
      // Determine provider from request or default to ollama
      const provider = request.llm?.provider || 'ollama';
      const model = request.llm?.model || (provider === 'ollama' ? 'phi3:mini' : 'gpt-4o-mini');

      // Build payload based on provider
      let payload: any;
      if (provider === 'ollama') {
        payload = {
          model,
          stream: request.stream ?? false,
          messages: [
            {
              role: 'user',
              content: request.prompt,
            },
          ],
        };
      } else if (provider === 'openai') {
        payload = {
          model,
          messages: [
            {
              role: 'user',
              content: request.prompt,
            },
          ],
          temperature: request.llm?.temperature ?? 0.2,
          max_tokens: request.llm?.maxTokens ?? 800,
          stream: request.stream ?? false,
        };
      } else {
        // Anthropic or other
        payload = {
          model,
          messages: [
            {
              role: 'user',
              content: request.prompt,
            },
          ],
          max_tokens: request.llm?.maxTokens ?? 800,
        };
      }

      const response = await fetch(`${base}/api/ai/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          payload,
        }),
        signal: combinedSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('[AIEngine] Backend task failed', response.status, errorText);
        return null;
      }

      // Handle streaming response (SSE)
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        if (!reader) {
          return null;
        }
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        const tokens: string[] = [];
        while (true) {
          // Check if aborted before reading
          if (combinedSignal.aborted) {
            onStream?.({ type: 'error', data: 'Request timeout - please try again' });
            break;
          }
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const event of events) {
            if (event.startsWith('event: error')) {
              try {
                const json = event.replace('event: error', '').replace('data:', '').trim();
                const errorPayload = JSON.parse(json) as {
                  message?: string;
                  type?: string;
                  retryable?: boolean;
                  provider?: string;
                  model?: string;
                };
                const errorMessage = errorPayload.message || 'AI service error occurred';
                onStream?.({ type: 'error', data: errorMessage });
                console.error('[AIEngine] Task error', errorPayload);
              } catch {
                // Fallback to plain text if JSON parsing fails
                const errorText = event.replace('event: error', '').replace('data:', '').trim();
                onStream?.({ type: 'error', data: errorText || 'AI service error occurred' });
              }
            } else if (event.startsWith('event: done')) {
              try {
                const json = event.replace('event: done', '').replace('data:', '').trim();
                const payload = JSON.parse(json) as AITaskResult;
                if (!payload.text) {
                  payload.text = tokens.join('');
                }
                this.trackTelemetry(payload, request);
                onStream?.({ type: 'done', data: payload });
                return payload;
              } catch (error) {
                console.warn('[AIEngine] Failed to parse done payload', error);
                onStream?.({ type: 'done', data: tokens.join('') });
                return { text: tokens.join(''), provider: provider, model: model };
              }
            } else if (event.startsWith('data:')) {
              const token = event.replace('data:', '').trim();
              tokens.push(token);
              onStream?.({ type: 'token', data: token });
            }
          }
        }
        clearTimeout(timeoutId);
        return { text: tokens.join(''), provider: provider, model: model };
      }

      // Handle JSON response
      const responseData = await response.json();
      clearTimeout(timeoutId);

      // Parse response based on provider format
      let result: AITaskResult;
      if (provider === 'ollama') {
        // Ollama response format
        result = {
          text: responseData.message?.content || responseData.response || '',
          provider: 'ollama',
          model: responseData.model || model,
        };
      } else if (provider === 'openai') {
        // OpenAI response format
        result = {
          text: responseData.choices?.[0]?.message?.content || '',
          provider: 'openai',
          model: responseData.model || model,
          usage: responseData.usage,
        };
      } else {
        // Anthropic or other
        result = {
          text: responseData.content?.[0]?.text || responseData.content || '',
          provider: provider,
          model: responseData.model || model,
          usage: responseData.usage,
        };
      }

      this.trackTelemetry(result, request);
      onStream?.({ type: 'done', data: result });
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[AIEngine] Request timeout after', timeoutMs, 'ms');
        onStream?.({ type: 'error', data: 'Request timeout - please try again' });
      } else {
        console.warn('[AIEngine] Backend request error', error);
      }
      return null;
    }
  }

  /**
   * Run local LLM with provider chaining (OpenAI → Anthropic → Ollama)
   */
  private async runLocalLLMWithFallback(
    request: AITaskRequest,
    onStream?: StreamHandler
  ): Promise<AITaskResult> {
    let lastError: Error | null = null;

    // Try each provider in chain
    for (const provider of this.providerChain) {
      try {
        const response = await sendPrompt(request.prompt, {
          ...request.llm,
          provider,
          stream: Boolean(onStream) || request.llm?.stream,
          systemPrompt: request.llm?.systemPrompt ?? this.resolveSystemPrompt(request),
        });

        const result = {
          text: response.text,
          provider: response.provider,
          model: response.model,
          usage: response.usage,
          latency: response.latency,
        };

        this.saveState(request, result);
        this.trackTelemetry(result, request);
        onStream?.({ type: 'done', data: result });
        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(`[AIEngine] Provider ${provider} failed:`, error.message);

        // If not the last provider, try next one
        if (provider !== this.providerChain[this.providerChain.length - 1]) {
          continue;
        }
      }
    }

    // All providers failed
    const errorMessage = lastError?.message || 'All AI providers failed';
    onStream?.({ type: 'error', data: errorMessage });
    throw new Error(errorMessage);
  }

  private async runLocalLLM(
    request: AITaskRequest,
    onStream?: StreamHandler
  ): Promise<AITaskResult> {
    // Legacy method - use fallback version instead
    return this.runLocalLLMWithFallback(request, onStream);
  }

  /**
   * Save AI task state to localStorage for crash recovery
   */
  private saveState(request: AITaskRequest, result?: AITaskResult): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const state = {
        request: {
          kind: request.kind,
          prompt: request.prompt.substring(0, 200), // Truncate for storage
          mode: request.mode,
          timestamp: Date.now(),
        },
        result: result
          ? {
              provider: result.provider,
              model: result.model,
              textLength: result.text?.length || 0,
            }
          : undefined,
      };

      // Keep only last 10 states
      const existing = JSON.parse(localStorage.getItem(this.STATE_KEY) || '[]');
      existing.push(state);
      const recent = existing.slice(-10);
      localStorage.setItem(this.STATE_KEY, JSON.stringify(recent));
    } catch (error) {
      console.warn('[AIEngine] Failed to save state:', error);
    }
  }

  /**
   * Get last AI task state (for crash recovery)
   */
  getLastState(): { request: AITaskRequest; result?: AITaskResult } | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;

    try {
      const states = JSON.parse(localStorage.getItem(this.STATE_KEY) || '[]');
      const last = states[states.length - 1];
      if (!last) return null;

      return {
        request: {
          kind: last.request.kind || 'agent',
          prompt: last.request.prompt || '',
          mode: last.request.mode,
        },
        result: last.result
          ? {
              text: '',
              provider: last.result.provider,
              model: last.result.model,
            }
          : undefined,
      };
    } catch (error) {
      console.warn('[AIEngine] Failed to load state:', error);
      return null;
    }
  }

  private resolveSystemPrompt(request: AITaskRequest): string | undefined {
    switch (request.kind) {
      case 'search':
        return 'You are ReGen’s research copilot. Cite sources as [n].';
      case 'agent':
        return 'You are an execution agent. Be concise.';
      default:
        return undefined;
    }
  }

  private trackTelemetry(result: AITaskResult, request: AITaskRequest) {
    try {
      trackAction('ai_task_success', {
        kind: request.kind,
        provider: result.provider,
        model: result.model,
        latencyMs: result.latency ?? null,
        promptLength: request.prompt.length,
      }).catch(() => {});
    } catch (error) {
      console.warn('[AIEngine] Failed to track telemetry', error);
    }
  }
}

export const aiEngine = new AIEngine();
