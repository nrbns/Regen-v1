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

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

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

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

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

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

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

/**
 * Call Ollama API (local LLM)
 */
async function callOllama(
  prompt: string,
  options: LLMOptions,
  baseUrl: string
): Promise<LLMResponse> {
  const model = options.model || getDefaultModel('ollama');
  const startTime = Date.now();

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
    const healthController = new AbortController();
    const healthTimeoutId = setTimeout(() => healthController.abort(), 2000);

    const healthCheck = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: healthController.signal,
    });

    clearTimeout(healthTimeoutId);

    if (!healthCheck.ok) {
      throw new Error('Ollama not available');
    }
  } catch (healthError) {
    const { getOllamaErrorMessage } = await import('../../utils/ollamaCheck');
    throw {
      code: 'ollama_not_running',
      message: getOllamaErrorMessage(healthError),
      provider: 'ollama' as LLMProvider,
      retryable: false,
    } as LLMError;
  }

  const requestController = new AbortController();
  const requestTimeoutId = setTimeout(() => requestController.abort(), 60000); // 60 second timeout

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: requestController.signal,
  });

  clearTimeout(requestTimeoutId);

  if (!response.ok) {
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

      let response: LLMResponse;

      switch (provider) {
        case 'openai':
          response = await callOpenAI(prompt, options, apiKey!, baseUrl);
          break;
        case 'anthropic':
          response = await callAnthropic(prompt, options, apiKey!);
          break;
        case 'mistral':
          response = await callMistral(prompt, options, apiKey!, baseUrl);
          break;
        case 'ollama':
          response = await callOllama(prompt, options, baseUrl);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Log metrics
      if (response.latency) {
        console.debug(`[LLM] ${provider} response in ${response.latency}ms`, {
          model: response.model,
          tokens: response.usage?.totalTokens,
        });
      }

      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`[LLM] ${provider} failed:`, error.message);

      // If error is retryable, try next provider
      if (error.retryable && providers.length > 1) {
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
 * Stream a prompt to an LLM provider (for real-time responses)
 */
export async function streamPrompt(
  prompt: string,
  options: LLMOptions = {},
  onChunk: (chunk: string) => void
): Promise<LLMResponse> {
  // For streaming, prefer OpenAI or Anthropic
  const provider = options.provider || detectProvider() || 'openai';
  const apiKey = getApiKey(provider);

  if (!apiKey && provider !== 'ollama') {
    throw new Error(`API key required for ${provider}`);
  }

  // const baseUrl = getBaseUrl(provider); // Unused for now

  // Simplified streaming - for now, use regular sendPrompt and simulate streaming
  // In production, implement proper SSE/streaming
  const response = await sendPrompt(prompt, { ...options, provider });

  // Simulate streaming by chunking the response
  const words = response.text.split(' ');
  for (let i = 0; i < words.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
  }

  return response;
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
