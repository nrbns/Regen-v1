export interface IntentResult {
  type: 'navigate' | 'search' | 'ai' | 'unknown';
  input: string;
  confidence: number;
}

export class IntentRouter {
  static route(input: string, context?: { currentUrl?: string }): IntentResult {
    const trimmedInput = input.trim();

    // Check for URLs
    if (this.looksLikeUrl(trimmedInput)) {
      return {
        type: 'navigate',
        input: trimmedInput,
        confidence: 0.9,
      };
    }

    // Check for questions/commands
    if (this.looksLikeQuestion(trimmedInput) || this.looksLikeCommand(trimmedInput)) {
      return {
        type: 'ai',
        input: trimmedInput,
        confidence: 0.8,
      };
    }

    // Default to search
    return {
      type: 'search',
      input: trimmedInput,
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
