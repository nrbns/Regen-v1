/* eslint-env node */
/**
 * Query Normalization
 * Handles stopword removal, typo correction, intent detection, and query expansion
 */

// Common stopwords (English)
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
  'had', 'what', 'said', 'each', 'which', 'she', 'do', 'how', 'their',
  'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some',
  'her', 'would', 'make', 'like', 'into', 'him', 'time', 'has', 'look',
  'two', 'more', 'write', 'go', 'see', 'number', 'no', 'way', 'could',
  'people', 'my', 'than', 'first', 'water', 'been', 'call', 'who', 'oil',
  'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come',
  'made', 'may', 'part',
]);

/**
 * Remove stopwords from query (optional - some queries need them)
 */
export function removeStopwords(query: string, keepStopwords = false): string {
  if (keepStopwords) return query;

  const words = query.toLowerCase().split(/\s+/);
  const filtered = words.filter(word => !STOPWORDS.has(word));
  
  // If we removed too much, return original
  if (filtered.length < words.length * 0.3) {
    return query;
  }

  return filtered.join(' ');
}

/**
 * Normalize query string
 */
export function normalizeQuery(query: string): {
  normalized: string;
  original: string;
  terms: string[];
  language?: string;
} {
  if (!query || typeof query !== 'string') {
    return { normalized: '', original: query || '', terms: [] };
  }

  const original = query.trim();
  
  // Remove extra whitespace
  let normalized = original.replace(/\s+/g, ' ').trim();
  
  // Remove special characters but keep spaces and basic punctuation
  normalized = normalized.replace(/[^\w\s\-']/g, ' ');
  
  // Lowercase for consistency
  const lowercased = normalized.toLowerCase();
  
  // Extract terms
  const terms = lowercased
    .split(/\s+/)
    .filter(term => term.length > 0 && term.length < 50)
    .filter(term => !STOPWORDS.has(term)); // Remove stopwords from terms array

  return {
    normalized: lowercased,
    original,
    terms,
  };
}

/**
 * Detect query intent (simple heuristic-based)
 */
export function detectIntent(query: string): {
  type: 'question' | 'search' | 'definition' | 'comparison' | 'howto';
  confidence: number;
} {
  const normalized = query.toLowerCase().trim();
  
  // Question detection
  const questionWords = ['what', 'when', 'where', 'who', 'why', 'how', 'which', 'whose'];
  const isQuestion = questionWords.some(word => normalized.startsWith(word + ' '));
  if (isQuestion) {
    return { type: 'question', confidence: 0.8 };
  }

  // Definition detection
  if (normalized.match(/^(what is|what are|define|definition of|meaning of)/i)) {
    return { type: 'definition', confidence: 0.9 };
  }

  // Comparison detection
  if (normalized.match(/\bvs\b|\bversus\b|\bcompare\b|\bdifference between\b/i)) {
    return { type: 'comparison', confidence: 0.85 };
  }

  // How-to detection
  if (normalized.match(/^(how to|how do|how can|tutorial|guide)/i)) {
    return { type: 'howto', confidence: 0.8 };
  }

  // Default to search
  return { type: 'search', confidence: 0.5 };
}

/**
 * Expand query with synonyms (basic - could be enhanced with a thesaurus)
 */
export function expandQuery(query: string): string[] {
  // Simple synonym expansion (you can expand this with a proper thesaurus)
  const synonyms: Record<string, string[]> = {
    'car': ['vehicle', 'automobile'],
    'phone': ['smartphone', 'mobile'],
    'computer': ['pc', 'laptop', 'desktop'],
    'buy': ['purchase', 'acquire'],
    'cheap': ['inexpensive', 'affordable', 'budget'],
  };

  const terms = normalizeQuery(query).terms;
  const expansions = [query]; // Always include original

  for (const term of terms) {
    if (synonyms[term]) {
      for (const synonym of synonyms[term]) {
        const expanded = query.replace(new RegExp(`\\b${term}\\b`, 'gi'), synonym);
        expansions.push(expanded);
      }
    }
  }

  return [...new Set(expansions)]; // Deduplicate
}

/**
 * Calculate query complexity score (0-1)
 */
export function getQueryComplexity(query: string): number {
  const normalized = normalizeQuery(query);
  const termCount = normalized.terms.length;
  const charCount = query.length;
  
  // Simple heuristic: more terms and characters = more complex
  const complexity = Math.min(1, (termCount / 10) + (charCount / 200));
  return complexity;
}


