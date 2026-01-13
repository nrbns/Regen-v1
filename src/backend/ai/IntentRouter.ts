import { AIController } from './AIController';

export interface IntentResult {
  type: 'navigate' | 'search' | 'ai' | 'unknown';
  input: string;
  confidence: number;
}

export class IntentRouter {
  static async route(input: string, _context?: { currentUrl?: string }): Promise<IntentResult> {
    const trimmedInput = input.trim();

    // Check for URLs first (fast, no AI needed)
    if (this.looksLikeUrl(trimmedInput)) {
      return {
        type: 'navigate',
        input: trimmedInput,
        confidence: 0.9,
      };
    }

    // Use AI for intent detection if available
    if (AIController.isAvailable()) {
      try {
        const aiIntent = await AIController.detectIntent(trimmedInput);
        return {
          type: this.mapAIIntentToType(aiIntent),
          input: trimmedInput,
          confidence: 0.95, // AI-detected intents are more confident
        };
      } catch (error) {
        console.warn('[IntentRouter] AI intent detection failed, using fallback:', error);
      }
    }

    // Fallback to rule-based detection
    return this.fallbackIntentDetection(trimmedInput);
  }

  private static mapAIIntentToType(aiIntent: string): 'navigate' | 'search' | 'ai' | 'unknown' {
    const intent = aiIntent.toLowerCase();

    if (intent.includes('navigate') || intent.includes('url') || intent.includes('visit')) {
      return 'navigate';
    }

    if (intent.includes('search') || intent.includes('find') || intent.includes('lookup')) {
      return 'search';
    }

    if (intent.includes('analyze') || intent.includes('explain') || intent.includes('question') || intent.includes('help')) {
      return 'ai';
    }

    return 'unknown';
  }

  private static fallbackIntentDetection(input: string): IntentResult {
    // Check for questions/commands
    if (this.looksLikeQuestion(input) || this.looksLikeCommand(input)) {
      return {
        type: 'ai',
        input,
        confidence: 0.8,
      };
    }

    // Default to search
    return {
      type: 'search',
      input,
      confidence: 0.7,
    };
  }

  private static looksLikeUrl(input: string): boolean {
    // Check for URLs with or without protocol
    return /^https?:\/\//i.test(input) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(input);
  }

  private static looksLikeQuestion(input: string): boolean {
    const questionWords = /^(what|how|why|when|where|who|which|can|should|does|explain|summarize|analyze)/i;
    return questionWords.test(input) || input.includes('?');
  }

  private static looksLikeCommand(input: string): boolean {
    const commandWords = /^(open|go to|search|find|compare|tell me)/i;
    return commandWords.test(input);
  }
}
