/**
 * AI Bridge Service
 * Local offline AI inference bridge for Regen Browser
 *
 * Supports multiple backends:
 * - mock: Mock responses for testing
 * - llama_cpp: llama.cpp native integration
 * - ollama: Ollama API integration
 * - openai: OpenAI API (cloud fallback)
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.AI_BRIDGE_PORT || 4300;
const BRIDGE_TOKEN = process.env.AI_BRIDGE_TOKEN || loadTokenFile();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint with provider availability check
app.get('/health', async (req, res) => {
  const provider = process.env.LLM_PROVIDER || 'mock';
  const modelPath = process.env.MODEL_PATH || null;

  // Check provider availability
  let providerAvailable = true;
  let providerError = null;

  if (provider === 'ollama') {
    try {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      // Use AbortController for timeout in Node.js
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => {
        clearTimeout(timeoutId);
        return null;
      });

      clearTimeout(timeoutId);

      if (!response || !response.ok) {
        providerAvailable = false;
        providerError = 'Ollama not available. Install from https://ollama.com';
      }
    } catch (error) {
      providerAvailable = false;
      providerError = error.message;
    }
  } else if (provider === 'openai') {
    providerAvailable = !!process.env.OPENAI_API_KEY;
    if (!providerAvailable) {
      providerError = 'OPENAI_API_KEY not configured';
    }
  } else if (provider === 'llama_cpp') {
    providerAvailable = !!modelPath && existsSync(modelPath);
    if (!providerAvailable) {
      providerError = 'MODEL_PATH not found or not configured';
    }
  }

  // Auto-fallback to mock if provider unavailable
  const effectiveProvider = providerAvailable ? provider : 'mock';

  res.json({
    status: 'ok',
    provider: effectiveProvider,
    requestedProvider: provider,
    providerAvailable,
    providerError,
    modelPath,
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// Chat completion endpoint
app.post('/v1/chat', authenticate, async (req, res) => {
  const { messages, model, temperature = 0.7, max_tokens = 1000 } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: 'messages array is required and must not be empty',
    });
  }

  let provider = process.env.LLM_PROVIDER || 'mock';
  const startTime = Date.now();

  try {
    let response;

    // Auto-fallback logic: if requested provider fails, fall back to mock
    const attemptProvider = async providerName => {
      switch (providerName) {
        case 'mock':
          return await handleMockProvider(messages);

        case 'llama_cpp':
          return await handleLlamaCppProvider(messages, { temperature, max_tokens });

        case 'ollama':
          return await handleOllamaProvider(messages, { model, temperature, max_tokens });

        case 'openai':
          return await handleOpenAIProvider(messages, { model, temperature, max_tokens });

        default:
          throw new Error(`Unsupported provider: ${providerName}`);
      }
    };

    // Try requested provider first
    try {
      response = await attemptProvider(provider);
      // If successful, include provider info
      response._fallbackUsed = false;
    } catch (error) {
      // If provider fails and not already mock, fall back to mock
      if (provider !== 'mock') {
        console.warn(
          `[AI Bridge] Provider ${provider} failed, falling back to mock:`,
          error.message
        );
        try {
          response = await handleMockProvider(messages);
          response._fallbackUsed = true;
          response._fallbackReason = error.message;
          // Still use original provider name for tracking
        } catch (fallbackError) {
          throw new Error(`Both ${provider} and mock provider failed: ${fallbackError.message}`);
        }
      } else {
        throw error;
      }
    }

    const latency_ms = Date.now() - startTime;

    res.json({
      ...response,
      provider,
      latency_ms,
      model: response.model || model || 'default',
    });
  } catch (error) {
    console.error('[AI Bridge] Error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      provider,
      latency_ms: Date.now() - startTime,
    });
  }
});

// Model management endpoints
app.get('/v1/models', authenticate, (req, res) => {
  const modelsDir = join(__dirname, 'models');
  const models = [];

  if (existsSync(modelsDir)) {
    // List available models (simplified - would need to scan directory)
    models.push({
      id: 'default',
      name: 'Default Model',
      path: process.env.MODEL_PATH || null,
      size: null,
      format: 'gguf',
    });
  }

  res.json({ models });
});

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || req.body.token || req.query.token;

  if (!BRIDGE_TOKEN) {
    console.warn('[AI Bridge] No token configured, allowing all requests');
    return next();
  }

  if (!token || token !== BRIDGE_TOKEN) {
    return res.status(401).json({
      error: 'Unauthorized - invalid or missing token',
    });
  }

  next();
}

// Load token from file
function loadTokenFile() {
  const tokenPath = join(__dirname, '.bridge_token');
  if (existsSync(tokenPath)) {
    try {
      return readFileSync(tokenPath, 'utf-8').trim();
    } catch (error) {
      console.warn('[AI Bridge] Failed to read token file:', error.message);
    }
  }
  return null;
}

// Provider handlers
async function handleMockProvider(messages) {
  const lastMessage = messages[messages.length - 1];
  const content = lastMessage?.content || '';

  // Enhanced mock responses with better variety
  const responses = [
    `I understand you're asking: "${content}". This is a mock response demonstrating the AI Bridge is working correctly. To use real AI, install Ollama (https://ollama.com) and set LLM_PROVIDER=ollama, or configure OpenAI/llama.cpp.`,
    `Mock response for: "${content}". The AI Bridge is functioning properly! Configure a real provider (Ollama, OpenAI, or llama.cpp) to get actual AI responses.`,
    `You said: "${content}". Currently using mock provider. For real AI responses, set LLM_PROVIDER=ollama and ensure Ollama is running (ollama serve), or configure another provider.`,
  ];

  const responseIndex = Math.floor(Math.random() * responses.length);
  const responseText = responses[responseIndex];

  // Simulate realistic response time
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

  return {
    choices: [
      {
        message: {
          role: 'assistant',
          content: responseText,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: Math.ceil(content.length / 4), // Rough estimate
      completion_tokens: Math.ceil(responseText.length / 4),
      total_tokens: Math.ceil((content.length + responseText.length) / 4),
    },
    model: 'mock',
  };
}

async function handleLlamaCppProvider(_messages, _options) {
  // TODO: Integrate with llama.cpp
  // This would spawn llama.cpp process or use a Node.js binding
  throw new Error('llama_cpp provider not yet implemented. Use mock or ollama for now.');
}

async function handleOllamaProvider(messages, options) {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  let model = options.model || process.env.OLLAMA_MODEL || 'llama3.1:8b';

  // Build prompt from messages (simple concatenation for now)
  // For better results, use chat API instead of generate
  let prompt = '';
  if (messages.length === 1 && messages[0].role === 'user') {
    prompt = messages[0].content;
  } else {
    // Convert messages to prompt format
    prompt =
      messages
        .map(m => {
          if (m.role === 'user') return `User: ${m.content}`;
          if (m.role === 'assistant') return `Assistant: ${m.content}`;
          return m.content;
        })
        .join('\n\n') + '\n\nAssistant:';
  }

  try {
    // First, try to use the chat API (better for multi-turn conversations)
    try {
      const chatResponse = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
          options: {
            temperature: options.temperature,
            num_predict: options.max_tokens,
          },
        }),
      });

      if (chatResponse.ok) {
        const data = await chatResponse.json();

        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: data.message?.content || data.response || '',
              },
              finish_reason: data.done ? 'stop' : 'length',
            },
          ],
          usage: {
            prompt_tokens: data.prompt_eval_count || 0,
            completion_tokens: data.eval_count || 0,
            total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
          },
          model: model,
        };
      }
    } catch (chatError) {
      // Fall back to generate API if chat API fails
      console.warn('[AI Bridge] Chat API failed, trying generate API:', chatError.message);
    }

    // Fallback to generate API
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature,
          num_predict: options.max_tokens,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();

    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: data.response || '',
          },
          finish_reason: data.done ? 'stop' : 'length',
        },
      ],
      usage: {
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: data.eval_count || 0,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      model: model,
    };
  } catch (error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      throw new Error(
        `Ollama not running. Install from https://ollama.com and run 'ollama serve', or pull a model with 'ollama pull ${model}'`
      );
    }
    throw new Error(`Ollama provider error: ${error.message}`);
  }
}

async function handleOpenAIProvider(messages, options) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const model = options.model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`OpenAI provider error: ${error.message}`);
  }
}

// Ensure models directory exists
const modelsDir = join(__dirname, 'models');
if (!existsSync(modelsDir)) {
  mkdirSync(modelsDir, { recursive: true });
}

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[AI Bridge] Server running on http://127.0.0.1:${PORT}`);
  console.log(`[AI Bridge] Provider: ${process.env.LLM_PROVIDER || 'mock'}`);
  console.log(`[AI Bridge] Model Path: ${process.env.MODEL_PATH || 'none'}`);
  console.log(`[AI Bridge] Token: ${BRIDGE_TOKEN ? 'configured' : 'not configured'}`);
});

export default app;
