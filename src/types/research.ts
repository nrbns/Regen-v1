export type ResearchSourceType = 'news' | 'academic' | 'documentation' | 'forum' | 'other';

export interface ResearchSource {
  id?: string;
  url: string;
  title: string;
  text: string;
  snippet: string;
  timestamp?: number;
  domain: string;
  relevanceScore: number;
  sourceType: ResearchSourceType;
  /**
   * Legacy alias used across the app. Kept for backward compatibility.
   */
  type?: ResearchSourceType;
  excerpt?: string;
  image?: string;
  contentHash?: string;
  fetchedAt?: string;
  wordCount?: number;
  lang?: string;
  fromCache?: boolean;
  rendered?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ResearchCitation {
  index: number;
  sourceIndex: number;
  quote: string;
  confidence: number;
}

export interface ResearchContradiction {
  claim: string;
  sources: number[];
  disagreement: 'minor' | 'major';
  summary?: string;
  severityScore?: number;
}

export interface ResearchEvidence {
  id: string;
  sourceIndex: number;
  quote: string;
  context: string;
  importance: 'high' | 'medium' | 'low';
  fragmentUrl: string;
}

export interface ResearchInlineEvidence {
  from: number;
  to: number;
  citationIndex: number;
  sourceIndex: number;
  quote?: string;
}

export interface ResearchTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'done';
  action?: {
    type: 'openSource' | 'openEvidence';
    sourceIndex?: number;
    evidenceId?: string;
    fragmentUrl?: string;
  };
}

export interface ResearchTaskChain {
  id: string;
  label: string;
  steps: ResearchTask[];
}

export interface ResearchHighlight {
  id: string;
  text: string;
  color: string;
  createdAt: number;
  note?: string;
}

export interface BiasProfile {
  authorityBias: number;
  recencyBias: number;
  domainMix: Array<{
    type: ResearchSourceType;
    percentage: number;
  }>;
}

export interface VerificationResult {
  verified: boolean;
  claimDensity: number;
  citationCoverage: number;
  ungroundedClaims: Array<{
    text: string;
    position: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  hallucinationRisk: number;
  suggestions: string[];
}

export interface ResearchResult {
  query: string;
  sources: ResearchSource[];
  summary: string;
  citations: ResearchCitation[];
  confidence: number;
  contradictions?: ResearchContradiction[];
  verification?: VerificationResult;
  evidence?: ResearchEvidence[];
  biasProfile?: BiasProfile;
  taskChains?: ResearchTaskChain[];
  inlineEvidence?: ResearchInlineEvidence[];
}
