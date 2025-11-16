/**
 * Redix Core - Green Intelligence Engine
 * Regenerative AI backend with eco-scoring, model fusion, and consent ledger
 */

import fastify, { FastifyInstance } from 'fastify';

// Types
interface AskRequest {
  query: string;
  context?: {
    url?: string;
    title?: string;
    tabId?: string;
  };
  options?: {
    provider?: 'openai' | 'anthropic' | 'mistral' | 'ollama' | 'auto';
    maxTokens?: number;
    temperature?: number;
  };
}

interface AskResponse {
  text: string;
  provider: string;
  greenScore: number;
  latency: number;
  tokensUsed?: number;
}

// Eco Scorer
class EcoScorer {
  calculateGreenScore(energyWh: number, tokens: number): number {
    const score = 100 - (energyWh * 10 + tokens * 0.001);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  estimateEnergy(provider: string, tokens: number): number {
    const energyPer1K: Record<string, number> = {
      ollama: 0.01,
      'openai': 0.05,
      'anthropic': 0.06,
      'mistral': 0.04,
    };
    const base = energyPer1K[provider] || 0.05;
    return (tokens / 1000) * base;
  }
}

// Model Router
class ModelRouter {
  async route(query: string, options?: { provider?: string }): Promise<{
    provider: string;
    model: string;
  }> {
    if (options?.provider && options.provider !== 'auto') {
      return this.getProviderConfig(options.provider);
    }

    // Auto-routing
    const queryLower = query.toLowerCase();
    if (queryLower.includes('code') || queryLower.includes('function')) {
      return this.getProviderConfig('openai'); // Use GPT for code (DeepSeek not in our list)
    }
    
    const ollamaAvailable = await this.checkOllama();
    if (ollamaAvailable) {
      return this.getProviderConfig('ollama');
    }
    
    return this.getProviderConfig('openai');
  }

  private getProviderConfig(provider: string): { provider: string; model: string } {
    const configs: Record<string, { model: string }> = {
      openai: { model: 'gpt-4o-mini' },
      anthropic: { model: 'claude-3-5-sonnet-20241022' },
      mistral: { model: 'mistral-large-latest' },
      ollama: { model: 'llama3.2' },
    };
    const config = configs[provider] || configs.openai;
    return { provider, ...config };
  }

  private async checkOllama(): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/tags`, {
        signal: AbortSignal.timeout(1000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// LLM Adapter
class LLMAdapter {
  async sendPrompt(
    prompt: string,
    provider: string,
    model: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<{ text: string; tokensUsed: number; latency: number }> {
    const startTime = Date.now();
    const apiKey = this.getApiKey(provider);
    
    if (!apiKey && provider !== 'ollama') {
      throw new Error(`API key required for ${provider}`);
    }

    const messages = [{ role: 'user' as const, content: prompt }];
    const body: any = {
      model,
      messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature ?? 0.7,
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey!;
      headers['anthropic-version'] = '2023-06-01';
    } else if (provider !== 'ollama') {
      headers['Authorization'] = `Bearer ${apiKey!}`;
    }

    const url = this.getApiUrl(provider);
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `API error: ${response.statusText}`);
    }

    const data = await response.json();
    const latency = Date.now() - startTime;
    const text = provider === 'anthropic'
      ? data.content[0]?.text || ''
      : data.choices?.[0]?.message?.content || data.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || Math.ceil(text.length / 4);

    return { text, tokensUsed, latency };
  }

  private getApiKey(provider: string): string | undefined {
    const envMap: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      mistral: 'MISTRAL_API_KEY',
    };
    const key = envMap[provider];
    return key ? process.env[key] || process.env[`VITE_${key}`] : undefined;
  }

  private getApiUrl(provider: string): string {
    if (provider === 'anthropic') return 'https://api.anthropic.com/v1/messages';
    if (provider === 'ollama') return `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`;
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    return `${baseUrl}/chat/completions`;
  }
}

// Redix Server
export class RedixServer {
  private app: FastifyInstance;
  private router = new ModelRouter();
  private llm = new LLMAdapter();
  private ecoScorer = new EcoScorer();
  private port: number;

  constructor(port = 8001) {
    this.port = port;
    this.app = fastify({ logger: true });
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.addHook('onRequest', async (request, reply) => {
      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (request.method === 'OPTIONS') {
        reply.code(200).send();
        return;
      }
    });

    this.app.get('/health', async () => ({
      status: 'healthy',
      service: 'redix-core',
      version: '0.1.0',
    }));

    this.app.post<{ Body: AskRequest }>('/ask', async (request, reply) => {
      try {
        const { query, options } = request.body;
        if (!query?.trim()) {
          reply.code(400).send({ error: 'Query is required' });
          return;
        }

        const route = await this.router.route(query, { provider: options?.provider });
        const result = await this.llm.sendPrompt(query, route.provider, route.model, {
          maxTokens: options?.maxTokens,
          temperature: options?.temperature,
        });

        const energy = this.ecoScorer.estimateEnergy(route.provider, result.tokensUsed);
        const greenScore = this.ecoScorer.calculateGreenScore(energy, result.tokensUsed);

        reply.code(200).send({
          text: result.text,
          provider: route.provider,
          greenScore,
          latency: result.latency,
          tokensUsed: result.tokensUsed,
        });
      } catch (error: any) {
        console.error('[Redix] /ask error:', error);
        reply.code(500).send({
          error: error.message || 'Internal server error',
        });
      }
    });

    this.app.get('/metrics', async () => {
      const memUsage = process.memoryUsage();
      const energy = 0.1;
      const greenScore = this.ecoScorer.calculateGreenScore(energy, 0);
      return {
        cpu: 0, // Would use psutil in Python
        memory: memUsage.heapUsed / 1024 / 1024,
        greenScore,
        timestamp: Date.now(),
      };
    });
  }

  async start(): Promise<void> {
    await this.app.listen({ port: this.port, host: '0.0.0.0' });
    console.log(`[Redix] Server started on http://localhost:${this.port}`);
  }

  async stop(): Promise<void> {
    await this.app.close();
  }
}

let redixServerInstance: RedixServer | null = null;

export function createRedixServer(port?: number): RedixServer {
  if (!redixServerInstance) {
    redixServerInstance = new RedixServer(port);
  }
  return redixServerInstance;
}

if (require.main === module) {
  const port = parseInt(process.env.REDIX_PORT || '8001', 10);
  const server = createRedixServer(port);
  server.start().catch(console.error);
  process.on('SIGTERM', () => server.stop());
  process.on('SIGINT', () => server.stop());
}
