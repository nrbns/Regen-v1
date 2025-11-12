/**
 * Enhanced Research Mode Service
 * Multi-source retrieval, parallel fetching, source voting, summarization with citations
 */

// @ts-nocheck

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { randomUUID } from 'node:crypto';
import { registerHandler } from '../shared/ipc/router';
import { createLogger } from './utils/logger';
import { z } from 'zod';
import { verifyResearchResult, VerificationResult } from './research-verifier';
import { getHybridSearchService, SearchResult as HybridSearchResult } from './search/hybrid-search';
import { stealthFetchPage } from './stealth-fetch';

export interface ResearchSource {
  url: string;
  title: string;
  text: string;
  snippet: string;
  timestamp?: number;
  domain: string;
  relevanceScore: number;
  sourceType: 'news' | 'academic' | 'documentation' | 'forum' | 'other';
  metadata?: Record<string, unknown>;
}

export interface ResearchCitation {
  index: number;
  sourceIndex: number;
  quote: string;
  confidence: number;
}

export interface ResearchInlineEvidence {
  from: number;
  to: number;
  citationIndex: number;
  sourceIndex: number;
  quote?: string;
}

export interface ResearchEvidence {
  id: string;
  sourceIndex: number;
  quote: string;
  context: string;
  importance: 'high' | 'medium' | 'low';
  fragmentUrl: string;
}

export interface CiteEntry {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  text?: string;
  domain?: string;
  relevanceScore?: number;
  sourceType?: ResearchSource['sourceType'];
}

export interface ResearchIssue {
  type: 'uncited' | 'contradiction';
  sentenceIdx: number;
  detail?: string;
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

export interface BiasProfile {
  authorityBias: number;
  recencyBias: number;
  domainMix: Array<{
    type: ResearchSource['sourceType'];
    percentage: number;
  }>;
}

export interface ResearchResult {
  query: string;
  sources: ResearchSource[];
  summary: string;
  citations: ResearchCitation[];
  confidence: number;
  contradictions?: Array<{
    claim: string;
    sources: number[];
    disagreement: 'minor' | 'major';
    summary?: string;
    severityScore?: number;
  }>;
  verification?: VerificationResult;
  evidence?: ResearchEvidence[];
  biasProfile?: BiasProfile;
  taskChains?: ResearchTaskChain[];
  inlineEvidence?: ResearchInlineEvidence[];
}

const CACHE_TTL = 3600000; // 1 hour
const contentCache = new Map<string, { content: ResearchSource; timestamp: number }>();
const logger = createLogger('research-enhanced');
const INTERNAL_SOURCES = Symbol('researchSources');
const INTERNAL_SOURCE_IDS = Symbol('researchSourceIds');
const INTERNAL_RESULT = Symbol('researchResult');

interface ScoreWeights {
  recencyWeight: number;
  authorityWeight: number;
}

/**
 * Extract domain from URL
 */
function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Classify source type based on URL/domain
 */
function classifySourceType(url: string, title: string): ResearchSource['sourceType'] {
  const domain = getDomain(url).toLowerCase();
  const titleLower = title.toLowerCase();
  
  if (domain.includes('arxiv.org') || domain.includes('pubmed') || domain.includes('.edu') || domain.includes('scholar')) {
    return 'academic';
  }
  if (domain.includes('news') || domain.includes('bbc') || domain.includes('cnn') || domain.includes('reuters')) {
    return 'news';
  }
  if (domain.includes('docs') || domain.includes('github.io') || domain.includes('readthedocs')) {
    return 'documentation';
  }
  if (domain.includes('reddit') || domain.includes('stackoverflow') || domain.includes('forum')) {
    return 'forum';
  }
  return 'other';
}

/**
 * Fetch readable content from URL (with caching)
 */
function normalizeUrl(url: string): string {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
}

function parseMetadataTimestamp(meta?: HybridSearchResult): number | undefined {
  if (!meta) return undefined;
  if (typeof meta.timestamp === 'number') {
    return meta.timestamp;
  }
  const metadata = meta.metadata as Record<string, unknown> | undefined;
  const crawl = metadata?.dateLastCrawled;
  if (typeof crawl === 'string' && !Number.isNaN(Date.parse(crawl))) {
    return Date.parse(crawl);
  }
  const age = metadata?.age;
  if (typeof age === 'string') {
    const match = age.match(/(\d+)\s*(d|day|days|h|hr|hour|hours|m|min|minute|minutes)/i);
    if (match) {
      const value = Number(match[1]);
      const unit = match[2].toLowerCase();
      if (!Number.isNaN(value)) {
        const now = Date.now();
        if (unit.startsWith('d')) {
          return now - value * 24 * 60 * 60 * 1000;
        }
        if (unit.startsWith('h')) {
          return now - value * 60 * 60 * 1000;
        }
        if (unit.startsWith('m')) {
          return now - value * 60 * 1000;
        }
      }
    }
  }
  return undefined;
}

async function fetchReadable(target: string, timeout = 10000, meta?: HybridSearchResult): Promise<ResearchSource | null> {
  const normalizedTarget = normalizeUrl(target);

  // Check cache
  const cached = contentCache.get(normalizedTarget);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    if (meta) {
      cached.content.metadata = { ...(meta.metadata || {}), source: meta.source, score: meta.score };
      if (meta.snippet) {
        cached.content.snippet = meta.snippet;
      }
      const parsedTimestamp = parseMetadataTimestamp(meta);
      if (parsedTimestamp) {
        cached.content.timestamp = parsedTimestamp;
      }
    }
    return cached.content;
  }

  const stealthResult = await stealthFetchPage(target, { timeout }).catch(() => null);

  try {
    if (!stealthResult) {
      throw new Error('Stealth fetch failed');
    }

    const effectiveUrl = normalizeUrl(stealthResult.finalUrl || target);
    const dom = new JSDOM(stealthResult.html, { url: effectiveUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) return null;
    const text = (article.textContent || '').replace(/[\t\r]+/g, ' ').trim();
    const title = article.title || stealthResult.title || dom.window.document.title || effectiveUrl;
    const defaultSnippet = text.slice(0, 200) + (text.length > 200 ? '...' : '');
    const snippet = meta?.snippet?.trim() ? meta.snippet.trim() : defaultSnippet;
    const timestamp = parseMetadataTimestamp(meta) ?? Date.now();

    const source: ResearchSource = {
      url: effectiveUrl,
      title,
      text,
      snippet,
      timestamp,
      domain: getDomain(effectiveUrl),
      relevanceScore: 0,
      sourceType: classifySourceType(target, title),
      metadata: meta ? { ...(meta.metadata || {}), source: meta.source, score: meta.score } : undefined,
    };

    // Cache result
    const cacheEntry = { content: source, timestamp: Date.now() };
    contentCache.set(effectiveUrl, cacheEntry);
    if (effectiveUrl !== normalizedTarget) {
      contentCache.set(normalizedTarget, cacheEntry);
    }

    return source;
  } catch (error) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(target, {
        headers: { 'User-Agent': 'OmniBrowserBot/1.0' },
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);
      if (!res || !res.ok) return null;

      const html = await res.text();
      const dom = new JSDOM(html, { url: target });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) return null;
      const text = (article.textContent || '').replace(/[\t\r]+/g, ' ').trim();
      const title = article.title || dom.window.document.title || target;
      const defaultSnippet = text.slice(0, 200) + (text.length > 200 ? '...' : '');
      const snippet = meta?.snippet?.trim() ? meta.snippet.trim() : defaultSnippet;
      const timestamp = parseMetadataTimestamp(meta) ?? Date.now();

      const source: ResearchSource = {
        url: target,
        title,
        text,
        snippet,
        timestamp,
        domain: getDomain(target),
        relevanceScore: 0,
        sourceType: classifySourceType(target, title),
        metadata: meta ? { ...(meta.metadata || {}), source: meta.source, score: meta.score } : undefined,
      };

      contentCache.set(normalizedTarget, { content: source, timestamp: Date.now() });
      return source;
    } catch (fallbackError) {
      console.warn('[Research] Failed to fetch readable content:', fallbackError);
      return null;
    }
  }
}

/**
 * Parallel fetch multiple URLs
 */
async function fetchMultipleParallel(
  urls: string[],
  metadataMap?: Map<string, HybridSearchResult>,
  maxConcurrent = 5
): Promise<ResearchSource[]> {
  const results: ResearchSource[] = [];
  const chunks: string[][] = [];
  
  // Split into chunks for parallel fetching
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    chunks.push(urls.slice(i, i + maxConcurrent));
  }
  
  for (const chunk of chunks) {
    const promises = chunk.map(url => {
      const meta = metadataMap?.get(normalizeUrl(url));
      return fetchReadable(url, 10000, meta);
    });
    const chunkResults = await Promise.allSettled(promises);
    
    for (const result of chunkResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    }
  }
  
  return results;
}

/**
 * Search multiple engines in parallel
 */
async function searchMultipleEngines(
  query: string,
  maxResults = 12,
  region?: string
): Promise<{ urls: string[]; metadata: Map<string, HybridSearchResult> }> {
  const urls: string[] = [];
  const metadata = new Map<string, HybridSearchResult>();
  const finalQuery = region && region.trim().length > 0 && region.toLowerCase() !== 'global'
    ? `${query} ${region}`
    : query;

  try {
    const hybrid = getHybridSearchService();
    const hybridResults = await hybrid.search(finalQuery, { maxResults });
    for (const result of hybridResults) {
      const norm = normalizeUrl(result.url);
      if (!metadata.has(norm)) {
        metadata.set(norm, result);
        urls.push(result.url);
      }
    }
  } catch (error) {
    logger.error('Hybrid search failed', { error });
  }

  // Fallback to DuckDuckGo if we still need more URLs
  if (urls.length < maxResults) {
    try {
      const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(finalQuery)}`;
      const res = await fetch(ddgUrl, { headers: { 'User-Agent': 'OmniBrowserBot/1.0' } });
      const html = await res.text();
      const links = Array.from(html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"/g))
        .map(m => m[1])
        .filter(Boolean);
      for (const link of links) {
        const norm = normalizeUrl(link);
        if (!metadata.has(norm)) {
          metadata.set(norm, {
            title: link,
            url: link,
            snippet: '',
            source: 'duckduckgo',
            score: 0.5,
          } as HybridSearchResult);
          urls.push(link);
          if (urls.length >= maxResults) break;
        }
      }
    } catch (error) {
      logger.error('DuckDuckGo fallback search failed', { error });
    }
  }

  return {
    urls: urls.slice(0, maxResults),
    metadata,
  };
}

/**
 * Calculate relevance score for a source
 */
function calculateRelevanceScore(source: ResearchSource, query: string, weights: ScoreWeights): number {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const textLower = source.text.toLowerCase();
  const titleLower = source.title.toLowerCase();
  
  let score = 0;
  
  // Title matches are more important
  for (const term of queryTerms) {
    if (titleLower.includes(term)) score += 5;
    if (textLower.includes(term)) score += 1;
  }
  
  const authorityMultiplier = 1 + Math.max(0, Math.min(1, weights.authorityWeight));
  switch (source.sourceType) {
    case 'academic':
      score += 10 * authorityMultiplier;
      break;
    case 'documentation':
      score += 6 * authorityMultiplier;
      break;
    case 'news':
      score += 4 * authorityMultiplier * 0.8;
      break;
    default:
      break;
  }
  
  const recencyMultiplier = 1 + Math.max(0, Math.min(1, weights.recencyWeight));
  if (source.timestamp) {
    const ageMs = Date.now() - source.timestamp;
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    const recencyScore = Math.max(0, 1 - Math.min(ageDays, 90) / 90); // 0..1
    score += recencyScore * 10 * recencyMultiplier;
  }
  
  if (source.metadata && typeof source.metadata.score === 'number') {
    score += Number(source.metadata.score) * 10;
  }
  
  // Penalize very short content
  if (source.text.length < 100) score -= 5;
  
  return Math.max(0, score);
}

/**
 * Extract relevant snippets from text
 */
function extractSnippets(text: string, query: string, maxSnippets = 3): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
  
  const scored = sentences.map(s => ({
    sentence: s,
    score: terms.reduce((acc, term) => {
      const count = (s.toLowerCase().match(new RegExp(term, 'g')) || []).length;
      return acc + count;
    }, 0),
  })).filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSnippets)
    .map(x => x.sentence.trim());
  
  return scored;
}

function normaliseSnippet(snippet: string): string {
  if (!snippet) return '';
  const cleaned = snippet.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (/[.!?]$/.test(sentence)) {
    return sentence;
  }
  return `${sentence}.`;
}

/**
 * Generate summary with citations (heuristic extractive approach)
 */
function generateSummaryWithCitations(sources: ResearchSource[], query: string): {
  summary: string;
  citations: ResearchResult['citations'];
  confidence: number;
  inlineEvidence: ResearchInlineEvidence[];
} {
  if (sources.length === 0) {
    return {
      summary: `No sources found for query: ${query}`,
      citations: [],
      confidence: 0,
      inlineEvidence: [],
    };
  }

  const maxSegments = Math.min(6, Math.max(3, sources.length * 2));
  const segments: Array<{ text: string; sourceIndex: number; quote: string }> = [];
  const seen = new Set<string>();

  for (let i = 0; i < sources.length && segments.length < maxSegments; i++) {
    const source = sources[i];
    const snippets = extractSnippets(source.text, query, 3);

    if (snippets.length === 0 && source.snippet) {
      snippets.push(source.snippet);
    }

    for (const snippet of snippets) {
      if (segments.length >= maxSegments) break;
      const normalized = normaliseSnippet(snippet);
      if (!normalized) continue;
      const key = `${i}-${normalized.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      segments.push({ text: normalized, sourceIndex: i, quote: snippet.trim() });
    }
  }

  if (segments.length === 0) {
    const fallback = sources[0];
    const text = normaliseSnippet(fallback.snippet || fallback.text.slice(0, 280));
    segments.push({
      text: text || `No extractive summary available for ${fallback.title}.`,
      sourceIndex: 0,
      quote: fallback.snippet || fallback.text.slice(0, 140),
    });
  }

  let summaryBuilder = '';
  const inlineEvidence: ResearchInlineEvidence[] = [];
  const citations: ResearchResult['citations'] = [];
  let cursor = 0;

  segments.forEach((segment, idx) => {
    const isNewParagraph = idx > 0 && idx % 2 === 0;
    if (idx > 0) {
      const separator = isNewParagraph ? '\n\n' : ' ';
      summaryBuilder += separator;
      cursor += separator.length;
    }

    const from = cursor;
    summaryBuilder += segment.text;
    const to = cursor + segment.text.length;

    const citationIndex = idx + 1;
    inlineEvidence.push({
      from,
      to,
      citationIndex,
      sourceIndex: segment.sourceIndex,
      quote: segment.quote,
    });

    const source = sources[segment.sourceIndex];
    const confidence = source ? Math.min(1, Math.max(0.2, (source.relevanceScore || 40) / 80)) : 0.5;
    citations.push({
      index: citationIndex,
      sourceIndex: segment.sourceIndex,
      quote: segment.quote.slice(0, 160),
      confidence,
    });

    cursor = to;
  });

  const summary = summaryBuilder.trim();

  const uniqueSourceIndices = Array.from(new Set(segments.map((segment) => segment.sourceIndex)));
  const avgRelevance = uniqueSourceIndices.reduce((acc, idx) => acc + (sources[idx]?.relevanceScore ?? 40), 0) /
    Math.max(1, uniqueSourceIndices.length);
  const coverageFactor = Math.min(1, uniqueSourceIndices.length / 4);
  const confidence = Math.max(0.35, Math.min(1.0, (avgRelevance / 60) * coverageFactor));

  return {
    summary,
    citations,
    confidence,
    inlineEvidence,
  };
}

function createTextFragment(snippet: string): string {
  const sanitized = snippet.replace(/\s+/g, ' ').trim();
  if (!sanitized) return '';

  const start = sanitized.slice(0, 80);
  const end = sanitized.length > 120 ? sanitized.slice(-80) : '';
  const encode = (text: string) => encodeURIComponent(text.replace(/%/g, '').slice(0, 80));

  if (end) {
    return `#:~:text=${encode(start)},${encode(end)}`;
  }
  return `#:~:text=${encode(start)}`;
}

function buildEvidence(sources: ResearchSource[], query: string): ResearchEvidence[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const evidence: ResearchEvidence[] = [];

  sources.slice(0, 6).forEach((source, sourceIndex) => {
    const snippets = extractSnippets(source.text, query, 3);
    snippets.forEach((snippet) => {
      const score = terms.reduce((acc, term) => acc + (snippet.toLowerCase().includes(term) ? 1 : 0), 0);
      const importance = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';
      const fragment = createTextFragment(snippet);

      evidence.push({
        id: randomUUID(),
        sourceIndex,
        quote: snippet.trim(),
        context: `${source.title} • ${source.domain}`,
        importance,
        fragmentUrl: fragment ? `${source.url}${fragment}` : source.url,
      });
    });
  });

  return evidence.length > 0 ? evidence : undefined;
}

function buildBiasProfile(sources: ResearchSource[], weights: ScoreWeights): BiasProfile {
  if (sources.length === 0) return undefined;

  const counts: Record<ResearchSource['sourceType'], number> = {
    news: 0,
    academic: 0,
    documentation: 0,
    forum: 0,
    other: 0,
  };

  sources.forEach((source) => {
    counts[source.sourceType] += 1;
  });

  const total = sources.length || 1;
  const domainMix = (Object.keys(counts) as ResearchSource['sourceType'][]).map((type) => ({
    type,
    percentage: Math.round((counts[type] / total) * 100),
  }));

  return {
    authorityBias: Math.round(weights.authorityWeight * 100),
    recencyBias: Math.round(weights.recencyWeight * 100),
    domainMix,
  };
}

function buildTaskChains(result: ResearchResult): ResearchTaskChain[] {
  const chains: ResearchTaskChain[] = [];
  const primarySteps = [
    {
      id: randomUUID(),
      title: 'Review AI synthesis',
      description: 'Skim the generated answer and note the cited claims.',
      status: 'in_progress' as const,
    },
  ];

  if (result.evidence && result.evidence.length > 0) {
    const evidence = result.evidence[0];
    primarySteps.push({
      id: randomUUID(),
      title: 'Verify primary evidence',
      description: 'Open the highlighted passage on the original page to confirm context.',
      status: 'pending' as const,
      action: {
        type: 'openEvidence',
        sourceIndex: evidence.sourceIndex,
        evidenceId: evidence.id,
        fragmentUrl: evidence.fragmentUrl,
      },
    });
  }

  if (result.contradictions && result.contradictions.length > 0) {
    primarySteps.push({
      id: randomUUID(),
      title: 'Resolve conflicting sources',
      description: 'Compare sources with opposing conclusions and record takeaways.',
      status: 'pending' as const,
      action: {
        type: 'openSource',
        sourceIndex: result.contradictions[0].sources[0],
      },
    });
  }

  primarySteps.push({
    id: randomUUID(),
    title: 'Capture final summary',
    description: 'Document the reconciled answer with citations.',
    status: 'pending' as const,
  });

  chains.push({
    id: randomUUID(),
    label: 'Verify and Synthesize',
    steps: primarySteps,
  });

  if (result.sources.length > 4) {
    chains.push({
      id: randomUUID(),
      label: 'Source Deep Dive',
      steps: result.sources.slice(0, 4).map((source, idx) => ({
        id: randomUUID(),
        title: `Audit source #${idx + 1}`,
        description: `${source.title} (${source.domain})`,
        status: 'pending' as const,
        action: {
          type: 'openSource',
          sourceIndex: idx,
        },
      })),
    });
  }

  return chains;
}

/**
 * Main research query handler
 */
export async function researchQuery(
  query: string,
  options?: {
    maxSources?: number;
    includeCounterpoints?: boolean;
    region?: string;
    recencyWeight?: number;
    authorityWeight?: number;
  }
): Promise<ResearchResult> {
  const maxSources = options?.maxSources || 12;
  const weights: ScoreWeights = {
    recencyWeight: options?.recencyWeight !== undefined ? Math.max(0, Math.min(1, options.recencyWeight)) : 0.5,
    authorityWeight: options?.authorityWeight !== undefined ? Math.max(0, Math.min(1, options.authorityWeight)) : 0.5,
  };
  
  // Step 1: Search multiple engines in parallel
  const { urls, metadata } = await searchMultipleEngines(query, maxSources, options?.region);
  
  // Step 2: Fetch content in parallel
  const sources = await fetchMultipleParallel(urls, metadata, 5);
  
  if (sources.length === 0) {
    return {
      query,
      sources: [],
      summary: `No sources found for query: ${query}`,
      citations: [],
      confidence: 0,
    };
  }
  
  // Step 3: Vote on sources (rank and diversify)
  const rankedSources = voteOnSources(sources, query, weights);
  
  // Step 4: Generate summary with citations
  const { summary, citations, confidence, inlineEvidence } = generateSummaryWithCitations(rankedSources, query);
  
  // Step 5: Detect contradictions
  const contradictions = options?.includeCounterpoints
    ? detectContradictions(rankedSources, query)
    : undefined;
  
  // Step 6: Verify result (second pass)
  const result: ResearchResult = {
    query,
    sources: rankedSources,
    summary,
    citations,
    confidence,
    contradictions,
  };
  
  // Run verification
  const verification = verifyResearchResult(result);
  result.verification = verification;
  result.evidence = buildEvidence(rankedSources, query);
  result.biasProfile = buildBiasProfile(rankedSources, weights);
  result.taskChains = buildTaskChains(result);
  result.inlineEvidence = inlineEvidence;
  
  return result;
}

function attachInternalMetadata(target: any, sources: ResearchSource[], ids: string[]) {
  if (!target) return;
  Object.defineProperty(target, INTERNAL_SOURCES, {
    value: sources,
    enumerable: false,
    configurable: false,
  });
  Object.defineProperty(target, INTERNAL_SOURCE_IDS, {
    value: ids,
    enumerable: false,
    configurable: false,
  });
}

function getInternalSources(record: Record<string, CiteEntry[]>) {
  return (record && record[INTERNAL_SOURCES]) as ResearchSource[] | undefined;
}

function getInternalSourceIds(record: Record<string, CiteEntry[]>) {
  return (record && record[INTERNAL_SOURCE_IDS]) as string[] | undefined;
}

export async function fetchSources(
  query: string,
  options?: {
    mode?: 'default' | 'threat' | 'trade';
    maxSources?: number;
    region?: string;
    recencyWeight?: number;
    authorityWeight?: number;
  },
): Promise<Record<string, CiteEntry[]>> {
  const maxSources = options?.maxSources ?? 12;
  const { urls, metadata } = await searchMultipleEngines(query, maxSources, options?.region);
  const sources = await fetchMultipleParallel(urls, metadata, 5);
  if (!sources.length) {
    logger.warn('fetchSources: no sources found', { query });
    return {};
  }

  const weights: ScoreWeights = {
    recencyWeight:
      typeof options?.recencyWeight === 'number'
        ? Math.max(0, Math.min(1, options.recencyWeight))
        : options?.mode === 'trade'
        ? 0.8
        : 0.5,
    authorityWeight:
      typeof options?.authorityWeight === 'number'
        ? Math.max(0, Math.min(1, options.authorityWeight))
        : options?.mode === 'threat'
        ? 0.7
        : 0.5,
  };

  const rankedSources = voteOnSources(sources, query, weights);
  const citeMap: Record<string, CiteEntry[]> = {};
  const sourceIds: string[] = [];

  rankedSources.forEach((source, index) => {
    const citeId = `cite-${index + 1}`;
    sourceIds.push(citeId);
    const publishedAt =
      typeof source.timestamp === 'number' ? new Date(source.timestamp).toISOString() : undefined;

    citeMap[citeId] = [
      {
        id: citeId,
        title: source.title,
        url: source.url,
        snippet: source.snippet,
        publishedAt,
        text: source.text,
        domain: source.domain,
        relevanceScore: source.relevanceScore,
        sourceType: source.sourceType,
      },
    ];
  });

  attachInternalMetadata(citeMap, rankedSources, sourceIds);
  return citeMap;
}

export function summarizeWithCitations(
  query: string,
  sourceMap: Record<string, CiteEntry[]>,
): {
  chunks: Array<{ content: string; citations: string[] }>;
  confidence: number;
  citations: Array<{ citeId: string; quote: string; confidence: number }>;
} {
  const rankedSources = getInternalSources(sourceMap);
  const sourceIds = getInternalSourceIds(sourceMap) ?? Object.keys(sourceMap);

  const fallbackSources =
    rankedSources ??
    sourceIds
      .map((citeId) => {
        const entry = sourceMap[citeId]?.[0];
        if (!entry) return null;
        return {
          url: entry.url,
          title: entry.title,
          text: entry.text ?? entry.snippet ?? '',
          snippet: entry.snippet ?? '',
          timestamp: entry.publishedAt ? Date.parse(entry.publishedAt) : undefined,
          domain: entry.domain ?? '',
          relevanceScore: entry.relevanceScore ?? 40,
          sourceType: entry.sourceType ?? 'other',
          metadata: {},
        } as ResearchSource;
      })
      .filter(Boolean);

  const { summary, citations, confidence, inlineEvidence } = generateSummaryWithCitations(
    fallbackSources as ResearchSource[],
    query,
  );

  const paragraphs = summary.split(/\n{2,}/).filter((segment) => segment.trim().length > 0);
  let cursor = 0;

  const chunks = paragraphs.map((paragraph) => {
    const start = summary.indexOf(paragraph, cursor);
    const end = start + paragraph.length;
    cursor = end + 2;

    const citeIds = inlineEvidence
      .filter((evidence) => evidence.from >= start && evidence.to <= end + 1)
      .map((evidence) => sourceIds[evidence.sourceIndex])
      .filter(Boolean);

    return {
      content: paragraph.trim(),
      citations: Array.from(new Set(citeIds)),
    };
  });

  const detailedCitations = citations
    .map((cite) => {
      const citeId = sourceIds[cite.sourceIndex];
      if (!citeId) return null;
      return {
        citeId,
        quote: cite.quote,
        confidence: cite.confidence,
      };
    })
    .filter(Boolean) as Array<{ citeId: string; quote: string; confidence: number }>;

  const summaryResult = {
    chunks,
    confidence,
    citations: detailedCitations,
  };

  Object.defineProperty(summaryResult, INTERNAL_RESULT, {
    value: {
      query,
      sources: fallbackSources as ResearchSource[],
      summary,
      citations,
      confidence,
      inlineEvidence,
    } as ResearchResult,
    enumerable: false,
    configurable: false,
  });

  return summaryResult;
}

export function verifyAnswer(summaryResult: any, sourceMap: Record<string, CiteEntry[]>): ResearchIssue[] {
  const researchResult: ResearchResult | undefined = summaryResult?.[INTERNAL_RESULT];
  const sources = researchResult?.sources ?? getInternalSources(sourceMap);
  if (!researchResult || !sources) {
    logger.warn('verifyAnswer: no research result or sources', {
      hasResult: Boolean(researchResult),
      hasSources: Boolean(sources),
    });
    return [];
  }

  const verification = verifyResearchResult({
    ...researchResult,
    sources,
  });

  const issues: ResearchIssue[] = [];

  verification.ungroundedClaims.forEach((claim) => {
    issues.push({
      type: 'uncited',
      sentenceIdx: claim.position,
      detail: `${claim.severity.toUpperCase()} • ${claim.text}`,
    });
  });

  if (verification.hallucinationRisk > 0.6) {
    issues.push({
      type: 'contradiction',
      sentenceIdx: 0,
      detail: `Hallucination risk ${(verification.hallucinationRisk * 100).toFixed(1)}%`,
    });
  }

  return issues;
}

/**
 * Register IPC handlers
 */
export function registerResearchEnhancedIpc() {
  registerHandler('research:health', z.object({}), async () => {
    try {
      // Touch the cache to ensure the service is responsive
      const cacheSize = contentCache.size;
      return {
        ok: true,
        cacheSize,
        uptimeMs: process.uptime() * 1000,
      };
    } catch (error) {
      logger.error('health check failed', { error });
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'health probe failed',
      };
    }
  });

  registerHandler('research:queryEnhanced', z.object({
    query: z.string(),
    maxSources: z.number().optional(),
    includeCounterpoints: z.boolean().optional(),
    region: z.string().optional(),
    recencyWeight: z.number().optional(),
    authorityWeight: z.number().optional(),
  }), async (_event, request) => {
    const startedAt = Date.now();
    const result = await researchQuery(request.query, {
      maxSources: request.maxSources,
      includeCounterpoints: request.includeCounterpoints,
      region: request.region,
      recencyWeight: request.recencyWeight,
      authorityWeight: request.authorityWeight,
    });
    logger.info('research:queryEnhanced completed', {
      queryLength: request.query.length,
      maxSources: request.maxSources,
      durationMs: Date.now() - startedAt,
      sourceCount: result.sources.length,
    });
    return result;
  });
  
  // Clear cache
  registerHandler('research:clearCache', z.object({}), async () => {
    contentCache.clear();
    return { success: true };
  });
}

