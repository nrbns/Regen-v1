/* eslint-env node */
/**
 * LLM Provider Abstraction
 * Switches between free cloud APIs and local Ollama
 */

import axios from 'axios';
import { isOffline, detectSystemCapabilities, getRecommendedModel } from './mode-manager.js';
import { callLocalLLM, streamLocalLLM } from '../services/ollama/local-llm.js';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

// Free API endpoints (rotate for load balancing)
const FREE_ENDPOINTS = [
  {
    name: 'DeepInfra',
    url: 'https://api.deepinfra.com/v1/openai',
    models: ['meta-llama/Llama-3.1-70B-Instruct', 'mistralai/Mixtral-8x7B-Instruct'],
    apiKey: process.env.DEEPINFRA_API_KEY || 'free',
  },
  {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1',
    models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant'],
    apiKey: process.env.GROQ_API_KEY || 'free',
  },
  {
    name: 'Poe',
    url: 'https://api.poellm.dev/v1',
    models: ['claude-3.5-sonnet', 'gpt-4'],
    apiKey: process.env.POE_API_KEY || 'free',
  },
];

let currentEndpointIndex = 0;

/**
 * Get LLM instance (online or offline)
 */
export async function getLLM(options = {}) {
  const { model = null, temperature = 0.7, maxTokens = 2000, stream: _stream = false } = options;

  if (isOffline()) {
    // Offline: Use Ollama
    const capabilities = await detectSystemCapabilities();
    const recommendedModel = model || (await getRecommendedModel(capabilities));

    return {
      type: 'ollama',
      model: recommendedModel,
      baseUrl: OLLAMA_BASE_URL,
      call: async (prompt, opts = {}) => {
        return await callLocalLLM(prompt, {
          model: recommendedModel,
          temperature: opts.temperature || temperature,
          maxTokens: opts.maxTokens || maxTokens,
        });
      },
      stream: async function* (prompt, opts = {}) {
        for await (const chunk of streamLocalLLM(prompt, {
          model: recommendedModel,
          temperature: opts.temperature || temperature,
          maxTokens: opts.maxTokens || maxTokens,
        })) {
          yield chunk;
        }
      },
    };
  } else {
    // Online: Use free cloud APIs
    const endpoint = FREE_ENDPOINTS[currentEndpointIndex];
    currentEndpointIndex = (currentEndpointIndex + 1) % FREE_ENDPOINTS.length; // Rotate

    return {
      type: 'cloud',
      provider: endpoint.name,
      model: model || endpoint.models[0],
      baseUrl: endpoint.url,
      apiKey: endpoint.apiKey,
      call: async (prompt, opts = {}) => {
        return await callCloudLLM(endpoint, prompt, {
          model: model || endpoint.models[0],
          temperature: opts.temperature || temperature,
          maxTokens: opts.maxTokens || maxTokens,
        });
      },
      stream: async function* (prompt, opts = {}) {
        for await (const chunk of streamCloudLLM(endpoint, prompt, {
          model: model || endpoint.models[0],
          temperature: opts.temperature || temperature,
          maxTokens: opts.maxTokens || maxTokens,
        })) {
          yield chunk;
        }
      },
    };
  }
}

/**
 * Call cloud LLM (free API)
 */
async function callCloudLLM(endpoint, prompt, options = {}) {
  try {
    const response = await axios.post(
      `${endpoint.url}/chat/completions`,
      {
        model: options.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${endpoint.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return {
      text: response.data.choices[0].message.content,
      model: response.data.model,
      usage: response.data.usage,
    };
  } catch (error) {
    // Fallback to next endpoint
    console.warn(`[LLMProvider] ${endpoint.name} failed, trying next...`);
    const nextEndpoint =
      FREE_ENDPOINTS[(FREE_ENDPOINTS.indexOf(endpoint) + 1) % FREE_ENDPOINTS.length];
    if (nextEndpoint !== endpoint) {
      return await callCloudLLM(nextEndpoint, prompt, options);
    }
    throw error;
  }
}

/**
 * Stream cloud LLM (free API)
 */
async function* streamCloudLLM(endpoint, prompt, options = {}) {
  try {
    const response = await axios.post(
      `${endpoint.url}/chat/completions`,
      {
        model: options.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
      },
      {
        headers: {
          Authorization: `Bearer ${endpoint.apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        timeout: 0, // No timeout for streaming
      }
    );

    let buffer = '';
    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') return;
          try {
            const json = JSON.parse(data);
            const content = json.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    // Fallback to next endpoint
    console.warn(`[LLMProvider] ${endpoint.name} streaming failed, trying next...`);
    const nextEndpoint =
      FREE_ENDPOINTS[(FREE_ENDPOINTS.indexOf(endpoint) + 1) % FREE_ENDPOINTS.length];
    if (nextEndpoint !== endpoint) {
      yield* streamCloudLLM(nextEndpoint, prompt, options);
    } else {
      throw error;
    }
  }
}
