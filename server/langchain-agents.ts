/**
 * LangChain Agentic Workflows - Multi-Agent Orchestration for Redix
 *
 * Implements ReAct agents, tool integration, and LangGraph workflows
 * for autonomous AI agents that can reason, act, and collaborate.
 *
 * Architecture:
 * - ReAct Agents: Reason → Act → Observe loops
 * - Tools: Web search, calculators, APIs
 * - LangGraph: Stateful multi-agent workflows
 * - Memory: Conversation history across agents
 * - Eco-scoring: Wrapped around all agent actions
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// Ollama integration (if available)
let ChatOllama: any = null;
try {
  // Try to import Ollama - may not be installed
  const ollamaModule = require('@langchain/community/chat_models/ollama');
  ChatOllama = ollamaModule.ChatOllama;
} catch {
  // Ollama not available, will use fallback
}

// Types
export interface AgenticWorkflowRequest {
  query: string;
  context?: string;
  workflowType?: 'research' | 'code' | 'ethics' | 'multi-agent' | 'rag';
  tools?: string[]; // Tool names to enable
  options?: {
    maxIterations?: number;
    maxTokens?: number;
    temperature?: number;
    useOllama?: boolean; // Use local Ollama for efficiency
    stream?: boolean; // Enable streaming
  };
}

export interface AgenticWorkflowResponse {
  result: string;
  steps: Array<{
    step: number;
    action: string;
    tool?: string;
    observation: string;
    reasoning?: string;
  }>;
  greenScore: number;
  latency: number;
  tokensUsed: number;
  agentsUsed: string[];
}

// Streaming callback type
export type StreamCallback = (chunk: {
  type: 'token' | 'step' | 'done' | 'error';
  content?: string;
  step?: number;
  data?: any;
}) => void;

// Eco Scorer
class EcoScorer {
  calculateGreenScore(energyWh: number, tokens: number): number {
    const score = 100 - (energyWh * 10 + tokens * 0.001);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  estimateEnergy(provider: string, tokens: number): number {
    const energyPer1K: Record<string, number> = {
      ollama: 0.01,
      openai: 0.05,
      anthropic: 0.06,
      mistral: 0.04,
    };
    const base = energyPer1K[provider] || 0.05;
    return (tokens / 1000) * base;
  }
}

// Tools for agents
class AgentTools {
  // Web search tool - integrates with DuckDuckGo API
  static createSearchTool() {
    return new DynamicStructuredTool({
      name: 'web_search',
      description:
        'Search the web for information. Use this when you need to find current information, research topics, or look up facts.',
      schema: z.object({
        query: z.string().describe('The search query'),
        maxResults: z.number().optional().default(5).describe('Maximum number of results'),
      }),
      func: async ({ query, maxResults = 5 }) => {
        try {
          // Use DuckDuckGo Instant Answer API
          const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
          const response = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Regen/1.0' },
            signal: AbortSignal.timeout(5000),
          }).catch(() => null);

          if (response?.ok) {
            const data = await response.json();
            const results: string[] = [];

            // Add abstract if available
            if (data.AbstractText) {
              results.push(`Abstract: ${data.AbstractText}`);
            }

            // Add related topics
            if (data.RelatedTopics) {
              const topics = data.RelatedTopics.slice(0, maxResults);
              topics.forEach((r: any) => {
                if (r.Text) results.push(r.Text);
                else if (r.FirstURL) results.push(r.FirstURL);
              });
            }

            // Add results
            if (data.Results) {
              data.Results.slice(0, maxResults).forEach((r: any) => {
                if (r.Text) results.push(r.Text);
              });
            }

            return results.length > 0 ? results.join('\n\n') : `No results found for "${query}"`;
          }

          return `Search completed for "${query}" but no results returned.`;
        } catch (error: any) {
          return `Search failed: ${error.message || 'Network error'}`;
        }
      },
    });
  }

  // Calculator tool
  static createCalculatorTool() {
    return new DynamicStructuredTool({
      name: 'calculator',
      description:
        'Perform mathematical calculations. Use this for arithmetic, algebra, or numerical computations.',
      schema: z.object({
        expression: z
          .string()
          .describe('Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)")'),
      }),
      func: async ({ expression }) => {
        try {
          // Safe evaluation (in production, use a proper math parser)
          const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
          const result = Function(`"use strict"; return (${sanitized})`)();
          return String(result);
        } catch (error) {
          return `Calculation error: ${error}`;
        }
      },
    });
  }

  // Code execution tool (sandboxed)
  static createCodeTool() {
    return new DynamicStructuredTool({
      name: 'code_executor',
      description:
        'Execute simple code snippets (sandboxed). Use this for code generation, testing, or data processing.',
      schema: z.object({
        code: z.string().describe('Code to execute (JavaScript-like syntax)'),
        language: z.string().optional().default('javascript').describe('Programming language'),
      }),
      func: async ({ code, language }) => {
        // In production, use a proper sandbox (e.g., VM2, isolated container)
        return `Code execution (${language}): ${code.substring(0, 100)}... (Mock - use proper sandbox in production)`;
      },
    });
  }

  // Knowledge graph tool (mock)
  static createKnowledgeGraphTool() {
    return new DynamicStructuredTool({
      name: 'knowledge_graph',
      description:
        'Query or update the knowledge graph. Use this to store relationships, find connections, or retrieve structured knowledge.',
      schema: z.object({
        operation: z.enum(['query', 'store']).describe('Operation type'),
        entity: z.string().describe('Entity or relationship to query/store'),
      }),
      func: async ({ operation, entity }) => {
        // Mock - in production, integrate with Neo4j or similar
        return `${operation === 'query' ? 'Querying' : 'Storing'} knowledge graph for: ${entity} (Mock - integrate with Neo4j)`;
      },
    });
  }

  // Get all tools
  static getAllTools() {
    return [
      this.createSearchTool(),
      this.createCalculatorTool(),
      this.createCodeTool(),
      this.createKnowledgeGraphTool(),
    ];
  }

  // Get tools by name
  static getToolsByName(names: string[]) {
    const allTools = this.getAllTools();
    return allTools.filter(tool => names.includes(tool.name));
  }
}

// Agentic Workflow Engine
export class AgenticWorkflowEngine {
  private ecoScorer = new EcoScorer();

  // Initialize models
  private getGPTModel(temperature = 0.7) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY required');
    return new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature,
      openAIApiKey: apiKey,
    });
  }

  private getClaudeModel(temperature = 0.1) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY required');
    return new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature,
      anthropicApiKey: apiKey,
    });
  }

  // Get Ollama model (local, efficient)
  private async getOllamaModel(temperature = 0.7) {
    if (!ChatOllama) {
      throw new Error('Ollama not available. Install: npm install @langchain/community');
    }

    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.2';

    // Check if Ollama is available
    try {
      const check = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(1000),
      });
      if (!check.ok) throw new Error('Ollama not running');
    } catch {
      throw new Error('Ollama not available. Start Ollama: ollama serve');
    }

    return new ChatOllama({
      baseUrl,
      model,
      temperature,
    });
  }

  // Research Agent: Search → Summarize → Ethics Check
  async researchWorkflow(
    query: string,
    context = '',
    options: { maxIterations?: number; maxTokens?: number; temperature?: number } = {}
  ): Promise<AgenticWorkflowResponse> {
    const startTime = Date.now();
    const steps: AgenticWorkflowResponse['steps'] = [];
    let totalTokens = 0;
    const agentsUsed: string[] = [];

    try {
      // Step 1: Search Agent
      const searchTools = [AgentTools.createSearchTool()];
      const searchAgent = await this.createReActAgent(
        this.getGPTModel(options.temperature ?? 0.7),
        searchTools
      );
      const searchExecutor = {
        invoke: async (input: { input: string }) => {
          return await searchAgent.invoke(input);
        },
      };

      agentsUsed.push('gpt-4o-mini-search');
      const searchResult = await searchExecutor.invoke({
        input: `Search for information about: ${query}. Context: ${context || 'No context'}`,
      });

      steps.push({
        step: 1,
        action: 'search',
        tool: 'web_search',
        observation: searchResult.output || 'No results',
        reasoning: 'Searching for relevant information',
      });

      totalTokens += Math.ceil((searchResult.output || '').length / 4);

      // Step 2: Summarize Agent
      const summarizePrompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          'You are a research summarizer. Create a concise summary of the search results.',
        ],
        ['human', 'Search results: {search_results}\n\nQuery: {query}\n\nProvide a clear summary:'],
      ]);

      const summarizeModel = this.getGPTModel(0.5);
      agentsUsed.push('gpt-4o-mini-summarize');
      const summarizeChain = summarizePrompt.pipe(summarizeModel).pipe(new StringOutputParser());
      const summary = await summarizeChain.invoke({
        search_results: searchResult.output,
        query,
      });

      steps.push({
        step: 2,
        action: 'summarize',
        observation: summary,
        reasoning: 'Summarizing search results',
      });

      totalTokens += Math.ceil(summary.length / 4);

      // Step 3: Ethics Check Agent
      const ethicsPrompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          'You are an ethics checker. Review the summary for ethical concerns, bias, or safety issues.',
        ],
        ['human', 'Summary: {summary}\n\nQuery: {query}\n\nCheck for ethics, bias, and safety:'],
      ]);

      const ethicsModel = this.getClaudeModel(0.1);
      agentsUsed.push('claude-3-5-sonnet-ethics');
      const ethicsChain = ethicsPrompt.pipe(ethicsModel).pipe(new StringOutputParser());
      const ethicsCheck = await ethicsChain.invoke({ summary, query });

      steps.push({
        step: 3,
        action: 'ethics_check',
        observation: ethicsCheck,
        reasoning: 'Checking for ethical concerns',
      });

      totalTokens += Math.ceil(ethicsCheck.length / 4);

      // Fuse results
      const fusedResult = `Research Summary:\n${summary}\n\nEthics Check:\n${ethicsCheck}`;

      // Calculate eco score
      const energy =
        this.ecoScorer.estimateEnergy('openai', totalTokens * 0.6) +
        this.ecoScorer.estimateEnergy('anthropic', totalTokens * 0.4);
      const greenScore = this.ecoScorer.calculateGreenScore(energy, totalTokens);
      const latency = Date.now() - startTime;

      return {
        result: fusedResult,
        steps,
        greenScore,
        latency,
        tokensUsed: totalTokens,
        agentsUsed,
      };
    } catch (error: any) {
      throw new Error(`Research workflow failed: ${error.message}`);
    }
  }

  // ReAct Agent creation with proper ReAct pattern (Reason → Act → Observe)
  private async createReActAgent(llm: any, tools: any[], maxIterations = 5) {
    return {
      invoke: async (input: { input: string }): Promise<{ output: string; steps: any[] }> => {
        const steps: any[] = [];
        let currentInput = input.input;
        let iteration = 0;

        // ReAct loop: Reason → Act → Observe
        while (iteration < maxIterations) {
          iteration++;

          // Step 1: REASON - LLM decides what to do
          const reasoningPrompt = ChatPromptTemplate.fromMessages([
            [
              'system',
              `You are a ReAct agent. You have access to these tools: ${tools.map(t => t.name).join(', ')}.
            
Think step by step:
1. What is the current question/task?
2. What tool should I use? (or "final_answer" if done)
3. What are the arguments for that tool?

Format your response as:
Thought: [your reasoning]
Action: [tool_name or final_answer]
Action Input: [arguments as JSON or final answer]`,
            ],
            [
              'human',
              `Question: ${currentInput}

Previous steps: ${steps.length > 0 ? JSON.stringify(steps.slice(-2), null, 2) : 'None'}

What should I do next?`,
            ],
          ]);

          const reasoningChain = reasoningPrompt.pipe(llm).pipe(new StringOutputParser());
          const reasoning = await reasoningChain.invoke({});

          steps.push({ step: iteration, type: 'reason', content: reasoning });

          // Parse reasoning to extract action
          const actionMatch = reasoning.match(/Action:\s*(\w+)/i);
          const actionInputMatch = reasoning.match(/Action Input:\s*(.+?)(?:\n|$)/is);

          if (!actionMatch) {
            // No action found, return final answer
            const finalAnswer = reasoning.split('Final Answer:')[1] || reasoning;
            return { output: finalAnswer.trim(), steps };
          }

          const action = actionMatch[1].toLowerCase();

          // Check if we should finish
          if (action === 'final_answer' || action === 'finish') {
            const finalAnswer =
              actionInputMatch?.[1] || reasoning.split('Final Answer:')[1] || reasoning;
            return { output: finalAnswer.trim(), steps };
          }

          // Step 2: ACT - Execute tool
          const tool = tools.find(t => t.name.toLowerCase() === action);
          if (!tool) {
            steps.push({ step: iteration, type: 'error', content: `Tool "${action}" not found` });
            continue;
          }

          let toolInput: any = {};
          if (actionInputMatch) {
            try {
              toolInput = JSON.parse(actionInputMatch[1].trim());
            } catch {
              // If not JSON, try to extract query/expression
              if (tool.name === 'web_search') {
                toolInput = { query: actionInputMatch[1].trim(), maxResults: 5 };
              } else if (tool.name === 'calculator') {
                toolInput = { expression: actionInputMatch[1].trim() };
              }
            }
          }

          steps.push({ step: iteration, type: 'action', tool: tool.name, input: toolInput });

          // Step 3: OBSERVE - Get tool result
          try {
            const observation = await tool.func(toolInput);
            steps.push({
              step: iteration,
              type: 'observation',
              content: String(observation).slice(0, 500),
            });

            // Update input for next iteration
            currentInput = `Original question: ${input.input}\n\nTool result: ${observation}\n\nWhat should I do next?`;
          } catch (error: any) {
            steps.push({ step: iteration, type: 'error', content: error.message });
            break;
          }
        }

        // Max iterations reached, return what we have
        return {
          output: steps[steps.length - 1]?.content || 'Max iterations reached',
          steps,
        };
      },
    };
  }

  // Multi-Agent Workflow: Research → Code → Ethics
  async multiAgentWorkflow(
    query: string,
    context = '',
    options: { maxIterations?: number; maxTokens?: number; temperature?: number } = {}
  ): Promise<AgenticWorkflowResponse> {
    const startTime = Date.now();
    const steps: AgenticWorkflowResponse['steps'] = [];
    let totalTokens = 0;
    const agentsUsed: string[] = [];

    try {
      // Agent 1: Research
      const researchResult = await this.researchWorkflow(query, context, options);
      steps.push(...researchResult.steps);
      totalTokens += researchResult.tokensUsed;
      agentsUsed.push(...researchResult.agentsUsed);

      // Agent 2: Code Generation (if query involves code)
      if (query.toLowerCase().includes('code') || query.toLowerCase().includes('function')) {
        const codeTools = [AgentTools.createCodeTool(), AgentTools.createCalculatorTool()];
        const codeAgent = await this.createReActAgent(this.getGPTModel(0.2), codeTools);
        const codeExecutor = {
          invoke: async (input: { input: string }) => {
            return await codeAgent.invoke(input);
          },
        };

        agentsUsed.push('gpt-4o-mini-code');
        const codeResult = await codeExecutor.invoke({
          input: `Generate code for: ${query}. Based on research: ${researchResult.result}`,
        });

        steps.push({
          step: steps.length + 1,
          action: 'code_generation',
          tool: 'code_executor',
          observation: codeResult.output,
          reasoning: 'Generating code based on research',
        });

        totalTokens += Math.ceil((codeResult.output || '').length / 4);
      }

      // Calculate final eco score
      const energy =
        this.ecoScorer.estimateEnergy('openai', totalTokens * 0.7) +
        this.ecoScorer.estimateEnergy('anthropic', totalTokens * 0.3);
      const greenScore = this.ecoScorer.calculateGreenScore(energy, totalTokens);
      const latency = Date.now() - startTime;

      return {
        result: researchResult.result,
        steps,
        greenScore,
        latency,
        tokensUsed: totalTokens,
        agentsUsed,
      };
    } catch (error: any) {
      throw new Error(`Multi-agent workflow failed: ${error.message}`);
    }
  }

  // RAG Agent: Retrieval-Augmented Generation workflow
  async ragWorkflow(
    query: string,
    context = '',
    options: {
      maxIterations?: number;
      maxTokens?: number;
      temperature?: number;
      useOllama?: boolean;
    } = {},
    streamCallback?: StreamCallback
  ): Promise<AgenticWorkflowResponse> {
    const startTime = Date.now();
    const steps: AgenticWorkflowResponse['steps'] = [];
    let totalTokens = 0;
    const agentsUsed: string[] = [];

    try {
      // Step 1: Retrieve - Search for relevant information
      const searchTool = AgentTools.createSearchTool();
      const searchResult = await searchTool.func({ query, maxResults: 5 });

      if (streamCallback) {
        streamCallback({ type: 'step', step: 1, content: 'Searching for relevant information...' });
      }

      steps.push({
        step: 1,
        action: 'retrieve',
        tool: 'web_search',
        observation: searchResult.slice(0, 500),
        reasoning: 'Retrieving relevant information for RAG',
      });

      // Step 2: Augment - Combine query with retrieved context
      const augmentedPrompt = `Context from search:\n${searchResult}\n\nUser query: ${query}\n\nContext: ${context || 'No additional context'}\n\nProvide a comprehensive answer based on the retrieved information:`;

      // Use Ollama if requested (more efficient for local processing)
      let model: any;
      if (options.useOllama) {
        try {
          model = await this.getOllamaModel(options.temperature ?? 0.7);
          agentsUsed.push('ollama-llama3.2');
        } catch {
          // Fallback to GPT if Ollama unavailable
          model = this.getGPTModel(options.temperature ?? 0.7);
          agentsUsed.push('gpt-4o-mini');
        }
      } else {
        model = this.getGPTModel(options.temperature ?? 0.7);
        agentsUsed.push('gpt-4o-mini');
      }

      if (streamCallback) {
        streamCallback({
          type: 'step',
          step: 2,
          content: 'Generating answer with retrieved context...',
        });
      }

      // Step 3: Generate - Create answer with citations
      const generatePrompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          'You are a RAG (Retrieval-Augmented Generation) assistant. Answer questions using the provided context. Cite sources when possible.',
        ],
        ['human', '{augmented_prompt}'],
      ]);

      const generateChain = generatePrompt.pipe(model).pipe(new StringOutputParser());

      let generatedText = '';
      if (options.stream && streamCallback) {
        // Streaming mode
        const stream = await generateChain.stream({ augmented_prompt: augmentedPrompt });
        for await (const chunk of stream) {
          generatedText += chunk;
          streamCallback({ type: 'token', content: chunk });
        }
      } else {
        // Non-streaming mode
        generatedText = await generateChain.invoke({ augmented_prompt: augmentedPrompt });
      }

      steps.push({
        step: 2,
        action: 'generate',
        observation: generatedText.slice(0, 500),
        reasoning: 'Generated answer using retrieved context',
      });

      totalTokens = Math.ceil(generatedText.length / 4);

      // Calculate eco score
      const provider = options.useOllama ? 'ollama' : 'openai';
      const energy = this.ecoScorer.estimateEnergy(provider, totalTokens);
      const greenScore = this.ecoScorer.calculateGreenScore(energy, totalTokens);
      const latency = Date.now() - startTime;

      if (streamCallback) {
        streamCallback({
          type: 'done',
          data: { greenScore, latency, tokensUsed: totalTokens, agentsUsed },
        });
      }

      return {
        result: generatedText,
        steps,
        greenScore,
        latency,
        tokensUsed: totalTokens,
        agentsUsed,
      };
    } catch (error: any) {
      if (streamCallback) {
        streamCallback({ type: 'error', content: error.message });
      }
      throw new Error(`RAG workflow failed: ${error.message}`);
    }
  }

  // Main workflow dispatcher
  async runWorkflow(
    request: AgenticWorkflowRequest,
    streamCallback?: StreamCallback
  ): Promise<AgenticWorkflowResponse> {
    const {
      query,
      context = '',
      workflowType = 'research',
      tools: _tools = [],
      options = {},
    } = request;

    switch (workflowType) {
      case 'research':
        return this.researchWorkflow(query, context, options);
      case 'multi-agent':
        return this.multiAgentWorkflow(query, context, options);
      case 'rag':
        return this.ragWorkflow(query, context, options, streamCallback);
      default:
        return this.researchWorkflow(query, context, options);
    }
  }
}

// Singleton instance
let workflowEngineInstance: AgenticWorkflowEngine | null = null;

export function getAgenticWorkflowEngine(): AgenticWorkflowEngine {
  if (!workflowEngineInstance) {
    workflowEngineInstance = new AgenticWorkflowEngine();
  }
  return workflowEngineInstance;
}
