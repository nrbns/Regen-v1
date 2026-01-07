/**
 * Intent Router - Week 1, Day 1
 * Classifies user intent and routes to appropriate agent
 * Target: <100ms classification, 95%+ accuracy
 */

import Anthropic from '@anthropic-ai/sdk';

export type AgentType =
  | 'mail'
  | 'ppt'
  | 'booking'
  | 'research'
  | 'trading'
  | 'browser'
  | 'file'
  | 'general';

export interface IntentClassification {
  primaryAgent: AgentType;
  intent: string;
  confidence: number;
  alternativeAgents: AgentType[];
  parameters: Record<string, any>;
  reasoning: string;
}

export interface IntentRouterConfig {
  anthropicApiKey?: string;
  model?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

export class IntentRouter {
  private client: Anthropic | null = null;
  private config: IntentRouterConfig;
  private readonly SYSTEM_PROMPT = `You are an intent classification system. Analyze user requests and classify them into agent categories.

Available agents:
- mail: Email operations (send, read, search, summarize, filter)
- ppt: Presentation creation and editing
- booking: Flight/hotel/restaurant reservations
- research: Web search, data gathering, analysis
- trading: Stock trading, market analysis
- browser: Web navigation, form filling, scraping
- file: File operations (read, write, organize)
- general: General questions, unclear intent

Respond ONLY with valid JSON in this format:
{
  "primaryAgent": "agent_type",
  "intent": "specific_action",
  "confidence": 0.95,
  "alternativeAgents": ["agent2", "agent3"],
  "parameters": {"key": "value"},
  "reasoning": "brief explanation"
}

Be decisive. Always choose the most likely agent even if confidence is moderate.`;

  constructor(config: IntentRouterConfig = {}) {
    this.config = {
      model: config.model || 'claude-haiku-4.5',
      maxRetries: config.maxRetries || 2,
      timeoutMs: config.timeoutMs || 3000,
      ...config,
    };

    const apiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  /**
   * Classify user intent (fast path with Claude)
   */
  async classify(userInput: string): Promise<IntentClassification> {
    const startTime = Date.now();

    try {
      // Fast path: Use pattern matching for common cases
      const quickMatch = this.quickClassify(userInput);
      if (quickMatch && quickMatch.confidence >= 0.9) {
        console.log(`[IntentRouter] Quick match in ${Date.now() - startTime}ms`);
        return quickMatch;
      }

      // Use Claude for complex classification
      if (this.client) {
        const classification = await this.classifyWithClaude(userInput);
        console.log(`[IntentRouter] Claude classification in ${Date.now() - startTime}ms`);
        return classification;
      }

      // Fallback to pattern matching
      return quickMatch || this.defaultClassification(userInput);
    } catch (error) {
      console.error('[IntentRouter] Classification error:', error);
      return this.defaultClassification(userInput);
    }
  }

  /**
   * Quick pattern-based classification (< 10ms)
   */
  private quickClassify(input: string): IntentClassification | null {
    const lower = input.toLowerCase();

    // Mail patterns
    if (/(send|write|compose|reply|forward|email|mail)/i.test(lower)) {
      return {
        primaryAgent: 'mail',
        intent: 'send_email',
        confidence: 0.92,
        alternativeAgents: [],
        parameters: { text: input },
        reasoning: 'Contains email action keywords',
      };
    }

    // PPT patterns
    if (/(presentation|slides|ppt|powerpoint|deck)/i.test(lower)) {
      return {
        primaryAgent: 'ppt',
        intent: 'create_presentation',
        confidence: 0.9,
        alternativeAgents: [],
        parameters: { topic: input },
        reasoning: 'Contains presentation keywords',
      };
    }

    // Booking patterns
    if (/(book|reserve|flight|hotel|restaurant|travel)/i.test(lower)) {
      return {
        primaryAgent: 'booking',
        intent: 'search_and_book',
        confidence: 0.88,
        alternativeAgents: [],
        parameters: { query: input },
        reasoning: 'Contains booking keywords',
      };
    }

    // Research patterns
    if (/(search|find|research|analyze|compare|what is|who is|how to)/i.test(lower)) {
      return {
        primaryAgent: 'research',
        intent: 'web_search',
        confidence: 0.85,
        alternativeAgents: ['browser'],
        parameters: { query: input },
        reasoning: 'Contains research keywords',
      };
    }

    // Trading patterns
    if (/(stock|trade|buy|sell|market|ticker|portfolio)/i.test(lower)) {
      return {
        primaryAgent: 'trading',
        intent: 'market_analysis',
        confidence: 0.9,
        alternativeAgents: ['research'],
        parameters: { query: input },
        reasoning: 'Contains trading keywords',
      };
    }

    return null;
  }

  /**
   * Claude-based classification for complex cases
   */
  private async classifyWithClaude(userInput: string): Promise<IntentClassification> {
    if (!this.client) {
      throw new Error('Claude client not initialized');
    }

    const message = await this.client.messages.create({
      model: this.config.model!,
      max_tokens: 500,
      system: this.SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Classify this user request: "${userInput}"`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const classification = JSON.parse(jsonMatch[0]);

    // Validate response
    if (!classification.primaryAgent || !classification.intent) {
      throw new Error('Invalid classification response');
    }

    return classification as IntentClassification;
  }

  /**
   * Default classification for errors/fallbacks
   */
  private defaultClassification(userInput: string): IntentClassification {
    return {
      primaryAgent: 'general',
      intent: 'unknown',
      confidence: 0.5,
      alternativeAgents: ['research', 'browser'],
      parameters: { text: userInput },
      reasoning: 'Fallback classification',
    };
  }

  /**
   * Batch classify multiple intents
   */
  async classifyBatch(inputs: string[]): Promise<IntentClassification[]> {
    return Promise.all(inputs.map(input => this.classify(input)));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.classify('test health check');
      return result.confidence > 0;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
let routerInstance: IntentRouter | null = null;

export function getIntentRouter(config?: IntentRouterConfig): IntentRouter {
  if (!routerInstance) {
    routerInstance = new IntentRouter(config);
  }
  return routerInstance;
}

export default IntentRouter;
