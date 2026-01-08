/**
 * Source Credibility Scoring
 * Phase 1, Day 6: Research Mode Polish
 */

import type { ResearchSource, ResearchSourceType } from '../../types/research';

export interface CredibilityScore {
  score: number; // 0-100
  level: 'high' | 'medium' | 'low' | 'unknown';
  factors: CredibilityFactor[];
}

export interface CredibilityFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  reason: string;
}

// Phase 1, Day 6: Known credible domains
const CREDIBLE_DOMAINS: Record<string, { type: ResearchSourceType; score: number }> = {
  // Academic
  edu: { type: 'academic', score: 85 },
  'scholar.google.com': { type: 'academic', score: 90 },
  'arxiv.org': { type: 'academic', score: 85 },
  'pubmed.ncbi.nlm.nih.gov': { type: 'academic', score: 90 },
  'ieee.org': { type: 'academic', score: 85 },
  'acm.org': { type: 'academic', score: 85 },

  // News (reputable)
  'reuters.com': { type: 'news', score: 80 },
  'bbc.com': { type: 'news', score: 80 },
  'ap.org': { type: 'news', score: 80 },
  'theguardian.com': { type: 'news', score: 75 },
  'nytimes.com': { type: 'news', score: 75 },
  'washingtonpost.com': { type: 'news', score: 75 },

  // Documentation
  'github.com': { type: 'documentation', score: 70 },
  'stackoverflow.com': { type: 'documentation', score: 65 },
  'developer.mozilla.org': { type: 'documentation', score: 80 },
  'docs.python.org': { type: 'documentation', score: 80 },
  'nodejs.org': { type: 'documentation', score: 75 },

  // Forums (lower credibility)
  'reddit.com': { type: 'forum', score: 40 },
  'quora.com': { type: 'forum', score: 45 },
};

// Phase 1, Day 6: Known unreliable domains
const UNRELIABLE_DOMAINS: string[] = [
  'blogspot.com',
  'wordpress.com',
  'tumblr.com',
  'medium.com', // Mixed - some good, some not
];

/**
 * Phase 1, Day 6: Calculate credibility score for a source
 */
export function calculateCredibility(source: ResearchSource): CredibilityScore {
  const factors: CredibilityFactor[] = [];
  let score = 50; // Base score

  // Check domain reputation
  const domain = source.domain.toLowerCase();
  const credibleDomain = Object.keys(CREDIBLE_DOMAINS).find(d => domain.includes(d));
  if (credibleDomain) {
    const domainInfo = CREDIBLE_DOMAINS[credibleDomain];
    score = domainInfo.score;
    factors.push({
      name: 'Domain Reputation',
      impact: 'positive',
      reason: `Known ${domainInfo.type} source`,
    });
  } else if (UNRELIABLE_DOMAINS.some(d => domain.includes(d))) {
    score = Math.max(20, score - 30);
    factors.push({
      name: 'Domain Reputation',
      impact: 'negative',
      reason: 'User-generated content platform',
    });
  }

  // Source type scoring
  switch (source.sourceType) {
    case 'academic':
      score = Math.min(100, score + 20);
      factors.push({
        name: 'Source Type',
        impact: 'positive',
        reason: 'Academic source',
      });
      break;
    case 'documentation':
      score = Math.min(100, score + 10);
      factors.push({
        name: 'Source Type',
        impact: 'positive',
        reason: 'Official documentation',
      });
      break;
    case 'news':
      score = Math.min(100, score + 5);
      factors.push({
        name: 'Source Type',
        impact: 'positive',
        reason: 'News source',
      });
      break;
    case 'forum':
      score = Math.max(0, score - 15);
      factors.push({
        name: 'Source Type',
        impact: 'negative',
        reason: 'Forum/discussion source',
      });
      break;
  }

  // Relevance score impact
  if (source.relevanceScore > 0.8) {
    score = Math.min(100, score + 5);
    factors.push({
      name: 'Relevance',
      impact: 'positive',
      reason: 'High relevance to query',
    });
  } else if (source.relevanceScore < 0.3) {
    score = Math.max(0, score - 10);
    factors.push({
      name: 'Relevance',
      impact: 'negative',
      reason: 'Low relevance to query',
    });
  }

  // Timestamp recency (if available)
  if (source.timestamp) {
    const age = Date.now() - source.timestamp;
    const ageInDays = age / (1000 * 60 * 60 * 24);
    if (ageInDays < 30) {
      score = Math.min(100, score + 5);
      factors.push({
        name: 'Recency',
        impact: 'positive',
        reason: 'Recent source (< 30 days)',
      });
    } else if (ageInDays > 365) {
      score = Math.max(0, score - 5);
      factors.push({
        name: 'Recency',
        impact: 'negative',
        reason: 'Older source (> 1 year)',
      });
    }
  }

  // Word count (longer articles often more credible)
  if (source.wordCount && source.wordCount > 1000) {
    score = Math.min(100, score + 5);
    factors.push({
      name: 'Content Depth',
      impact: 'positive',
      reason: 'Detailed article',
    });
  } else if (source.wordCount && source.wordCount < 200) {
    score = Math.max(0, score - 5);
    factors.push({
      name: 'Content Depth',
      impact: 'negative',
      reason: 'Short article',
    });
  }

  // Determine level
  let level: 'high' | 'medium' | 'low' | 'unknown';
  if (score >= 75) {
    level = 'high';
  } else if (score >= 50) {
    level = 'medium';
  } else if (score >= 25) {
    level = 'low';
  } else {
    level = 'unknown';
  }

  return { score, level, factors };
}

/**
 * Phase 1, Day 6: Get credibility badge color
 */
export function getCredibilityColor(level: CredibilityScore['level']): string {
  switch (level) {
    case 'high':
      return 'text-green-400 bg-green-500/20 border-green-500/40';
    case 'medium':
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
    case 'low':
      return 'text-orange-400 bg-orange-500/20 border-orange-500/40';
    case 'unknown':
      return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
  }
}

/**
 * Phase 1, Day 6: Get credibility label
 */
export function getCredibilityLabel(level: CredibilityScore['level']): string {
  switch (level) {
    case 'high':
      return 'High Credibility';
    case 'medium':
      return 'Medium Credibility';
    case 'low':
      return 'Low Credibility';
    case 'unknown':
      return 'Unknown';
  }
}
