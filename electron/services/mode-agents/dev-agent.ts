/**
 * DevAgent - Mode-specific agent for Dev mode
 * Inspects API calls, generates tests
 */

import { getOllamaAdapter } from '../agent/ollama-adapter';

export interface APICall {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  response?: {
    status: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
}

export class DevAgent {
  /**
   * Inspect and log API calls from a page
   */
  async inspectAPICalls(url: string): Promise<APICall[]> {
    // This would be implemented by intercepting network requests
    // For now, return mock data
    return [];
  }

  /**
   * Generate Postman collection from API calls
   */
  async generatePostmanCollection(calls: APICall[]): Promise<string> {
    const collection = {
      info: {
        name: 'OmniBrowser API Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: calls.map(call => ({
        name: `${call.method} ${call.url}`,
        request: {
          method: call.method,
          header: Object.entries(call.headers || []).map(([key, value]) => ({
            key,
            value,
          })),
          url: call.url,
          body: call.body ? {
            mode: 'raw',
            raw: JSON.stringify(call.body),
          } : undefined,
        },
      })),
    };

    return JSON.stringify(collection, null, 2);
  }

  /**
   * Generate test code for API calls
   */
  async generateTests(calls: APICall[], language: 'javascript' | 'python' = 'javascript'): Promise<string> {
    const ollama = getOllamaAdapter();
    const isAvailable = await ollama.checkAvailable();

    if (!isAvailable) {
      return `// Generated test code\n// Install Ollama to auto-generate tests`;
    }

    const prompt = `Generate ${language} test code for these API calls:\n\n${JSON.stringify(calls, null, 2)}`;
    
    try {
      return await ollama.chat([
        {
          role: 'system',
          content: `You are a test generation assistant. Generate ${language} test code for API calls.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);
    } catch {
      return `// Test generation failed`;
    }
  }
}

