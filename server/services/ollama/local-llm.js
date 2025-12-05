/* eslint-env node */
/**
 * Local LLM Integration (Ollama)
 * Replace cloud APIs with local models
 */

import axios from 'axios';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

/**
 * Call local Ollama LLM
 */
export async function callLocalLLM(prompt, options = {}) {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 2000,
    systemPrompt = null,
  } = options;

  const messages = [];
  
  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: prompt,
  });

  try {
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/chat`,
      {
        model,
        messages,
        options: {
          temperature,
          num_predict: maxTokens,
        },
        stream: false,
      },
      {
        timeout: 120000, // 2 minute timeout
      }
    );

    return {
      text: response.data.message?.content || '',
      model: response.data.model || model,
      usage: response.data.eval_count ? {
        prompt_tokens: response.data.prompt_eval_count,
        completion_tokens: response.data.eval_count,
        total_tokens: response.data.prompt_eval_count + response.data.eval_count,
      } : null,
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Ollama not running. Start with: ollama serve');
    }
    throw new Error(`Ollama API error: ${error.message}`);
  }
}

/**
 * Stream local Ollama LLM
 */
export async function* streamLocalLLM(prompt, options = {}) {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 2000,
    systemPrompt = null,
  } = options;

  const messages = [];
  
  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: prompt,
  });

  try {
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/chat`,
      {
        model,
        messages,
        options: {
          temperature,
          num_predict: maxTokens,
        },
        stream: true,
      },
      {
        responseType: 'stream',
        timeout: 120000,
      }
    );

    let buffer = '';
    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
            if (data.done) {
              return;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Ollama not running. Start with: ollama serve');
    }
    throw new Error(`Ollama streaming error: ${error.message}`);
  }
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaHealth() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000,
    });
    return {
      available: true,
      models: response.data.models || [],
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
    };
  }
}

/**
 * Pull model if not available
 */
export async function ensureModel(model = DEFAULT_MODEL) {
  try {
    const health = await checkOllamaHealth();
    if (!health.available) {
      throw new Error('Ollama not available');
    }

    const hasModel = health.models.some(m => m.name === model || m.name.startsWith(`${model}:`));
    
    if (!hasModel) {
      console.log(`[Ollama] Pulling model: ${model}`);
      await axios.post(`${OLLAMA_BASE_URL}/api/pull`, { name: model }, {
        timeout: 0, // No timeout for model download
      });
      console.log(`[Ollama] Model ${model} pulled successfully`);
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to ensure model ${model}: ${error.message}`);
  }
}




