import { nanoid } from '../utils/nanoid';
import { dispatch } from '../redix/runtime';
import { agentTools } from './tools';
import { MemoryStoreInstance } from '../supermemory/store';
import { useAgentMemoryStore } from '../../state/agentMemoryStore';
import type {
  AgentConfig,
  AgentExecutionInput,
  AgentExecutionResult,
  AgentRunRecord,
  AgentEnvironment,
  AgentToolExecutor,
  AgentToolContext,
} from './types';
import { semanticSearchMemories } from '../supermemory/search';
import { processMemoryEvent } from '../supermemory/pipeline';

type AgentMap = Map<string, AgentConfig>;

class AgentRuntime {
  private agents: AgentMap = new Map();
  private runs = new Map<string, AgentRunRecord>();
  private listeners = new Set<(run: AgentRunRecord) => void>();

  constructor() {
    this.registerDefaultAgents();
  }

  registerAgent(config: AgentConfig): void {
    if (this.agents.has(config.id)) {
      throw new Error(`Agent with id ${config.id} already registered`);
    }
    this.agents.set(config.id, config);
  }

  getAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  getAgent(id: string): AgentConfig | undefined {
    return this.agents.get(id);
  }

  onRunUpdate(cb: (run: AgentRunRecord) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async execute(request: AgentExecutionInput & { agentId?: string; signal?: AbortSignal }): Promise<AgentExecutionResult> {
    const agent = request.agentId ? this.agents.get(request.agentId) : this.selectAgentForPrompt(request.prompt);
    if (!agent) {
      return { success: false, error: 'No agent available for this request.' };
    }

    const runId = nanoid();
    const runRecord: AgentRunRecord = {
      id: runId,
      agentId: agent.id,
      prompt: request.prompt,
      status: 'pending',
    };
    this.updateRun(runRecord);

    const recentRuns = useAgentMemoryStore.getState().getRecentForAgent(agent.id, 5);

    const env: AgentEnvironment = {
      tools: this.buildToolset(agent),
      dispatchEvent: (type, payload) => dispatch({ type, payload, source: `agent:${agent.id}` }),
      capabilities: agent.capabilities,
      signal: request.signal,
      recentRuns,
    };

    try {
      runRecord.status = 'running';
      runRecord.startedAt = Date.now();
      this.updateRun(runRecord);

      dispatch({
        type: 'redix:agent:started',
        payload: { runId, agentId: agent.id, prompt: request.prompt },
        source: 'agent-runtime',
      });

      const result = await agent.entryPoint(request, env);
      runRecord.status = result.success ? 'succeeded' : 'failed';
      runRecord.finishedAt = Date.now();
      runRecord.result = result;
      this.updateRun(runRecord);

      await this.persistAgentMemory({
        agentId: agent.id,
        runId,
        prompt: request.prompt,
        success: true,
        output: result.output,
        durationMs: (runRecord.finishedAt ?? 0) - (runRecord.startedAt ?? 0),
      });

      dispatch({
        type: 'redix:agent:finished',
        payload: { runId, agentId: agent.id, success: result.success },
        source: 'agent-runtime',
      });

      return result;
    } catch (error) {
      runRecord.status = 'failed';
      runRecord.finishedAt = Date.now();
      const errorMessage = error instanceof Error ? error.message : String(error);
      runRecord.result = { success: false, error: errorMessage };
      this.updateRun(runRecord);

      await this.persistAgentMemory({
        agentId: agent.id,
        runId,
        prompt: request.prompt,
        success: false,
        error: errorMessage,
        durationMs: (runRecord.finishedAt ?? 0) - (runRecord.startedAt ?? 0),
      });

      dispatch({
        type: 'redix:agent:error',
        payload: { runId, agentId: agent.id, error: runRecord.result.error },
        source: 'agent-runtime',
      });

      return runRecord.result;
    }
  }

  private updateRun(run: AgentRunRecord) {
    this.runs.set(run.id, run);
    this.listeners.forEach((listener) => {
      try {
        listener(run);
      } catch (error) {
        console.warn('[AgentRuntime] listener failed:', error);
      }
    });
  }

  private selectAgentForPrompt(prompt: string): AgentConfig | undefined {
    const lower = prompt.toLowerCase();
    for (const agent of this.agents.values()) {
      if (agent.trigger?.keywords?.some((kw) => lower.includes(kw))) {
        return agent;
      }
    }
    // fallback default
    return this.agents.get('research.agent') || this.agents.values().next().value;
  }

  private buildToolset(agent: AgentConfig): Record<string, AgentToolExecutor> {
    const toolset: Record<string, AgentToolExecutor> = {};
    for (const toolId of agent.tools) {
      const tool = agentTools[toolId];
      if (!tool) continue;
      const missing = tool.requiredCapabilities.filter((cap) => !agent.capabilities.includes(cap));
      if (missing.length > 0) {
        console.warn(`[AgentRuntime] Agent ${agent.id} missing capabilities for tool ${toolId}: ${missing.join(',')}`);
        continue;
      }
      toolset[toolId] = async (input, overrides = {}) => {
        const ctx = this.createToolContext({
          signal: overrides.signal,
          memorySearch: overrides.memorySearch,
          saveMemory: overrides.saveMemory,
          redixAsk: overrides.redixAsk,
          safeFetch: overrides.safeFetch,
        });
        return tool.run(input, ctx);
      };
    }
    return toolset;
  }

  private registerDefaultAgents() {
    this.registerAgent({
      id: 'research.agent',
      name: 'Research Agent',
      description: 'Multi-step researcher that combines SuperMemory with Redix answers.',
      version: '1.0.0',
      capabilities: ['memory:read', 'memory:write', 'redix:ask', 'web:fetch'],
      tools: ['memory.search', 'memory.saveNote', 'redix.ask', 'web.fetch'],
      trigger: {
        keywords: ['research', 'compare', 'investigate'],
        intent: ['research', 'comparison'],
      },
      maxSteps: 4,
      async entryPoint(input, env) {
        const steps = [];
        const memoryExecutor = env.tools['memory.search'];
        const memoryResults = memoryExecutor ? ((await memoryExecutor({ query: input.prompt })) as any[]) : [];

        steps.push({
          toolId: 'memory.search',
          input: { query: input.prompt },
          output: memoryResults,
          startedAt: Date.now(),
          finishedAt: Date.now(),
        });

        const redixExecutor = env.tools['redix.ask'];
        const redixAnswer = redixExecutor
          ? await redixExecutor({ prompt: buildContextPrompt(input.prompt, memoryResults) })
          : '';

        if (typeof redixAnswer === 'string' && redixAnswer.trim().length > 0) {
          const saveExecutor = env.tools['memory.saveNote'];
          await saveExecutor?.({
            title: `Research: ${input.prompt}`,
            text: redixAnswer,
            tags: ['research', 'agent'],
          });
        }

        return {
          success: true,
          output: typeof redixAnswer === 'string' ? redixAnswer : '',
          steps,
        };
      },
    });
    this.registerAgent({
      id: 'trade.agent',
      name: 'Trade Agent',
      description: 'Provides market context, price action, and risk notes for Trade mode queries.',
      version: '1.0.0',
      capabilities: ['memory:read', 'web:fetch', 'redix:ask'],
      tools: ['memory.search', 'redix.ask', 'web.fetch', 'trade.fetchQuote'],
      trigger: {
        keywords: ['trade', 'stock', 'ticker', 'invest', 'price', 'market', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'],
        intent: ['comparison', 'fact'],
      },
      maxSteps: 5,
      async entryPoint(input, env) {
        const steps = [];
        const prompt = input.prompt || '';
        
        // Extract stock symbols from the query (simple regex for common tickers)
        const tickerRegex = /\b([A-Z]{1,5})\b/g;
        const matches = prompt.match(tickerRegex) || [];
        const potentialSymbols = matches.filter((m) => m.length >= 1 && m.length <= 5);
        
        // Try to fetch trade data for detected symbols using tool
        let tradeDataContext = '';
        if (potentialSymbols.length > 0) {
          try {
            const tradeTool = env.tools['trade.fetchQuote'];
            if (tradeTool) {
              const quotes = await Promise.allSettled(
                potentialSymbols.slice(0, 3).map((symbol) => tradeTool({ symbol }))
              );
              
              const successfulQuotes = quotes
                .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
                .map((r) => r.value);
              
              if (successfulQuotes.length > 0) {
                tradeDataContext = successfulQuotes
                  .map((quote: any) => {
                    const changeSign = quote.change >= 0 ? '+' : '';
                    return `${quote.symbol}: $${quote.price.toFixed(2)} (${changeSign}${quote.change.toFixed(2)}, ${changeSign}${quote.changePercent.toFixed(2)}%) - ${quote.sentiment} sentiment`;
                  })
                  .join('\n');
                
                steps.push({
                  toolId: 'trade.fetchQuote',
                  input: { symbols: potentialSymbols.slice(0, 3) },
                  output: successfulQuotes,
                  startedAt: Date.now(),
                  finishedAt: Date.now(),
                });
              }
            }
          } catch (error) {
            console.warn('[TradeAgent] Failed to fetch trade data:', error);
          }
        }
        
        // Build enhanced prompt with trade data
        const enhancedPrompt = `You are the Trade Mode assistant. Provide price action, key levels, and risk notes for trading queries.

${tradeDataContext ? `Current Market Data:\n${tradeDataContext}\n\n` : ''}User Query: ${prompt}

Provide a concise analysis with:
1. Current price action and trend
2. Key support/resistance levels (if applicable)
3. Risk considerations
4. Market sentiment`;

        const redixExecutor = env.tools['redix.ask'];
        if (!redixExecutor) {
          return { success: false, error: 'Trade agent missing redix.ask tool' };
        }
        
        const output = await redixExecutor({ prompt: enhancedPrompt });
        steps.push({
          toolId: 'redix.ask',
          input: { prompt: enhancedPrompt },
          output,
          startedAt: Date.now(),
          finishedAt: Date.now(),
        });
        
        return {
          success: true,
          output: typeof output === 'string' ? output : JSON.stringify(output),
          steps,
        };
      },
    });
    
    // GraphMind Agent - Knowledge graph queries and visualization
    this.registerAgent({
      id: 'graphmind.agent',
      name: 'GraphMind Agent',
      description: 'Queries and visualizes the personal knowledge graph from SuperMemory.',
      version: '1.0.0',
      capabilities: ['memory:read', 'redix:ask'],
      tools: ['memory.search', 'redix.ask', 'graph.query'],
      trigger: {
        keywords: ['graph', 'knowledge', 'connect', 'relationship', 'visualize'],
        intent: ['research'],
      },
      maxSteps: 3,
      async entryPoint(input, env) {
        const steps = [];
        const memoryExecutor = env.tools['memory.search'];
        const memoryResults = memoryExecutor ? ((await memoryExecutor({ query: input.prompt })) as any[]) : [];
        
        steps.push({
          toolId: 'memory.search',
          input: { query: input.prompt },
          output: memoryResults,
          startedAt: Date.now(),
          finishedAt: Date.now(),
        });
        
        const redixExecutor = env.tools['redix.ask'];
        const context = memoryResults.length > 0 
          ? `Found ${memoryResults.length} related memories. Use these to build connections in the knowledge graph.\n\nUser query: ${input.prompt}`
          : input.prompt;
        
        const output = redixExecutor
          ? await redixExecutor({ prompt: `You are the GraphMind assistant. Help users explore their knowledge graph by identifying connections, relationships, and patterns in their SuperMemory.\n\n${context}` })
          : 'GraphMind agent requires Redix connection.';
        
        return {
          success: true,
          output: typeof output === 'string' ? output : JSON.stringify(output),
          steps,
        };
      },
    });
    
    // Docs Agent - Document summarization and search
    this.registerAgent({
      id: 'docs.agent',
      name: 'Docs Agent',
      description: 'Summarizes documents, extracts key information, and helps with documentation queries.',
      version: '1.0.0',
      capabilities: ['memory:read', 'memory:write', 'redix:ask'],
      tools: ['memory.search', 'memory.saveNote', 'redix.ask', 'doc.summarize'],
      trigger: {
        keywords: ['document', 'doc', 'summarize', 'extract', 'key points'],
        intent: ['research', 'fact'],
      },
      maxSteps: 3,
      async entryPoint(input, env) {
        const steps = [];
        const redixExecutor = env.tools['redix.ask'];
        if (!redixExecutor) {
          return { success: false, error: 'Docs agent missing redix.ask tool' };
        }
        
        const prompt = `You are the Docs Mode assistant. Summarize documents, extract key information, and help with documentation queries.\n\nUser query: ${input.prompt}\n\nProvide a structured summary with:\n1. Key points\n2. Important details\n3. Action items (if any)`;
        
        const output = await redixExecutor({ prompt });
        steps.push({
          toolId: 'redix.ask',
          input: { prompt },
          output,
          startedAt: Date.now(),
          finishedAt: Date.now(),
        });
        
        return {
          success: true,
          output: typeof output === 'string' ? output : JSON.stringify(output),
          steps,
        };
      },
    });
    
    // Images Agent - Image search and analysis
    this.registerAgent({
      id: 'images.agent',
      name: 'Images Agent',
      description: 'Helps with visual search, image analysis, and inspiration boards.',
      version: '1.0.0',
      capabilities: ['web:fetch', 'redix:ask'],
      tools: ['web.fetch', 'redix.ask', 'image.search'],
      trigger: {
        keywords: ['image', 'picture', 'visual', 'photo', 'find images'],
        intent: ['research'],
      },
      maxSteps: 3,
      async entryPoint(input, env) {
        const steps = [];
        const redixExecutor = env.tools['redix.ask'];
        if (!redixExecutor) {
          return { success: false, error: 'Images agent missing redix.ask tool' };
        }
        
        const prompt = `You are the Images Mode assistant. Help users find and analyze images, create inspiration boards, and work with visual content.\n\nUser query: ${input.prompt}`;
        
        const output = await redixExecutor({ prompt });
        steps.push({
          toolId: 'redix.ask',
          input: { prompt },
          output,
          startedAt: Date.now(),
          finishedAt: Date.now(),
        });
        
        return {
          success: true,
          output: typeof output === 'string' ? output : JSON.stringify(output),
          steps,
        };
      },
    });
    
    // Threats Agent - Security analysis and threat detection
    this.registerAgent({
      id: 'threats.agent',
      name: 'Threats Agent',
      description: 'Analyzes security threats, provides threat intelligence, and helps with network isolation.',
      version: '1.0.0',
      capabilities: ['web:fetch', 'redix:ask'],
      tools: ['web.fetch', 'redix.ask', 'threat.scan'],
      trigger: {
        keywords: ['threat', 'security', 'vulnerability', 'malware', 'phishing', 'scan'],
        intent: ['research', 'fact'],
      },
      maxSteps: 4,
      async entryPoint(input, env) {
        const steps = [];
        const redixExecutor = env.tools['redix.ask'];
        if (!redixExecutor) {
          return { success: false, error: 'Threats agent missing redix.ask tool' };
        }
        
        const prompt = `You are the Threats Mode assistant. Analyze security threats, provide threat intelligence, and help with security analysis.\n\nUser query: ${input.prompt}\n\nProvide:\n1. Threat assessment\n2. Risk level\n3. Recommended actions\n4. Security best practices`;
        
        const output = await redixExecutor({ prompt });
        steps.push({
          toolId: 'redix.ask',
          input: { prompt },
          output,
          startedAt: Date.now(),
          finishedAt: Date.now(),
        });
        
        return {
          success: true,
          output: typeof output === 'string' ? output : JSON.stringify(output),
          steps,
        };
      },
    });
  }

  private async persistAgentMemory(params: {
    agentId: string;
    runId: string;
    prompt: string;
    success: boolean;
    output?: string;
    error?: string;
    durationMs?: number;
  }) {
    try {
      useAgentMemoryStore
        .getState()
        .addEntry({
          agentId: params.agentId,
          runId: params.runId,
          prompt: params.prompt,
          response: params.output,
          error: params.error,
          success: params.success,
          tokens: undefined,
        });
    } catch (storeError) {
      console.warn('[AgentRuntime] Failed to update agent memory store:', storeError);
    }

    if (typeof window === 'undefined') {
      return;
    }

    try {
      await MemoryStoreInstance.saveEvent({
        type: 'agent',
        value: params.output || params.error || params.prompt,
        metadata: {
          action: params.prompt,
          runId: params.runId,
          skill: params.agentId,
          result: params.output,
          error: params.error,
          duration: params.durationMs,
          success: params.success,
        },
      });
    } catch (error) {
      console.warn('[AgentRuntime] Failed to persist run in SuperMemory:', error);
    }
  }

  private createToolContext(overrides?: Partial<AgentToolContext>): AgentToolContext {
    return {
      signal: overrides?.signal,
      memorySearch:
        overrides?.memorySearch ||
        (async (query: string) => {
          const results = await semanticSearchMemories(query, { limit: 12 });
          return results.map((r) => r.event);
        }),
      saveMemory:
        overrides?.saveMemory ||
        (async (event) => {
          const result = await processMemoryEvent(event);
          return result.eventId;
        }),
      redixAsk: overrides?.redixAsk || (async () => ''),
      safeFetch: overrides?.safeFetch || fetch,
    };
  }
}

function buildContextPrompt(prompt: string, memoryResults?: any[]): string {
  if (!memoryResults || memoryResults.length === 0) return prompt;
  const contextLines = memoryResults.slice(0, 5).map((result) => `- ${result.title || result.snippet || result.id}`);
  return `Context:\n${contextLines.join('\n')}\n\nUser Prompt: ${prompt}`;
}

export const agentRuntime = new AgentRuntime();


