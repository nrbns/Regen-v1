/**
 * IntentRouter - Formal intent resolution class
 * 
 * This is the single source of truth for intent resolution.
 * All user input MUST be classified through this router before execution.
 * 
 * Core Principle: Intent is ALWAYS resolved before AI execution.
 */

import type { CommandContext } from './CommandController';

export type IntentType =
  | 'NAVIGATE'
  | 'SEARCH'
  | 'SUMMARIZE_PAGE'
  | 'ANALYZE_TEXT'
  | 'TASK_RUN'
  | 'RESEARCH'
  | 'AI_QUERY'
  | 'UNKNOWN';

export interface ResolvedIntent {
  type: IntentType;
  confidence: number; // 0-1, higher = more confident
  requiresPlanning: boolean; // true = needs multi-step planner, false = direct execution
  data: {
    url?: string;
    query?: string;
    text?: string;
    task?: string;
    options?: Record<string, any>;
    context?: CommandContext;
  };
  reasoning?: string; // Optional: why this intent was chosen (for audit)
}

export interface IntentPattern {
  pattern: RegExp | ((input: string) => boolean);
  intent: IntentType;
  confidence: number;
  requiresPlanning: boolean;
  extract: (input: string, context?: CommandContext) => ResolvedIntent['data'];
}

/**
 * IntentRouter - Single source of truth for intent resolution
 */
export class IntentRouter {
  private patterns: IntentPattern[] = [];

  constructor() {
    this.registerPatterns();
  }

  /**
   * Register all intent patterns (ordered by specificity)
   */
  private registerPatterns(): void {
    // 1. Navigation patterns (most specific)
    this.patterns.push({
      pattern: /^(go to|navigate to|open)\s+(.+)$/i,
      intent: 'NAVIGATE',
      confidence: 0.95,
      requiresPlanning: false,
      extract: (input) => ({
        url: input.replace(/^(go to|navigate to|open)\s+/i, '').trim(),
      }),
    });

    this.patterns.push({
      pattern: (input) => {
        try {
          const url = new URL(input.startsWith('http') ? input : `https://${input}`);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      },
      intent: 'NAVIGATE',
      confidence: 0.9,
      requiresPlanning: false,
      extract: (input) => {
        const url = input.startsWith('http') ? input : `https://${input}`;
        try {
          new URL(url); // Validate
          return { url };
        } catch {
          return { url: `https://${input}` };
        }
      },
    });

    // 2. Research patterns (high specificity)
    this.patterns.push({
      pattern: /^(research|investigate|deep dive|analyze)\s+(.+)$/i,
      intent: 'RESEARCH',
      confidence: 0.95,
      requiresPlanning: true, // Research requires multi-step planning
      extract: (input) => ({
        query: input.replace(/^(research|investigate|deep dive|analyze)\s+/i, '').trim(),
      }),
    });

    // 3. Task patterns (medium-high specificity)
    this.patterns.push({
      pattern: /^(task|run|execute)\s+(.+)$/i,
      intent: 'TASK_RUN',
      confidence: 0.9,
      requiresPlanning: false, // Tasks are pre-defined, no planning needed
      extract: (input) => ({
        task: input.replace(/^(task|run|execute)\s+/i, '').trim(),
      }),
    });

    // 4. Summarize patterns (medium specificity)
    this.patterns.push({
      pattern: /^(summarize|summary|summarise)\b/i,
      intent: 'SUMMARIZE_PAGE',
      confidence: 0.85,
      requiresPlanning: false,
      extract: (input, context) => ({
        url: context?.currentUrl,
      }),
    });

    // 5. Analyze text patterns (context-dependent)
    this.patterns.push({
      pattern: /^analyze\b/i,
      intent: 'ANALYZE_TEXT',
      confidence: 0.8,
      requiresPlanning: false,
      extract: (input, context) => ({
        text: context?.selectedText || '',
      }),
    });

    // 6. AI Query patterns (medium-low specificity)
    this.patterns.push({
      pattern: /^(ai|ask|tell me|explain|what is|how does)\b/i,
      intent: 'AI_QUERY',
      confidence: 0.75,
      requiresPlanning: false,
      extract: (input) => ({
        query: input.replace(/^(ai|ask|tell me|explain|what is|how does)\s+/i, '').trim(),
      }),
    });

    // 7. Question mark pattern (low specificity, fallback)
    this.patterns.push({
      pattern: /\?$/,
      intent: 'AI_QUERY',
      confidence: 0.7,
      requiresPlanning: false,
      extract: (input) => ({
        query: input.trim(),
      }),
    });

    // 8. Search patterns (default fallback)
    this.patterns.push({
      pattern: /^(search|find|look for)\s+(.+)$/i,
      intent: 'SEARCH',
      confidence: 0.8,
      requiresPlanning: false,
      extract: (input) => ({
        query: input.replace(/^(search|find|look for)\s+/i, '').trim(),
      }),
    });

    // 9. Default: treat as search (lowest confidence)
    this.patterns.push({
      pattern: () => true, // Always matches
      intent: 'SEARCH',
      confidence: 0.5,
      requiresPlanning: false,
      extract: (input) => ({
        query: input.trim(),
      }),
    });
  }

  /**
   * Resolve intent from user input
   * 
   * This is the SINGLE entry point for intent resolution.
   * Returns the most confident match based on pattern matching.
   * 
   * @param input - User input string
   * @param context - Optional context (current URL, selected text, etc.)
   * @returns Resolved intent with confidence score and planning requirement
   */
  resolve(input: string, context?: CommandContext): ResolvedIntent {
    const normalizedInput = input.trim();
    
    if (!normalizedInput) {
      return {
        type: 'UNKNOWN',
        confidence: 0,
        requiresPlanning: false,
        data: {},
        reasoning: 'Empty input',
      };
    }

    // Match against patterns (first match wins, ordered by specificity)
    for (const pattern of this.patterns) {
      const matches =
        typeof pattern.pattern === 'function'
          ? pattern.pattern(normalizedInput)
          : pattern.pattern.test(normalizedInput);

      if (matches) {
        try {
          const data = pattern.extract(normalizedInput, context);
          
          // Special validation for context-dependent intents
          if (pattern.intent === 'ANALYZE_TEXT' && !data.text) {
            // No selected text, treat as general query
            return {
              type: 'AI_QUERY',
              confidence: 0.7,
              requiresPlanning: false,
              data: { query: normalizedInput },
              reasoning: 'Analyze intent but no selected text, treating as AI query',
            };
          }

          if (pattern.intent === 'SUMMARIZE_PAGE' && !data.url) {
            // No current URL, treat as search
            return {
              type: 'SEARCH',
              confidence: 0.6,
              requiresPlanning: false,
              data: { query: normalizedInput },
              reasoning: 'Summarize intent but no current URL, treating as search',
            };
          }

          return {
            type: pattern.intent,
            confidence: pattern.confidence,
            requiresPlanning: pattern.requiresPlanning,
            data,
            reasoning: `Matched pattern: ${pattern.intent}`,
          };
        } catch (error) {
          // Pattern matched but extraction failed, continue to next pattern
          console.warn(`[IntentRouter] Pattern extraction failed for "${pattern.intent}":`, error);
          continue;
        }
      }
    }

    // Fallback (should never reach here due to catch-all pattern)
    return {
      type: 'SEARCH',
      confidence: 0.5,
      requiresPlanning: false,
      data: { query: normalizedInput },
      reasoning: 'Fallback to SEARCH intent',
    };
  }

  /**
   * Check if intent requires multi-step planning
   * 
   * Planner threshold: Only complex, multi-step operations require planning.
   * Simple, single-step intents execute directly.
   */
  requiresPlanning(intent: ResolvedIntent): boolean {
    // Explicit flag from pattern
    if (intent.requiresPlanning) {
      return true;
    }

    // Additional heuristics for complex queries
    const query = intent.data.query || '';
    
    // Multi-step indicators
    const multiStepKeywords = [
      'and then',
      'after that',
      'followed by',
      'next',
      'then',
      'also',
      'plus',
    ];

    const hasMultiStep = multiStepKeywords.some(keyword =>
      query.toLowerCase().includes(keyword)
    );

    return hasMultiStep || intent.type === 'RESEARCH';
  }

  /**
   * Get all registered intent types
   */
  getIntentTypes(): IntentType[] {
    return Array.from(new Set(this.patterns.map(p => p.intent))) as IntentType[];
  }

  /**
   * Get intent patterns (for debugging/validation)
   */
  getPatterns(): readonly IntentPattern[] {
    return this.patterns;
  }
}

// Singleton instance
export const intentRouter = new IntentRouter();

// Export for use in CommandController
export default intentRouter;
