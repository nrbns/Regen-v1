/**
 * LLM Adapter - Unified interface for multiple LLM providers
 * Supports OpenAI, Anthropic, and Mistral with automatic fallback
 */

export type LLMProvider = 'openai' | 'anthropic' | 'mistral' | 'ollama';
export type LLMModel = string;

export interface LLMOptions {
  provider?: LLMProvider;
  model?: LLMModel;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
  systemPrompt?: string;
  stopSequences?: string[];
  /** per-request timeout in milliseconds (default 30000) */
  timeout?: number;
  /** per-provider retry attempts (default 3) */
  retryAttempts?: number;
}

export interface LLMResponse {
  text: string;
  raw: any;
  provider: LLMProvider;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  latency?: number;
}

export interface LLMError {
  code: string;
  message: string;
  provider: LLMProvider;
  retryable: boolean;
}

/**
 * Detect the best available provider based on environment variables
 */
function detectProvider(): LLMProvider | null {
  if (import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY) {
    return 'openai';
  }
  if (import.meta.env.VITE_ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  if (import.meta.env.VITE_MISTRAL_API_KEY || import.meta.env.MISTRAL_API_KEY) {
    return 'mistral';
  }
  if (import.meta.env.VITE_OLLAMA_BASE_URL || import.meta.env.OLLAMA_BASE_URL) {
    return 'ollama';
  }
  return null;
}

/**
 * Get API key for provider
 */
function getApiKey(provider: LLMProvider): string | null {
  const keys: Record<LLMProvider, string[]> = {
    openai: ['VITE_OPENAI_API_KEY', 'OPENAI_API_KEY'],
    anthropic: ['VITE_ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY'],
    mistral: ['VITE_MISTRAL_API_KEY', 'MISTRAL_API_KEY'],
    ollama: [], // No API key needed
  };

  for (const key of keys[provider] || []) {
    const value =
      import.meta.env[key] || (typeof process !== 'undefined' ? process.env[key] : null);
    if (value) return value;
  }
  return null;
}

/**
 * Get base URL for provider
 */
function getBaseUrl(provider: LLMProvider): string {
  const baseUrls: Record<LLMProvider, string> = {
    openai:
      import.meta.env.VITE_OPENAI_BASE_URL ||
      import.meta.env.OPENAI_BASE_URL ||
      'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    mistral: 'https://api.mistral.ai/v1',
    ollama:
      import.meta.env.VITE_OLLAMA_BASE_URL ||
      import.meta.env.OLLAMA_BASE_URL ||
      'http://localhost:11434',
  };
  return baseUrls[provider] || baseUrls.openai;
}

/**
 * Get default model for provider
 */
function getDefaultModel(provider: LLMProvider): string {
  const models: Record<LLMProvider, string> = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-sonnet-20241022',
    mistral: 'mistral-large-latest',
    ollama: 'llama3',
  };
  return models[provider] || models.openai;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  prompt: string,
  options: LLMOptions,
  _apiKey: string,
  _baseUrl: string
): Promise<LLMResponse> {
  const model = options.model || getDefaultModel('openai');
  const startTime = Date.now();

  const messages = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const body: any = {
    model,
    messages,
    max_tokens: options.maxTokens || 1000,
    temperature: options.temperature ?? 0.7,
  };

  if (options.topP !== undefined) body.top_p = options.topP;
  if (options.stopSequences) body.stop = options.stopSequences;
  if (options.stream) body.stream = true;

  // Use backend proxy instead of direct OpenAI API call
  // This avoids Tracking Prevention and keeps API keys secure
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const proxyUrl = `${API_BASE}/api/proxy/openai`;

  const response = await fetchWithTimeout(
    proxyUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    options.timeout ?? DEFAULT_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw {
      code: `openai_${response.status}`,
      message: error.error?.message || `OpenAI API error: ${response.statusText}`,
      provider: 'openai' as LLMProvider,
      retryable: response.status >= 500 || response.status === 429,
    } as LLMError;
  }

  const data = await response.json();
  const latency = Date.now() - startTime;

  return {
    text: data.choices[0]?.message?.content || '',
    raw: data,
    provider: 'openai',
    model: data.model || model,
    usage: data.usage,
    latency,
  };
}

/**
 * Call Anthropic API
 */
async function callAnthropic(
  prompt: string,
  options: LLMOptions,
  _apiKey: string
): Promise<LLMResponse> {
  const model = options.model || getDefaultModel('anthropic');
  const startTime = Date.now();

  const messages = [{ role: 'user', content: prompt }];

  const body: any = {
    model,
    messages,
    max_tokens: options.maxTokens || 1000,
    temperature: options.temperature ?? 0.7,
  };

  if (options.systemPrompt) body.system = options.systemPrompt;
  if (options.topP !== undefined) body.top_p = options.topP;
  if (options.stopSequences) body.stop_sequences = options.stopSequences;

  // Use backend proxy instead of direct Anthropic API call
  // This avoids Tracking Prevention and keeps API keys secure
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const proxyUrl = `${API_BASE}/api/proxy/anthropic`;

  const response = await fetchWithTimeout(
    proxyUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    options.timeout ?? DEFAULT_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw {
      code: `anthropic_${response.status}`,
      message: error.error?.message || `Anthropic API error: ${response.statusText}`,
      provider: 'anthropic' as LLMProvider,
      retryable: response.status >= 500 || response.status === 429,
    } as LLMError;
  }

  const data = await response.json();
  const latency = Date.now() - startTime;

  return {
    text: data.content[0]?.text || '',
    raw: data,
    provider: 'anthropic',
    model: data.model || model,
    usage: data.usage,
    latency,
  };
}

/**
 * Call Mistral API
 */
async function callMistral(
  prompt: string,
  options: LLMOptions,
  apiKey: string,
  baseUrl: string
): Promise<LLMResponse> {
  const model = options.model || getDefaultModel('mistral');
  const startTime = Date.now();

  const messages = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const body: any = {
    model,
    messages,
    max_tokens: options.maxTokens || 1000,
    temperature: options.temperature ?? 0.7,
  };

  if (options.topP !== undefined) body.top_p = options.topP;
  if (options.stopSequences) body.stop = options.stopSequences;

  const response = await fetchWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
    options.timeout ?? DEFAULT_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw {
      code: `mistral_${response.status}`,
      message: error.error?.message || `Mistral API error: ${response.statusText}`,
      provider: 'mistral' as LLMProvider,
      retryable: response.status >= 500 || response.status === 429,
    } as LLMError;
  }

  const data = await response.json();
  const latency = Date.now() - startTime;

  return {
    text: data.choices[0]?.message?.content || '',
    raw: data,
    provider: 'mistral',
    model: data.model || model,
    usage: data.usage,
    latency,
  };
}

// --- Ollama circuit-breaker ---
const OLLAMA_CIRCUIT_FAILURE_THRESHOLD =
  Number(import.meta.env.VITE_OLLAMA_CIRCUIT_FAILURE_THRESHOLD) || 3;
const OLLAMA_CIRCUIT_OPEN_MS = Number(import.meta.env.VITE_OLLAMA_CIRCUIT_OPEN_MS) || 60_000;

type CircuitRecord = { failures: number; openedAt: number | null };
const ollamaCircuit = new Map<string, CircuitRecord>();

function getCircuit(baseUrl: string) {
  if (!ollamaCircuit.has(baseUrl)) {
    ollamaCircuit.set(baseUrl, { failures: 0, openedAt: null });
  }
  return ollamaCircuit.get(baseUrl)!;
}

function recordOllamaFailure(baseUrl: string) {
  const rec = getCircuit(baseUrl);
  rec.failures += 1;
  if (rec.failures >= OLLAMA_CIRCUIT_FAILURE_THRESHOLD && !rec.openedAt) {
    rec.openedAt = Date.now();
    console.warn(`[LLM][Ollama] Circuit opened for ${baseUrl}`);
    emitTelemetry({ type: 'ollama.circuit.open', extra: { baseUrl } });
  }
}

function recordOllamaSuccess(baseUrl: string) {
  ollamaCircuit.delete(baseUrl);
  emitTelemetry({ type: 'ollama.circuit.closed', extra: { baseUrl } });
}

function isOllamaCircuitOpen(baseUrl: string) {
  const rec = getCircuit(baseUrl);
  if (!rec.openedAt) return false;
  const elapsed = Date.now() - rec.openedAt;
  if (elapsed > OLLAMA_CIRCUIT_OPEN_MS) {
    // allow retries after cool-off
    rec.failures = 0;
    rec.openedAt = null;
    return false;
  }
  return true;
}

// --- Test helpers ---
export function _test_setOllamaOpenedAt(baseUrl: string, openedAt: number) {
  const rec = getCircuit(baseUrl);
  rec.failures = OLLAMA_CIRCUIT_FAILURE_THRESHOLD;
  rec.openedAt = openedAt;
}

export function _test_resetOllamaCircuit(baseUrl?: string) {
  if (baseUrl) {
    ollamaCircuit.delete(baseUrl);
  } else {
    ollamaCircuit.clear();
  }
}

async function callOllama(
  prompt: string,
  options: LLMOptions,
  baseUrl: string
): Promise<LLMResponse> {
  const model = options.model || getDefaultModel('ollama');
  const startTime = Date.now();

  // Circuit check
  if (isOllamaCircuitOpen(baseUrl)) {
    throw {
      code: 'ollama_circuit_open',
      message: `Ollama is currently unavailable (circuit open) for ${baseUrl}`,
      provider: 'ollama' as LLMProvider,
      retryable: true,
    } as LLMError;
  }

  const messages = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const body: any = {
    model,
    messages,
    options: {
      num_predict: options.maxTokens || 1000,
      temperature: options.temperature ?? 0.7,
    },
  };

  if (options.topP !== undefined) body.options.top_p = options.topP;
  if (options.stopSequences) body.options.stop = options.stopSequences;

  // Check if Ollama is available first
  try {
    const healthCheck = await fetchWithTimeout(`${baseUrl}/api/tags`, { method: 'GET' }, 2000);

    if (!healthCheck.ok) {
      recordOllamaFailure(baseUrl);
      throw new Error('Ollama not available');
    }
  } catch (healthError) {
    recordOllamaFailure(baseUrl);
    const { getOllamaErrorMessage } = await import('../../utils/ollamaCheck');
    throw {
      code: 'ollama_not_running',
      message: getOllamaErrorMessage(healthError),
      provider: 'ollama' as LLMProvider,
      retryable: false,
    } as LLMError;
  }

  const response = await fetchWithTimeout(
    `${baseUrl}/api/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    options.timeout ?? 60000
  );

  if (!response.ok) {
    recordOllamaFailure(baseUrl);
    if (response.status === 404) {
      throw {
        code: 'ollama_model_not_found',
        message: `Model "${model}" not found. Run: ollama pull ${model}`,
        provider: 'ollama' as LLMProvider,
        retryable: false,
      } as LLMError;
    }
    throw {
      code: `ollama_${response.status}`,
      message: `Ollama API error: ${response.statusText}`,
      provider: 'ollama' as LLMProvider,
      retryable: false, // Local service, usually not retryable
    } as LLMError;
  }

  const data = await response.json();
  const latency = Date.now() - startTime;

  // success - reset circuit
  recordOllamaSuccess(baseUrl);

  return {
    text: data.message?.content || '',
    raw: data,
    provider: 'ollama',
    model: data.model || model,
    latency,
  };
}

/**
 * Send a prompt to an LLM provider
 * Automatically handles retries, fallbacks, and error recovery
 */
export async function sendPrompt(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
  const providers: LLMProvider[] = options.provider
    ? [options.provider]
    : (['openai', 'anthropic', 'mistral', 'ollama'] as LLMProvider[]);

  let lastError: LLMError | null = null;

  for (const provider of providers) {
    try {
      const apiKey = provider !== 'ollama' ? getApiKey(provider) : null;

      // Skip if API key is required but missing
      if (provider !== 'ollama' && !apiKey) {
        continue;
      }

      const baseUrl = getBaseUrl(provider);
      const attempts = options.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
      const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;

      const invokeProvider = async (): Promise<LLMResponse> => {
        switch (provider) {
          case 'openai':
            return await callOpenAI(
              prompt,
              options,
              apiKey!,
              baseUrl === undefined ? getBaseUrl('openai') : baseUrl
            );
          case 'anthropic':
            return await callAnthropic(prompt, options, apiKey!);
          case 'mistral':
            return await callMistral(prompt, options, apiKey!, baseUrl);
          case 'ollama':
            return await callOllama(prompt, options, baseUrl);
          default:
            throw new Error(`Unsupported provider: ${provider}`);
        }
      };

      // Use retries with exponential backoff for transient errors
      const start = Date.now();
      emitTelemetry({ type: 'llm.request.attempt_start', provider, attempt: 1 });
      const response = await retryWithBackoff(async () => {
        // Ensure provider-level requests use the configured timeout where applicable
        // callOpenAI / callAnthropic / callMistral / callOllama use fetchWithTimeout internally
        return await invokeProvider();
      }, attempts);

      const duration = Date.now() - start;
      // Log metrics
      if (response.latency) {
        console.debug(`[LLM] ${provider} response in ${response.latency}ms`, {
          model: response.model,
          tokens: response.usage?.totalTokens,
        });
      }
      emitTelemetry({
        type: 'llm.provider.success',
        provider,
        model: response.model,
        durationMs: duration,
        tokens: response.usage?.totalTokens,
      });

      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`[LLM] ${provider} failed:`, error?.message || error);
      emitTelemetry({
        type: 'llm.provider.error',
        provider,
        error: { message: error?.message, code: error?.code },
        extra: { retryable: error?.retryable },
      });

      // If error is retryable, try next provider
      if (error && error.retryable && providers.length > 1) {
        continue;
      }

      // If not retryable or last provider, throw
      if (provider === providers[providers.length - 1]) {
        throw error;
      }
    }
  }

  // All providers failed
  if (!lastError) {
    const detectedProvider = detectProvider();
    throw {
      code: 'no_provider',
      message: detectedProvider
        ? `No API key found for ${detectedProvider}. Please set environment variables.`
        : 'No LLM provider configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, MISTRAL_API_KEY, or OLLAMA_BASE_URL.',
      provider: 'openai' as LLMProvider,
      retryable: false,
    } as LLMError;
  }

  throw lastError;
}

/**
 * Simple SSE parser for OpenAI-style streaming responses
 */
function parseSSEChunk(data: string) {
  // data may be like: 'data: {"choices":[{"delta":{"content":"hi"}}]}' or 'data: [DONE]'
  const lines = data.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === 'data: [DONE]' || trimmed === '[DONE]') {
      return { done: true } as any;
    }
    if (trimmed.startsWith('data:')) {
      const payload = trimmed.replace(/^data:\s?/, '');
      try {
        const json = JSON.parse(payload);
        // Support delta style and message style
        const delta =
          json.choices?.[0]?.delta?.content ||
          json.choices?.[0]?.message?.content ||
          json.choices?.[0]?.text;
        if (delta !== undefined) return { text: delta } as any;
      } catch (e) {
        // Not JSON, ignore
      }
    }
  }
  return {} as any;
}

/**
 * Stream a prompt to an LLM provider (for real-time responses)
 */
export async function streamPrompt(
  prompt: string,
  options: LLMOptions = {},
  onChunk: (chunk: string) => void
): Promise<LLMResponse> {
  const provider = options.provider || detectProvider() || 'openai';

  // For OpenAI, use SSE-style streaming via backend proxy
  if (provider === 'openai') {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const proxyUrl = `${API_BASE}/api/proxy/openai`;
    const body: any = {
      model: options.model || getDefaultModel('openai'),
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature ?? 0.7,
      stream: true,
    };

    try {
      // Enforce a minimum timeout for streaming to account for module import and network variability
      const streamTimeout = Math.max(options.timeout ?? DEFAULT_TIMEOUT_MS, 5000);
      const resp = await fetchWithTimeout(
        proxyUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        streamTimeout
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: { message: resp.statusText } }));
        throw {
          code: `openai_${resp.status}`,
          message: err.error?.message || `OpenAI API error: ${resp.statusText}`,
          provider: 'openai' as LLMProvider,
          retryable: resp.status >= 500 || resp.status === 429,
        } as LLMError;
      }

      const decoder = new TextDecoder();
      let done = false;
      let accumulated = '';

      // Browser getReader() (Web Streams)
      if (typeof resp.body?.getReader === 'function') {
        const reader = resp.body.getReader();
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          const chunk = decoder.decode(value, { stream: true });
          // SSE payloads may be delimited by double-newlines
          const parts = (chunk || '').split('\n\n');
          for (const part of parts) {
            const parsed = parseSSEChunk(part);
            if (parsed.done) {
              done = true;
              break;
            }
            if (parsed.text) {
              accumulated += parsed.text;
              onChunk(parsed.text);
            }
          }
        }
      } else if (resp.body && typeof (resp.body as any)[Symbol.asyncIterator] === 'function') {
        // Node.js stream (node-fetch) - async iterator
        for await (const chunkBuf of resp.body as any) {
          const chunk = decoder.decode(chunkBuf, { stream: true });
          const parts = (chunk || '').split('\n\n');
          for (const part of parts) {
            const parsed = parseSSEChunk(part);
            if (parsed.done) {
              done = true;
              break;
            }
            if (parsed.text) {
              accumulated += parsed.text;
              onChunk(parsed.text);
            }
          }
          if (done) break;
        }
      } else {
        throw new Error('Streaming not supported by fetch response');
      }

      // Return a response with accumulated text
      return {
        text: accumulated,
        raw: null,
        provider: 'openai',
        model: options.model || getDefaultModel('openai'),
      } as LLMResponse;
    } catch (err: any) {
      // normalize
      if (err.name === 'AbortError') {
        throw {
          code: 'timeout',
          message: 'Request timed out',
          provider: 'openai' as LLMProvider,
          retryable: true,
        } as LLMError;
      }
      throw err;
    }
  }

  // Fallback: non-streaming providers -> use sendPrompt and simulate streaming
  const resp = await sendPrompt(prompt, { ...options, provider });
  const words = resp.text.split(' ');
  for (let i = 0; i < words.length; i++) {
    // small delay to imitate streaming
    await new Promise(resolve => setTimeout(resolve, 5));
    onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
  }

  return resp;
}

/**
 * Get available providers based on configured API keys
 */
export function getAvailableProviders(): LLMProvider[] {
  const providers: LLMProvider[] = [];

  if (getApiKey('openai')) providers.push('openai');
  if (getApiKey('anthropic')) providers.push('anthropic');
  if (getApiKey('mistral')) providers.push('mistral');
  if (getBaseUrl('ollama')) providers.push('ollama'); // Assume Ollama is available if URL is set

  return providers;
}

// --- Retry & timeout helpers ---
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 200;
const DEFAULT_MAX_DELAY_MS = 5000;
const DEFAULT_TIMEOUT_MS = 30_000;

import { emitTelemetry } from './telemetry';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomJitter(max: number) {
  return Math.floor(Math.random() * max);
}

function backoffDelay(attempt: number, base = DEFAULT_BASE_DELAY_MS, max = DEFAULT_MAX_DELAY_MS) {
  const exponential = Math.min(max, base * 2 ** (attempt - 1));
  const jitter = Math.floor(exponential * 0.1);
  return exponential + randomJitter(jitter);
}

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeout = DEFAULT_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempts = DEFAULT_RETRY_ATTEMPTS,
  baseDelay = DEFAULT_BASE_DELAY_MS,
  maxDelay = DEFAULT_MAX_DELAY_MS
): Promise<T> {
  let lastError: any = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable = !!(
        err &&
        (err.retryable || err.name === 'AbortError' || err instanceof TypeError)
      );
      // emit telemetry about the failure/attempt
      emitTelemetry({
        type: 'llm.provider.attempt_failed',
        attempt: i + 1,
        error: { message: err?.message, code: err?.code },
        extra: { retryable: isRetryable },
      });
      if (i === attempts - 1 || !isRetryable) {
        emitTelemetry({
          type: 'llm.provider.failed',
          error: { message: err?.message, code: err?.code },
        });
        break;
      }
      const delay = backoffDelay(i + 1, baseDelay, maxDelay);
      // small debug
      console.debug(`[LLM] retrying after ${delay}ms (attempt ${i + 1} of ${attempts})`);
      emitTelemetry({ type: 'llm.provider.retrying', attempt: i + 1, extra: { delay } });
      await sleep(delay);
    }
  }
  throw lastError;
}
