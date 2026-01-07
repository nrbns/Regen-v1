/* eslint-env node */
/**
 * Ranking & Relevance Scoring
 * Implements TF-IDF-like scoring, domain trust, recency, and click heuristics
 */

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  source?: string;
  score?: number;
  fetchedAt?: string;
  domain?: string;
}

interface RankingOptions {
  query: string;
  queryTerms: string[];
  boostDomainTrust?: boolean;
  boostRecency?: boolean;
  boostSourceScore?: boolean;
}

/**
 * Trusted domains that get a boost
 */
const TRUSTED_DOMAINS = new Set([
  'wikipedia.org',
  'github.com',
  'stackoverflow.com',
  'reddit.com',
  'arxiv.org',
  'ieee.org',
  'acm.org',
  'nature.com',
  'science.org',
  'edu', // All .edu domains
  'gov', // All .gov domains
]);

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Remove www.
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Calculate domain trust score (0-1)
 */
function getDomainTrustScore(url: string): number {
  const domain = extractDomain(url);

  // Check for exact match
  if (TRUSTED_DOMAINS.has(domain)) {
    return 0.3;
  }

  // Check for TLD match (.edu, .gov)
  if (domain.endsWith('.edu') || domain.endsWith('.gov')) {
    return 0.2;
  }

  // Check for substring match (e.g., github.io, stackoverflow.blog)
  for (const trusted of TRUSTED_DOMAINS) {
    if (domain.includes(trusted)) {
      return 0.15;
    }
  }

  return 0;
}

/**
 * Calculate recency boost (0-1)
 */
function getRecencyBoost(fetchedAt?: string): number {
  if (!fetchedAt) return 0;

  try {
    const fetched = new Date(fetchedAt).getTime();
    const now = Date.now();
    const ageHours = (now - fetched) / (1000 * 60 * 60);

    // Boost for very recent content (last 24 hours)
    if (ageHours < 24) {
      return 0.1;
    }

    // Boost for recent content (last week)
    if (ageHours < 168) {
      return 0.05;
    }

    // Slight boost for recent content (last month)
    if (ageHours < 720) {
      return 0.02;
    }

    return 0;
  } catch {
    return 0;
  }
}

/**
 * Calculate TF-IDF-like score for query relevance
 */
function calculateRelevanceScore(result: SearchResult, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 0.5;

  const titleLower = (result.title || '').toLowerCase();
  const snippetLower = (result.snippet || '').toLowerCase();
  const combinedText = `${titleLower} ${snippetLower}`;

  let score = 0;
  let matches = 0;

  for (const term of queryTerms) {
    const termLower = term.toLowerCase();

    // Title matches are worth more
    if (titleLower.includes(termLower)) {
      score += 0.4;
      matches++;
    }

    // Snippet matches
    if (snippetLower.includes(termLower)) {
      score += 0.2;
      matches++;
    }

    // Exact phrase match (bonus)
    if (combinedText.includes(queryTerms.join(' ').toLowerCase())) {
      score += 0.2;
    }
  }

  // Normalize by query length
  const normalized = score / Math.max(queryTerms.length, 1);

  // Bonus for matching all terms
  if (matches === queryTerms.length && queryTerms.length > 1) {
    return Math.min(1, normalized + 0.2);
  }

  return Math.min(1, normalized);
}

/**
 * Calculate source-specific score boost
 */
function getSourceScore(source?: string): number {
  const sourceBoosts: Record<string, number> = {
    wikipedia: 0.15,
    github: 0.12,
    stackoverflow: 0.12,
    reddit: 0.08,
    arxiv: 0.15,
    brave: 0.05,
    duckduckgo: 0.03,
    google: 0.04,
    bing: 0.04,
  };

  if (!source) return 0;

  const sourceLower = source.toLowerCase();
  for (const [key, boost] of Object.entries(sourceBoosts)) {
    if (sourceLower.includes(key)) {
      return boost;
    }
  }

  return 0;
}

/**
 * Rank and score search results
 */
export function rankResults(results: SearchResult[], options: RankingOptions): SearchResult[] {
  const {
    query: _query,
    queryTerms,
    boostDomainTrust = true,
    boostRecency = true,
    boostSourceScore = true,
  } = options;

  // Calculate scores for each result
  const scored = results.map(result => {
    // Base relevance score (TF-IDF-like)
    let score = calculateRelevanceScore(result, queryTerms);

    // Apply source score if enabled
    if (boostSourceScore && result.source) {
      score += getSourceScore(result.source);
    }

    // Apply domain trust boost if enabled
    if (boostDomainTrust) {
      score += getDomainTrustScore(result.url);
    }

    // Apply recency boost if enabled
    if (boostRecency) {
      score += getRecencyBoost(result.fetchedAt);
    }

    // Preserve original score if it exists (weighted combination)
    if (result.score !== undefined) {
      score = score * 0.7 + result.score * 0.3;
    }

    // Ensure domain is set
    const domain = result.domain || extractDomain(result.url);

    return {
      ...result,
      score: Math.min(1, score), // Cap at 1.0
      domain,
    };
  });

  // Sort by score (descending)
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));

  return scored;
}

/**
 * Deduplicate results by URL (keep highest scoring)
 */
export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const urlMap = new Map<string, SearchResult>();

  for (const result of results) {
    if (!result.url) continue;

    // Normalize URL
    try {
      const url = new URL(result.url);
      url.hash = ''; // Remove fragment
      url.search = ''; // Remove query params for deduplication?
      const normalized = url.href.replace(/\/$/, '');

      const existing = urlMap.get(normalized);
      if (!existing || (result.score || 0) > (existing.score || 0)) {
        urlMap.set(normalized, result);
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return Array.from(urlMap.values());
}

/**
 * Apply final ranking pipeline
 */
export function applyRankingPipeline(
  results: SearchResult[],
  query: string,
  queryTerms: string[]
): SearchResult[] {
  // Step 1: Deduplicate
  const deduped = deduplicateResults(results);

  // Step 2: Score and rank
  const ranked = rankResults(deduped, {
    query,
    queryTerms,
    boostDomainTrust: true,
    boostRecency: true,
    boostSourceScore: true,
  });

  // Step 3: Remove low-scoring results (optional filter)
  const filtered = ranked.filter(r => (r.score || 0) > 0.1);

  return filtered;
}
