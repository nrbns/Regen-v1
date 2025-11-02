/**
 * Ollama Adapter for Local LLM Integration
 * Provides local LLM capabilities for agent intelligence
 */

import { fetch } from 'undici';

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
}

export class OllamaAdapter {
  private config: Required<OllamaConfig>;

  constructor(config: OllamaConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      model: config.model || 'llama3.2',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 4096,
    };
  }

  /**
   * Check if Ollama is available
   */
  async checkAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      const data = await response.json() as { models?: Array<{ name: string }> };
      return data.models?.map(m => m.name) || [];
    } catch {
      return [];
    }
  }

  /**
   * Generate a chat completion
   */
  async chat(messages: OllamaMessage[]): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens,
          },
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;
      return data.response;
    } catch (error) {
      console.error('[Ollama] Chat error:', error);
      throw error;
    }
  }

  /**
   * Stream chat completion (for real-time responses)
   */
  async *chatStream(messages: OllamaMessage[]): AsyncGenerator<string, void, unknown> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens,
          },
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as OllamaResponse;
            if (data.response) {
              yield data.response;
            }
            if (data.done) {
              return;
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      console.error('[Ollama] Stream error:', error);
      throw error;
    }
  }

  /**
   * Summarize text
   */
  async summarize(text: string, maxLength = 200): Promise<string> {
    const messages: OllamaMessage[] = [
      {
        role: 'system',
        content: `You are a summarization assistant. Summarize the following text in ${maxLength} words or less. Be concise and accurate.`,
      },
      {
        role: 'user',
        content: text,
      },
    ];

    return this.chat(messages);
  }

  /**
   * Extract citations and claims from text
   */
  async extractCitations(text: string, sourceUrl?: string): Promise<Array<{ claim: string; citation?: string }>> {
    const messages: OllamaMessage[] = [
      {
        role: 'system',
        content: `You are a citation extraction assistant. Extract key claims and facts from the text. Format as JSON array of {claim, citation?}. Citation should be URL if provided, otherwise empty.`,
      },
      {
        role: 'user',
        content: `Text: ${text}\n${sourceUrl ? `Source URL: ${sourceUrl}` : ''}`,
      },
    ];

    try {
      const response = await this.chat(messages);
      // Try to parse JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as Array<{ claim: string; citation?: string }>;
      }
      // Fallback: return single claim
      return [{ claim: response, citation: sourceUrl }];
    } catch {
      return [{ claim: text.substring(0, 200), citation: sourceUrl }];
    }
  }

  /**
   * Compare two texts
   */
  async compare(text1: string, text2: string, context?: string): Promise<string> {
    const messages: OllamaMessage[] = [
      {
        role: 'system',
        content: context || 'You are a comparison assistant. Compare the two texts and highlight key differences and similarities.',
      },
      {
        role: 'user',
        content: `Text 1:\n${text1}\n\nText 2:\n${text2}`,
      },
    ];

    return this.chat(messages);
  }
}

// Singleton instance
let ollamaInstance: OllamaAdapter | null = null;

export function getOllamaAdapter(config?: OllamaConfig): OllamaAdapter {
  if (!ollamaInstance) {
    ollamaInstance = new OllamaAdapter(config);
  }
  return ollamaInstance;
}

