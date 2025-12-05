import { sendPrompt } from '../llm/adapter';
import { trackAction } from '../supermemory/tracker';
// @ts-ignore - p-queue types may not be available
import PQueue from 'p-queue';
/**
 * Enhanced AI Engine with provider chaining, rate limiting, and state persistence
 */
export class AIEngine {
    apiBase = import.meta.env.VITE_APP_API_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        (typeof window !== 'undefined' ? window.__OB_API_BASE__ : '');
    // Rate limiting: max 2 concurrent AI requests to prevent overload
    requestQueue = new PQueue({ concurrency: 2 });
    // Provider chain: try in order, fallback to next on failure
    providerChain = ['openai', 'anthropic', 'ollama'];
    // State persistence key
    STATE_KEY = 'regen:ai_engine_state';
    async runTask(request, onStream) {
        if (!request.prompt?.trim()) {
            throw new Error('Prompt is required for AI tasks');
        }
        // Save state before running
        this.saveState(request);
        // Use queue to limit concurrency (max 2 concurrent requests)
        return (await this.requestQueue.add(async () => {
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
        }));
    }
    async callBackendTask(request, onStream) {
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
                request.signal.addEventListener('abort', () => combined.abort());
                controller.signal.addEventListener('abort', () => combined.abort());
                return combined.signal;
            })()
            : controller.signal;
        try {
            const response = await fetch(`${base}/api/ai/task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    kind: request.kind,
                    prompt: request.prompt,
                    context: request.context,
                    mode: request.mode,
                    metadata: request.metadata,
                    temperature: request.llm?.temperature ?? 0.2,
                    max_tokens: request.llm?.maxTokens ?? 800,
                }),
                signal: combinedSignal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.warn('[AIEngine] Backend task failed', response.status, errorText);
                return null;
            }
            if (response.headers.get('content-type')?.includes('text/event-stream')) {
                const reader = response.body?.getReader();
                if (!reader) {
                    return null;
                }
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                const tokens = [];
                while (true) {
                    // Check if aborted before reading
                    if (combinedSignal.aborted) {
                        onStream?.({ type: 'error', data: 'Request timeout - please try again' });
                        break;
                    }
                    const { value, done } = await reader.read();
                    if (done)
                        break;
                    buffer += decoder.decode(value, { stream: true });
                    const events = buffer.split('\n\n');
                    buffer = events.pop() || '';
                    for (const event of events) {
                        if (event.startsWith('event: error')) {
                            try {
                                const json = event.replace('event: error', '').replace('data:', '').trim();
                                const errorPayload = JSON.parse(json);
                                const errorMessage = errorPayload.message || 'AI service error occurred';
                                onStream?.({ type: 'error', data: errorMessage });
                                console.error('[AIEngine] Task error', errorPayload);
                            }
                            catch {
                                // Fallback to plain text if JSON parsing fails
                                const errorText = event.replace('event: error', '').replace('data:', '').trim();
                                onStream?.({ type: 'error', data: errorText || 'AI service error occurred' });
                            }
                        }
                        else if (event.startsWith('event: done')) {
                            try {
                                const json = event.replace('event: done', '').replace('data:', '').trim();
                                const payload = JSON.parse(json);
                                if (!payload.text) {
                                    payload.text = tokens.join('');
                                }
                                this.trackTelemetry(payload, request);
                                onStream?.({ type: 'done', data: payload });
                                return payload;
                            }
                            catch (error) {
                                console.warn('[AIEngine] Failed to parse done payload', error);
                                onStream?.({ type: 'done', data: tokens.join('') });
                                return { text: tokens.join(''), provider: 'openai', model: 'unknown' };
                            }
                        }
                        else if (event.startsWith('data:')) {
                            const token = event.replace('data:', '').trim();
                            tokens.push(token);
                            onStream?.({ type: 'token', data: token });
                        }
                    }
                }
                clearTimeout(timeoutId);
            }
            const data = (await response.json());
            clearTimeout(timeoutId);
            this.trackTelemetry(data, request);
            onStream?.({ type: 'done', data: data });
            return data;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                console.warn('[AIEngine] Request timeout after', timeoutMs, 'ms');
                onStream?.({ type: 'error', data: 'Request timeout - please try again' });
            }
            else {
                console.warn('[AIEngine] Backend request error', error);
            }
            return null;
        }
    }
    /**
     * Run local LLM with provider chaining (OpenAI → Anthropic → Ollama)
     */
    async runLocalLLMWithFallback(request, onStream) {
        let lastError = null;
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
            }
            catch (error) {
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
    async runLocalLLM(request, onStream) {
        // Legacy method - use fallback version instead
        return this.runLocalLLMWithFallback(request, onStream);
    }
    /**
     * Save AI task state to localStorage for crash recovery
     */
    saveState(request, result) {
        if (typeof window === 'undefined' || !window.localStorage)
            return;
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
        }
        catch (error) {
            console.warn('[AIEngine] Failed to save state:', error);
        }
    }
    /**
     * Get last AI task state (for crash recovery)
     */
    getLastState() {
        if (typeof window === 'undefined' || !window.localStorage)
            return null;
        try {
            const states = JSON.parse(localStorage.getItem(this.STATE_KEY) || '[]');
            const last = states[states.length - 1];
            if (!last)
                return null;
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
        }
        catch (error) {
            console.warn('[AIEngine] Failed to load state:', error);
            return null;
        }
    }
    resolveSystemPrompt(request) {
        switch (request.kind) {
            case 'search':
                return 'You are ReGen’s research copilot. Cite sources as [n].';
            case 'agent':
                return 'You are an execution agent. Be concise.';
            default:
                return undefined;
        }
    }
    trackTelemetry(result, request) {
        try {
            trackAction('ai_task_success', {
                kind: request.kind,
                provider: result.provider,
                model: result.model,
                latencyMs: result.latency ?? null,
                promptLength: request.prompt.length,
            }).catch(() => { });
        }
        catch (error) {
            console.warn('[AIEngine] Failed to track telemetry', error);
        }
    }
}
export const aiEngine = new AIEngine();
