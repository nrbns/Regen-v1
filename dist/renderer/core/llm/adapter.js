/**
 * LLM Adapter - Unified interface for multiple LLM providers
 * Supports OpenAI, Anthropic, and Mistral with automatic fallback
 */
/**
 * Detect the best available provider based on environment variables
 */
function detectProvider() {
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
function getApiKey(provider) {
    const keys = {
        openai: ['VITE_OPENAI_API_KEY', 'OPENAI_API_KEY'],
        anthropic: ['VITE_ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY'],
        mistral: ['VITE_MISTRAL_API_KEY', 'MISTRAL_API_KEY'],
        ollama: [], // No API key needed
    };
    for (const key of keys[provider] || []) {
        const value = import.meta.env[key] || (typeof process !== 'undefined' ? process.env[key] : null);
        if (value)
            return value;
    }
    return null;
}
/**
 * Get base URL for provider
 */
function getBaseUrl(provider) {
    const baseUrls = {
        openai: import.meta.env.VITE_OPENAI_BASE_URL ||
            import.meta.env.OPENAI_BASE_URL ||
            'https://api.openai.com/v1',
        anthropic: 'https://api.anthropic.com/v1',
        mistral: 'https://api.mistral.ai/v1',
        ollama: import.meta.env.VITE_OLLAMA_BASE_URL ||
            import.meta.env.OLLAMA_BASE_URL ||
            'http://localhost:11434',
    };
    return baseUrls[provider] || baseUrls.openai;
}
/**
 * Get default model for provider
 */
function getDefaultModel(provider) {
    const models = {
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
async function callOpenAI(prompt, options, _apiKey, _baseUrl) {
    const model = options.model || getDefaultModel('openai');
    const startTime = Date.now();
    const messages = [];
    if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    const body = {
        model,
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature ?? 0.7,
    };
    if (options.topP !== undefined)
        body.top_p = options.topP;
    if (options.stopSequences)
        body.stop = options.stopSequences;
    if (options.stream)
        body.stream = true;
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
            provider: 'openai',
            retryable: response.status >= 500 || response.status === 429,
        };
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
async function callAnthropic(prompt, options, _apiKey) {
    const model = options.model || getDefaultModel('anthropic');
    const startTime = Date.now();
    const messages = [{ role: 'user', content: prompt }];
    const body = {
        model,
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature ?? 0.7,
    };
    if (options.systemPrompt)
        body.system = options.systemPrompt;
    if (options.topP !== undefined)
        body.top_p = options.topP;
    if (options.stopSequences)
        body.stop_sequences = options.stopSequences;
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
            provider: 'anthropic',
            retryable: response.status >= 500 || response.status === 429,
        };
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
async function callMistral(prompt, options, apiKey, baseUrl) {
    const model = options.model || getDefaultModel('mistral');
    const startTime = Date.now();
    const messages = [];
    if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    const body = {
        model,
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature ?? 0.7,
    };
    if (options.topP !== undefined)
        body.top_p = options.topP;
    if (options.stopSequences)
        body.stop = options.stopSequences;
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
            provider: 'mistral',
            retryable: response.status >= 500 || response.status === 429,
        };
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
async function callOllama(prompt, options, baseUrl) {
    const model = options.model || getDefaultModel('ollama');
    const startTime = Date.now();
    const messages = [];
    if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    const body = {
        model,
        messages,
        options: {
            num_predict: options.maxTokens || 1000,
            temperature: options.temperature ?? 0.7,
        },
    };
    if (options.topP !== undefined)
        body.options.top_p = options.topP;
    if (options.stopSequences)
        body.options.stop = options.stopSequences;
    const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw {
            code: `ollama_${response.status}`,
            message: `Ollama API error: ${response.statusText}`,
            provider: 'ollama',
            retryable: false, // Local service, usually not retryable
        };
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
export async function sendPrompt(prompt, options = {}) {
    const providers = options.provider
        ? [options.provider]
        : ['openai', 'anthropic', 'mistral', 'ollama'];
    let lastError = null;
    for (const provider of providers) {
        try {
            const apiKey = provider !== 'ollama' ? getApiKey(provider) : null;
            // Skip if API key is required but missing
            if (provider !== 'ollama' && !apiKey) {
                continue;
            }
            const baseUrl = getBaseUrl(provider);
            let response;
            switch (provider) {
                case 'openai':
                    response = await callOpenAI(prompt, options, apiKey, baseUrl);
                    break;
                case 'anthropic':
                    response = await callAnthropic(prompt, options, apiKey);
                    break;
                case 'mistral':
                    response = await callMistral(prompt, options, apiKey, baseUrl);
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
        }
        catch (error) {
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
            provider: 'openai',
            retryable: false,
        };
    }
    throw lastError;
}
/**
 * Stream a prompt to an LLM provider (for real-time responses)
 */
export async function streamPrompt(prompt, options = {}, onChunk) {
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
export function getAvailableProviders() {
    const providers = [];
    if (getApiKey('openai'))
        providers.push('openai');
    if (getApiKey('anthropic'))
        providers.push('anthropic');
    if (getApiKey('mistral'))
        providers.push('mistral');
    if (getBaseUrl('ollama'))
        providers.push('ollama'); // Assume Ollama is available if URL is set
    return providers;
}
