/* eslint-env node */
/**
 * Golden Prompts for Beating Perplexity
 * These are the exact search queries & prompts that produce "wow" answers
 */

export const GOLDEN_PROMPTS = {
  /**
   * 1. Ultra-deep mode (beats every other AI in 2025)
   */
  ultraDeep: {
    systemPrompt: `Act as a world-class intelligence analyst with access to real-time web + X data. Use a multi-hop reasoning chain. First, list 8–12 highly specific, non-obvious search queries that would reveal hidden truths or cutting-edge developments on this topic (include arXiv, GitHub, patents, obscure forums, and deep X threads). Then execute the top 5 in parallel. Finally, synthesize into a surprising, defensible answer with live citations.`,
    
    generateQueries: (topic) => [
      `site:arxiv.org ${topic} 2024 OR 2025`,
      `site:github.com ${topic} stars:>100 created:>2024-09-01`,
      `site:patents.google.com ${topic}`,
      `${topic} "deep dive" OR "comprehensive analysis" filetype:pdf`,
      `${topic} site:news.ycombinator.com`,
      `${topic} site:reddit.com/r/MachineLearning OR r/programming`,
      `${topic} "breaking" OR "just announced" OR "new release"`,
      `${topic} controversy OR debate OR criticism`,
    ],
  },

  /**
   * 2. Twitter/X Deep Dive
   */
  twitterDeepDive: {
    systemPrompt: `Search X for the last 72 hours using 6 different advanced operators (from:, since:, filter:links, min_retweets:50, etc.). Look for takes from verified engineers, founders, or researchers with >10k followers. Extract signal vs noise. Quote the 4 most important tweets verbatim with links.`,
    
    generateQueries: (topic) => [
      `${topic} min_retweets:50 since:2025-01-01`,
      `${topic} filter:verified min_followers:10000`,
      `${topic} filter:links -filter:retweets`,
      `${topic} lang:en -filter:retweets min_replies:10`,
    ],
  },

  /**
   * 3. Contra-consensus hunter
   */
  contraConsensus: {
    systemPrompt: `Find the 3 strongest recent arguments AGAINST the current mainstream view on this topic. Prioritize sources that are credentialed but dissenting (e.g. Stanford professor vs consensus, leaked internal docs, etc.).`,
    
    generateQueries: (topic) => [
      `${topic} "criticism" OR "problem" OR "issue" OR "concern"`,
      `${topic} "alternative view" OR "dissenting opinion" OR "contrary"`,
      `${topic} "debate" OR "controversy" OR "disagreement"`,
      `${topic} site:edu "however" OR "but" OR "limitation"`,
    ],
  },

  /**
   * 4. Primary source explosion
   */
  primarySource: {
    systemPrompt: `Go directly to the original paper / commit / SEC filing / patent / court document. Quote the exact paragraph that matters. Never rely on secondary articles.`,
    
    generateQueries: (topic) => [
      `site:arxiv.org ${topic} filetype:pdf`,
      `site:github.com ${topic} "README" OR "docs"`,
      `site:sec.gov ${topic} filetype:pdf`,
      `site:patents.google.com ${topic}`,
      `${topic} "original research" OR "primary source" filetype:pdf`,
    ],
  },

  /**
   * 5. 2025 bleeding edge
   */
  bleedingEdge: {
    systemPrompt: `Search arXiv, HuggingFace, GitHub "stars:>1000 created:>2025-09-01", and v0/vercel showcases for implementations that are <90 days old.`,
    
    generateQueries: (topic) => [
      `site:arxiv.org ${topic} submittedDate:[2024-09-01 TO *]`,
      `site:github.com ${topic} stars:>1000 created:>2024-09-01`,
      `site:huggingface.co ${topic} created:>2024-09-01`,
      `${topic} "released" OR "launched" OR "announced" 2025`,
    ],
  },
};

/**
 * Generate all queries for a topic using all golden prompts
 */
export function generateAllQueries(topic) {
  const allQueries = [];
  
  for (const [key, prompt] of Object.entries(GOLDEN_PROMPTS)) {
    const queries = prompt.generateQueries(topic);
    allQueries.push(...queries.map(q => ({ query: q, strategy: key })));
  }
  
  return allQueries;
}

/**
 * Get the system prompt for a specific strategy
 */
export function getSystemPrompt(strategy = 'ultraDeep') {
  return GOLDEN_PROMPTS[strategy]?.systemPrompt || GOLDEN_PROMPTS.ultraDeep.systemPrompt;
}




