/**
 * LLM Client Utility
 * Provides cached, fault-tolerant access to LLM APIs
 * Supports: OpenAI, Anthropic, local fallback
 */

import Anthropic from '@anthropic-ai/sdk';

interface CachedClient {
  chat: {
    completions: {
      create(params: any): Promise<any>;
    };
  };
}

let cachedAnthropicClient: CachedClient | null = null;

/**
 * LLMClient class wrapper for dependency injection
 */
export class LLMClient {
  async complete(prompt: string, _options?: any): Promise<string> {
    return simpleCompletion(prompt);
  }

  async chat(messages: any[], options?: any): Promise<string> {
    const client = getCachedLLMClient();
    const response = await client.chat.completions.create({
      model: options?.model || process.env.ANTHROPIC_MODEL || 'claude-haiku-4.5',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    });
    return response.choices[0]?.message?.content || '';
  }

  isAvailable(): boolean {
    return isLLMAvailable();
  }
}

/**
 * Get or create LLM client
 * Caches client to avoid repeated initialization
 */
export function getCachedLLMClient(): CachedClient {
  if (cachedAnthropicClient) {
    return cachedAnthropicClient;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const anthropic = new Anthropic({ apiKey });

  // Wrap Anthropic SDK to match OpenAI-like interface
  cachedAnthropicClient = {
    chat: {
      completions: {
        async create(params: any) {
          const { model, messages, temperature = 0.7, max_tokens = 1024 } = params;

          const response = await anthropic.messages.create({
            model: model || process.env.ANTHROPIC_MODEL || 'claude-haiku-4.5',
            max_tokens,
            temperature,
            messages: messages.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
            })),
          });

          // Convert to OpenAI-like response format
          return {
            choices: [
              {
                message: {
                  content: response.content[0].type === 'text' ? response.content[0].text : '',
                },
              },
            ],
          };
        },
      },
    },
  };

  return cachedAnthropicClient;
}

/**
 * Make a simple completion request
 */
export async function simpleCompletion(prompt: string): Promise<string> {
  const client = getCachedLLMClient();

  const response = await client.chat.completions.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4.5',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Check if LLM is available
 */
export function isLLMAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Reset cached client (for testing)
 */
export function resetLLMClient(): void {
  cachedAnthropicClient = null;
}
