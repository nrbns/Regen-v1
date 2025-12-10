/**
 * Voice Command Parser for Research Mode
 * Parses voice commands like "Research in Bengali about AI" or "Research about quantum computing"
 *
 * v0.4 Enhancement: Agentic chaining - detects trade/research/scrape intents
 */

const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  hindi: ['hindi', 'हिंदी'],
  tamil: ['tamil', 'தமிழ்'],
  telugu: ['telugu', 'తెలుగు'],
  bengali: ['bengali', 'bangla', 'বাংলা'],
  marathi: ['marathi', 'मराठी'],
  kannada: ['kannada', 'ಕನ್ನಡ'],
  malayalam: ['malayalam', 'മലയാളം'],
  gujarati: ['gujarati', 'ગુજરાતી'],
  punjabi: ['punjabi', 'ਪੰਜਾਬੀ'],
  urdu: ['urdu', 'اردو'],
  english: ['english'],
  spanish: ['spanish', 'español'],
  french: ['french', 'français'],
  german: ['german', 'deutsch'],
  chinese: ['chinese', '中文'],
  japanese: ['japanese', '日本語'],
  korean: ['korean', '한국어'],
  russian: ['russian', 'Русский'],
  portuguese: ['portuguese', 'português'],
  arabic: ['arabic', 'العربية'],
};

const LANGUAGE_CODE_MAP: Record<string, string> = {
  hindi: 'hi',
  tamil: 'ta',
  telugu: 'te',
  bengali: 'bn',
  marathi: 'mr',
  kannada: 'kn',
  malayalam: 'ml',
  gujarati: 'gu',
  punjabi: 'pa',
  urdu: 'ur',
  english: 'en',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  chinese: 'zh',
  japanese: 'ja',
  korean: 'ko',
  russian: 'ru',
  portuguese: 'pt',
  arabic: 'ar',
};

const RESEARCH_TRIGGERS = [
  'research',
  'search',
  'find',
  'look up',
  'investigate',
  'explore',
  'analyze',
  'study',
];

// v0.4: Trade intent triggers
const TRADE_TRIGGERS = [
  'trade',
  'buy',
  'sell',
  'order',
  'nifty',
  'banknifty',
  'reliance',
  'tcs',
  'bitcoin',
  'ethereum',
  'stock',
  'share',
  'position',
];

// v0.4: Scrape/action triggers
const SCRAPE_TRIGGERS = [
  'scrape',
  'extract',
  'get data',
  'fetch',
  'download',
  'save page',
  'capture',
];

export interface ParsedVoiceCommand {
  isResearchCommand: boolean;
  isTradeCommand?: boolean;
  isScrapeCommand?: boolean;
  language?: string;
  query: string;
  originalText: string;
  // v0.4: Agentic action details
  action?: {
    type: 'research' | 'trade' | 'scrape';
    target?: string; // symbol, URL, or query
    params?: Record<string, unknown>; // quantity, side, etc.
  };
}

/**
 * Parse voice command to extract research query and language
 * v0.4: Enhanced with trade/scrape intent detection
 */
export function parseResearchVoiceCommand(text: string): ParsedVoiceCommand {
  const lowerText = text.toLowerCase().trim();
  const originalText = text.trim();

  // Check for trade intent first (higher priority for action commands)
  const isTradeCommand = TRADE_TRIGGERS.some(trigger => lowerText.includes(trigger));
  const isScrapeCommand = SCRAPE_TRIGGERS.some(trigger => lowerText.includes(trigger));
  const isResearchCommand = RESEARCH_TRIGGERS.some(trigger => lowerText.includes(trigger));

  // If no clear intent, default to research
  if (!isTradeCommand && !isScrapeCommand && !isResearchCommand) {
    return {
      isResearchCommand: false,
      query: originalText,
      originalText,
    };
  }

  // Extract language from phrases like "research in [language]" or "research [language]"
  let detectedLanguage: string | undefined;
  let query = originalText;
  let action: ParsedVoiceCommand['action'] | undefined;

  // Trade command parsing
  if (isTradeCommand) {
    const buyMatch = lowerText.match(
      /(?:buy|purchase)\s+(\d+)?\s*(?:shares?|lots?)?\s*(?:of\s+)?([a-z0-9]+)/i
    );
    const sellMatch = lowerText.match(
      /(?:sell|short)\s+(\d+)?\s*(?:shares?|lots?)?\s*(?:of\s+)?([a-z0-9]+)/i
    );
    const symbolMatch = lowerText.match(/(?:trade|order)\s+([a-z0-9]+)/i);

    if (buyMatch) {
      action = {
        type: 'trade',
        target: buyMatch[2],
        params: { side: 'buy', quantity: buyMatch[1] ? parseInt(buyMatch[1], 10) : 1 },
      };
      query = `Buy ${buyMatch[1] || '1'} ${buyMatch[2]}`;
    } else if (sellMatch) {
      action = {
        type: 'trade',
        target: sellMatch[2],
        params: { side: 'sell', quantity: sellMatch[1] ? parseInt(sellMatch[1], 10) : 1 },
      };
      query = `Sell ${sellMatch[1] || '1'} ${sellMatch[2]}`;
    } else if (symbolMatch) {
      action = {
        type: 'trade',
        target: symbolMatch[1],
        params: {},
      };
      query = `Trade ${symbolMatch[1]}`;
    } else {
      // Generic trade command - extract symbol from common names
      const symbolKeywords: Record<string, string> = {
        nifty: 'NIFTY50',
        banknifty: 'BANKNIFTY',
        reliance: 'RELIANCE',
        tcs: 'TCS',
        bitcoin: 'BTCUSDT',
        ethereum: 'ETHUSDT',
      };
      for (const [key, symbol] of Object.entries(symbolKeywords)) {
        if (lowerText.includes(key)) {
          action = { type: 'trade', target: symbol, params: {} };
          query = `Trade ${symbol}`;
          break;
        }
      }
    }
  }

  // Scrape command parsing
  if (isScrapeCommand) {
    const urlMatch = originalText.match(
      /(?:scrape|extract|fetch|get)\s+(?:from\s+)?(https?:\/\/[^\s]+)/i
    );
    const pageMatch = lowerText.match(
      /(?:scrape|extract|save)\s+(?:the\s+)?(?:current\s+)?(?:page|url)/i
    );

    if (urlMatch) {
      action = {
        type: 'scrape',
        target: urlMatch[1],
        params: {},
      };
      query = `Scrape ${urlMatch[1]}`;
    } else if (pageMatch) {
      action = {
        type: 'scrape',
        target: 'current',
        params: {},
      };
      query = 'Scrape current page';
    }
  }

  // Research command parsing (existing logic)
  if (isResearchCommand && !action) {
    // Pattern 1: "research in [language] about [query]"
    const inPattern = /research\s+in\s+(\w+)(?:\s+about\s+(.+))?/i;
    const inMatch = originalText.match(inPattern);
    if (inMatch) {
      const langKeyword = inMatch[1].toLowerCase();
      detectedLanguage = findLanguageCode(langKeyword);
      query = inMatch[2] || originalText.replace(inPattern, '').trim();
    }

    // Pattern 2: "research [language] [query]" (without "in")
    if (!detectedLanguage) {
      for (const [langName, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
        for (const keyword of keywords) {
          const pattern = new RegExp(`research\\s+${keyword}\\s+(.+)$`, 'i');
          const match = originalText.match(pattern);
          if (match) {
            detectedLanguage = LANGUAGE_CODE_MAP[langName];
            query = match[1].trim();
            break;
          }
        }
        if (detectedLanguage) break;
      }
    }

    // Pattern 3: "research about [query]" or "research [query]"
    if (!detectedLanguage) {
      const aboutPattern = /research\s+(?:about\s+)?(.+)$/i;
      const aboutMatch = originalText.match(aboutPattern);
      if (aboutMatch) {
        query = aboutMatch[1].trim();
      } else {
        // Remove research trigger words and clean up
        query = originalText
          .replace(new RegExp(`(${RESEARCH_TRIGGERS.join('|')})\\s+`, 'gi'), '')
          .trim();
      }
    }

    action = {
      type: 'research',
      target: query,
      params: { language: detectedLanguage },
    };
  }

  // Clean up query - remove common filler words
  if (!isTradeCommand && !isScrapeCommand) {
    query = query.replace(/^(in|about|on|for|regarding|concerning)\s+/i, '').trim();
  }

  return {
    isResearchCommand,
    isTradeCommand,
    isScrapeCommand,
    language: detectedLanguage,
    query: query || originalText, // Fallback to original if query is empty
    originalText,
    action,
  };
}

/**
 * Find language code from keyword
 */
function findLanguageCode(keyword: string): string | undefined {
  const lowerKeyword = keyword.toLowerCase();

  for (const [langName, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
    if (keywords.some(k => k.toLowerCase() === lowerKeyword)) {
      return LANGUAGE_CODE_MAP[langName];
    }
  }

  // Direct code match
  if (LANGUAGE_CODE_MAP[lowerKeyword]) {
    return LANGUAGE_CODE_MAP[lowerKeyword];
  }

  return undefined;
}

/**
 * Check if text contains a research command
 */
export function isResearchCommand(text: string): boolean {
  return parseResearchVoiceCommand(text).isResearchCommand;
}

/**
 * v0.4: Check if text contains a trade command
 */
export function isTradeCommand(text: string): boolean {
  return parseResearchVoiceCommand(text).isTradeCommand ?? false;
}

/**
 * v0.4: Check if text contains a scrape command
 */
export function isScrapeCommand(text: string): boolean {
  return parseResearchVoiceCommand(text).isScrapeCommand ?? false;
}
