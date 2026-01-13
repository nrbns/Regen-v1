import { sendPrompt, type LLMOptions, type LLMResponse, type LLMProvider } from '../llm/adapter';
import { trackAction } from '../supermemory/tracker';
// @ts-ignore - p-queue types may not be available
import PQueue from 'p-queue';
import { eventBus, EVENTS as _CORE_EVENTS } from '../state/eventBus';

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
/**
 * Event-driven AI Engine: wakes on event, sleeps after task, emits all results via eventBus
 */
export class AIEngine {
  private readonly apiBase =
    import.meta.env.VITE_APP_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' ? window.__OB_API_BASE__ : '');

  // BATTLE 1: One AI task at a time (non-negotiable)
  // WINNING PLAN: One task at a time ensures browsing speed is never affected
  private readonly requestQueue = new PQueue({
    concurrency: 1, // ONE task at a time - critical for performance
    timeout: 10000, // 10s hard timeout per task (increased from 2s for reliability)
  });

  // Provider chain: try in order, fallback to next on failure
  private readonly providerChain: LLMProvider[] = ['openai', 'anthropic', 'ollama'];

  // State persistence key
  private readonly STATE_KEY = 'regen:ai_engine_state';

  // BATTLE 1: AI unload on idle (30-60s)
  private idleTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly IDLE_TIMEOUT_MS = 45000; // 45s (between 30-60s as specified)
  private lastActivityTime = Date.now();
  private isUnloaded = false;

  // BATTLE 1: Track active tasks for cancellation on tab close
  private activeTasks: Map<string, { abortController: AbortController; tabId?: string }> = new Map();
  private taskIdCounter = 0;

  constructor() {
    // Listen for AI task requests via eventBus
    eventBus.on('ai:task:request', async (request: AITaskRequest) => {
      if (!request.prompt?.trim()) {
        eventBus.emit('ai:task:error', {
          request,
          error: 'Prompt is required for AI tasks',
        });
        return;
      }
      // Wake: process one task at a time (queue)
      this.wake(); // Wake AI from idle state
      
      // BATTLE 1: Create abort controller for this task
      const taskId = `task_${++this.taskIdCounter}`;
      const abortController = new AbortController();
      const tabId = request.context?.tabId as string | undefined;
      
      // Store active task
      this.activeTasks.set(taskId, { abortController, tabId });
      
      // Combine with user-provided signal if any
      const combinedSignal = request.signal
        ? (() => {
            const combined = new AbortController();
            request.signal!.addEventListener('abort', () => combined.abort());
            abortController.signal.addEventListener('abort', () => combined.abort());
            return combined.signal;
          })()
        : abortController.signal;
      
      // Update request with combined signal
      const requestWithSignal = { ...request, signal: combinedSignal };
      
      await this.requestQueue.add(async () => {
        eventBus.emit('ai:task:start', request);
        try {
          // Try backend first
          const backendResult = await this.callBackendTask(requestWithSignal, event => {
            if (event.type === 'token') {
              eventBus.emit('ai:task:token', { request, token: event.data });
            }
          });
          if (backendResult) {
            this.saveState(request, backendResult);
            eventBus.emit('ai:task:done', { request, result: backendResult });
            return;
          }
          // Fallback to local LLM
          const localResult = await this.runLocalLLMWithFallback(requestWithSignal, event => {
            if (event.type === 'token') {
              eventBus.emit('ai:task:token', { request, token: event.data });
            }
          });
          this.saveState(request, localResult);
          eventBus.emit('ai:task:done', { request, result: localResult });
        } catch (error: any) {
          // Check if error is due to cancellation
          if (error?.name === 'AbortError' || combinedSignal.aborted) {
            eventBus.emit('ai:task:cancelled', { request, reason: 'Task cancelled' });
          } else {
            eventBus.emit('ai:task:error', {
              request,
              error: error?.message || 'AI task failed',
            });
          }
        } finally {
          // Clean up task tracking
          this.activeTasks.delete(taskId);
        }
        // Sleep: done after task - schedule idle unload
        this.scheduleIdleUnload();
      });
    });

    // Listen for user activity to reset idle timer
    if (typeof window !== 'undefined') {
      const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      activityEvents.forEach(event => {
        window.addEventListener(event, () => this.resetIdleTimer(), { passive: true });
      });
    }

    // BATTLE 1: Kill AI on tab close
    eventBus.on('TAB_CLOSED', (tabId?: string) => {
      this.killTasksForTab(tabId);
    });

    // Also listen for custom tab-closed event (used by TabContentSurface)
    if (typeof window !== 'undefined') {
      const handleTabClose = ((e: CustomEvent) => {
        const tabId = e.detail?.tabId;
        this.killTasksForTab(tabId);
      }) as EventListener;
      
      window.addEventListener('tab-closed', handleTabClose);
      
      // Cleanup on window unload
      window.addEventListener('beforeunload', () => {
        window.removeEventListener('tab-closed', handleTabClose);
      });
    }
  }

  /**
   * Wake AI from idle state
   * BATTLE 1: AI wakes on event, sleeps after task
   */
  private wake(): void {
    if (this.isUnloaded) {
      this.isUnloaded = false;
      eventBus.emit('ai:engine:wake');
    }
    this.resetIdleTimer();
  }

  /**
   * Reset idle timer (called on activity or task completion)
   * BATTLE 1: Aggressive unload after 30-60s idle
   */
  private resetIdleTimer(): void {
    this.lastActivityTime = Date.now();
    
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
  }

  /**
   * Schedule AI unload after idle period
   * BATTLE 1: AI unloads after 30-60s idle
   */
  private scheduleIdleUnload(): void {
    this.resetIdleTimer();
    
    this.idleTimeout = setTimeout(() => {
      this.unload();
    }, this.IDLE_TIMEOUT_MS);
  }

  /**
   * Unload AI engine (free memory, stop background processes)
   * BATTLE 1: Aggressive unload to free resources
   */
  private unload(): void {
    if (this.isUnloaded) return;
    
    // Clear any pending tasks (but don't cancel running ones)
    // The queue will naturally drain
    
    this.isUnloaded = true;
    eventBus.emit('ai:engine:unload');
    
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
    
    console.log('[AIEngine] Unloaded after idle period');
  }

  /**
   * Check if AI engine is currently unloaded
   */
  isIdle(): boolean {
    return this.isUnloaded;
  }

  /**
   * Kill AI tasks for a specific tab (or all tasks if no tabId)
   * BATTLE 1: Kill AI on tab close - instant cancellation
   */
  private killTasksForTab(tabId?: string): void {
    let cancelledCount = 0;
    
    // Cancel all active tasks for this tab (or all tasks if no tabId)
    for (const [taskId, task] of this.activeTasks.entries()) {
      if (!tabId || task.tabId === tabId) {
        task.abortController.abort();
        this.activeTasks.delete(taskId);
        cancelledCount++;
      }
    }
    
    // Emit cancellation event
    if (cancelledCount > 0) {
      eventBus.emit('ai:task:cancelled', { tabId, reason: 'Tab closed', count: cancelledCount });
    }
    
    // If this was the last tab or we're killing all tasks, unload AI
    if (!tabId || this.activeTasks.size === 0) {
      this.unload();
    }
    
    if (cancelledCount > 0) {
      console.log(`[AIEngine] Killed ${cancelledCount} AI task(s) for tab: ${tabId || 'all'}`);
    }
  }

  /**
   * Cancel all running and pending AI tasks
   * BATTLE 1: Instant cancellation when needed
   */
  cancelAllTasks(): void {
    this.killTasksForTab();
  }

  // Remove imperative runTask entrypoint (enforced event-driven)

  /**
   * Run multiple AI tasks in parallel (e.g., reasoning + summarization)
   * This allows independent tasks to execute simultaneously for faster responses
   */
  // Remove imperative runParallelTasks and runReasonAndSummary (enforced event-driven)

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
