/**
 * LangChain Fusion - Multi-LLM Orchestration for Redix
 * 
 * Implements sequential chains, router chains, and model fusion
 * for advanced AI workflows in the Redix Green Intelligence Engine.
 * 
 * Architecture:
 * - SequentialChain: Multi-step workflows (reason → code → ethics)
 * - RouterChain: Smart model selection based on query type
 * - Memory: Conversation history across chains
 * - Eco-scoring: Wrapped around all chains
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

// Types
export interface FusionRequest {
  query: string;
  context?: string;
  chainType?: 'sequential' | 'router' | 'simple';
  options?: {
    maxTokens?: number;
    temperature?: number;
    useMemory?: boolean;
  };
}

export interface FusionResponse {
  result: string;
  chain: string[];
  greenScore: number;
  latency: number;
  tokensUsed: number;
  modelSequence: string[];
}

// Eco Scorer (reused from redix-core)
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

// LangChain Fusion Engine
export class LangChainFusion {
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

  // Router Chain: Select best model based on query
  private async routeQuery(query: string): Promise<'gpt' | 'claude'> {
    const queryLower = query.toLowerCase();
    
    // Code/logic queries → GPT (can use DeepSeek if available)
    if (queryLower.includes('code') || queryLower.includes('function') || queryLower.includes('algorithm')) {
      return 'gpt';
    }
    
    // Ethics/safety queries → Claude
    if (queryLower.includes('ethics') || queryLower.includes('safety') || queryLower.includes('privacy') || queryLower.includes('bias')) {
      return 'claude';
    }
    
    // Default → GPT
    return 'gpt';
  }

  // Sequential Chain: Multi-step fusion (reason → code → ethics)
  async sequentialFusion(
    query: string,
    context = '',
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<FusionResponse> {
    const startTime = Date.now();
    const chain: string[] = [];
    const modelSequence: string[] = [];
    let totalTokens = 0;

    try {
      // Step 1: Reasoning (GPT)
      const reasonPrompt = ChatPromptTemplate.fromMessages([
        ['system', 'You are a reasoning assistant. Analyze the query and provide clear reasoning.'],
        ['human', 'Query: {query}\nContext: {context}\n\nProvide reasoning:'],
      ]);

      const gptModel = this.getGPTModel(options.temperature ?? 0.7);
      const reasonChain = reasonPrompt.pipe(gptModel).pipe(new StringOutputParser());
      
      chain.push('reasoning');
      modelSequence.push('gpt-4o-mini');
      const reasoning = await reasonChain.invoke({ query, context: context || 'No context provided' });
      totalTokens += Math.ceil(reasoning.length / 4); // Rough estimate

      // Step 2: Code/Logic Generation (GPT with lower temperature)
      const codePrompt = ChatPromptTemplate.fromMessages([
        ['system', 'You are a code generation assistant. Generate code or logic based on the reasoning.'],
        ['human', 'Reasoning: {reasoning}\n\nGenerate code/logic:'],
      ]);

      const codeModel = this.getGPTModel(0.2); // Lower temp for code
      const codeChain = codePrompt.pipe(codeModel).pipe(new StringOutputParser());
      
      chain.push('code');
      modelSequence.push('gpt-4o-mini');
      const code = await codeChain.invoke({ reasoning });
      totalTokens += Math.ceil(code.length / 4);

      // Step 3: Ethics Check (Claude)
      const ethicsPrompt = ChatPromptTemplate.fromMessages([
        ['system', 'You are an ethics and safety checker. Review the output for ethical concerns, bias, or safety issues.'],
        ['human', 'Code/Logic: {code}\nReasoning: {reasoning}\n\nCheck for ethics, bias, and safety:'],
      ]);

      const claudeModel = this.getClaudeModel(0.1);
      const ethicsChain = ethicsPrompt.pipe(claudeModel).pipe(new StringOutputParser());
      
      chain.push('ethics');
      modelSequence.push('claude-3-5-sonnet');
      const ethicsCheck = await ethicsChain.invoke({ code, reasoning });
      totalTokens += Math.ceil(ethicsCheck.length / 4);

      // Fuse results
      const fusedResult = `Reasoning:\n${reasoning}\n\nCode/Logic:\n${code}\n\nEthics Check:\n${ethicsCheck}`;

      // Calculate eco score
      const energy = this.ecoScorer.estimateEnergy('openai', totalTokens * 0.6) + 
                     this.ecoScorer.estimateEnergy('anthropic', totalTokens * 0.4);
      const greenScore = this.ecoScorer.calculateGreenScore(energy, totalTokens);
      const latency = Date.now() - startTime;

      return {
        result: fusedResult,
        chain,
        greenScore,
        latency,
        tokensUsed: totalTokens,
        modelSequence,
      };
    } catch (error: any) {
      throw new Error(`Sequential fusion failed: ${error.message}`);
    }
  }

  // Router Chain: Smart model selection
  async routerFusion(
    query: string,
    context = '',
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<FusionResponse> {
    const startTime = Date.now();
    const chain: string[] = [];
    const modelSequence: string[] = [];
    let totalTokens = 0;

    try {
      // Route to best model
      const selectedModel = await this.routeQuery(query);
      chain.push('route');
      modelSequence.push(selectedModel);

      const model = selectedModel === 'gpt' 
        ? this.getGPTModel(options.temperature ?? 0.7)
        : this.getClaudeModel(options.temperature ?? 0.1);

      const prompt = ChatPromptTemplate.fromMessages([
        ['system', selectedModel === 'gpt' 
          ? 'You are a helpful assistant specializing in reasoning and code generation.'
          : 'You are an ethical AI assistant specializing in safety, privacy, and bias detection.'],
        ['human', 'Query: {query}\nContext: {context}\n\nAnswer:'],
      ]);

      const chainSequence = prompt.pipe(model).pipe(new StringOutputParser());
      const result = await chainSequence.invoke({ 
        query, 
        context: context || 'No context provided' 
      });

      totalTokens = Math.ceil(result.length / 4);
      const energy = this.ecoScorer.estimateEnergy(selectedModel === 'gpt' ? 'openai' : 'anthropic', totalTokens);
      const greenScore = this.ecoScorer.calculateGreenScore(energy, totalTokens);
      const latency = Date.now() - startTime;

      return {
        result,
        chain,
        greenScore,
        latency,
        tokensUsed: totalTokens,
        modelSequence: [selectedModel === 'gpt' ? 'gpt-4o-mini' : 'claude-3-5-sonnet'],
      };
    } catch (error: any) {
      throw new Error(`Router fusion failed: ${error.message}`);
    }
  }

  // Simple Chain: Single model call
  async simpleFusion(
    query: string,
    context = '',
    options: { maxTokens?: number; temperature?: number; provider?: 'gpt' | 'claude' } = {}
  ): Promise<FusionResponse> {
    const startTime = Date.now();
    const provider = options.provider || 'gpt';
    const model = provider === 'gpt' 
      ? this.getGPTModel(options.temperature ?? 0.7)
      : this.getClaudeModel(options.temperature ?? 0.1);

    try {
      const prompt = ChatPromptTemplate.fromMessages([
        ['human', 'Query: {query}\nContext: {context}\n\nAnswer:'],
      ]);

      const chain = prompt.pipe(model).pipe(new StringOutputParser());
      const result = await chain.invoke({ 
        query, 
        context: context || 'No context provided' 
      });

      const totalTokens = Math.ceil(result.length / 4);
      const energy = this.ecoScorer.estimateEnergy(provider === 'gpt' ? 'openai' : 'anthropic', totalTokens);
      const greenScore = this.ecoScorer.calculateGreenScore(energy, totalTokens);
      const latency = Date.now() - startTime;

      return {
        result,
        chain: ['simple'],
        greenScore,
        latency,
        tokensUsed: totalTokens,
        modelSequence: [provider === 'gpt' ? 'gpt-4o-mini' : 'claude-3-5-sonnet'],
      };
    } catch (error: any) {
      throw new Error(`Simple fusion failed: ${error.message}`);
    }
  }

  // Main fusion method
  async fuse(request: FusionRequest): Promise<FusionResponse> {
    const { query, context = '', chainType = 'router', options = {} } = request;

    switch (chainType) {
      case 'sequential':
        return this.sequentialFusion(query, context, options);
      case 'router':
        return this.routerFusion(query, context, options);
      case 'simple':
        return this.simpleFusion(query, context, options);
      default:
        return this.routerFusion(query, context, options);
    }
  }
}

// Singleton instance
let fusionInstance: LangChainFusion | null = null;

export function getLangChainFusion(): LangChainFusion {
  if (!fusionInstance) {
    fusionInstance = new LangChainFusion();
  }
  return fusionInstance;
}

