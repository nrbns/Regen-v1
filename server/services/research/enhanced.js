/* eslint-env node */
/**
 * PERFORMANCE FIX: Enhanced research with async pipeline
 */

import { researchSearch } from './search.js';
import { analyzeWithLLM } from '../agent/llm.js';
import { detectLanguage, getLanguageLabel } from '../lang/detect.js';
import { executePipeline } from '../../utils/async-pipeline.cjs';

function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function classifySourceType(domain = '') {
  if (!domain || domain === 'unknown') return 'other';
  if (domain.endsWith('.edu') || domain.includes('.ac.')) return 'academic';
  if (domain.includes('wikipedia') || domain.includes('docs.')) return 'documentation';
  if (domain.includes('stack') || domain.includes('reddit') || domain.includes('forum'))
    return 'forum';
  if (
    domain.includes('news') ||
    domain.includes('times') ||
    domain.includes('thehindu') ||
    domain.includes('ndtv')
  ) {
    return 'news';
  }
  return 'other';
}

function buildContextForLLM(sources) {
  if (!sources?.length) return '';
  return sources
    .map(
      (source, idx) =>
        `[${idx + 1}] ${source.title}\n${source.snippet}\nURL: ${source.url ?? 'unknown'}`
    )
    .join('\n\n');
}

function buildContradictions(sources) {
  if (!sources || sources.length < 2) return [];
  const disagreements = [];
  const negatives = sources.filter(source =>
    /risk|concern|drawback|contra|problem|challenge/i.test(source.snippet || '')
  );
  const positives = sources.filter(source =>
    /advantage|benefit|opportunity|growth|positive/i.test(source.snippet || '')
  );
  if (negatives.length && positives.length) {
    disagreements.push({
      claim: 'Mixed viewpoints detected between positive outlooks and risk-focused articles.',
      sources: [sources.indexOf(positives[0]) + 1, sources.indexOf(negatives[0]) + 1].filter(
        idx => idx > 0
      ),
      disagreement: 'minor',
    });
  }
  return disagreements;
}

function extractProsAndCons(sources) {
  if (!sources || sources.length === 0) return { pros: [], cons: [] };

  const pros = [];
  const cons = [];

  // Keywords that indicate pros
  const proKeywords = [
    'advantage',
    'benefit',
    'pros',
    'strength',
    'positive',
    'good',
    'excellent',
    'effective',
    'efficient',
    'improved',
    'better',
    'superior',
    'outstanding',
    'success',
    'achievement',
    'growth',
    'opportunity',
    'value',
    'quality',
  ];

  // Keywords that indicate cons
  const conKeywords = [
    'disadvantage',
    'drawback',
    'cons',
    'weakness',
    'negative',
    'bad',
    'poor',
    'ineffective',
    'inefficient',
    'problem',
    'issue',
    'concern',
    'risk',
    'limitation',
    'challenge',
    'difficulty',
    'failure',
    'cost',
    'expensive',
  ];

  sources.forEach((source, idx) => {
    const text = (source.snippet || source.title || '').toLowerCase();
    const proScore = proKeywords.reduce((score, keyword) => {
      return score + (text.includes(keyword) ? 1 : 0);
    }, 0);
    const conScore = conKeywords.reduce((score, keyword) => {
      return score + (text.includes(keyword) ? 1 : 0);
    }, 0);

    if (proScore > conScore && proScore > 0) {
      pros.push({
        text: source.snippet || source.title,
        source: source.title,
        sourceUrl: source.url,
        sourceIndex: idx,
        confidence: Math.min(0.9, 0.5 + proScore * 0.1),
      });
    } else if (conScore > proScore && conScore > 0) {
      cons.push({
        text: source.snippet || source.title,
        source: source.title,
        sourceUrl: source.url,
        sourceIndex: idx,
        confidence: Math.min(0.9, 0.5 + conScore * 0.1),
      });
    }
  });

  // Sort by confidence and limit to top 5 each
  return {
    pros: pros.sort((a, b) => b.confidence - a.confidence).slice(0, 5),
    cons: cons.sort((a, b) => b.confidence - a.confidence).slice(0, 5),
  };
}

export async function queryEnhancedResearch({
  query,
  maxSources = 12,
  includeCounterpoints = false,
  recencyWeight = 0.5,
  authorityWeight = 0.5,
  language: languageHint,
} = {}) {
  if (!query || !query.trim()) {
    throw new Error('Query is required');
  }

  const detection = detectLanguage(query, languageHint);
  const searchResponse = await researchSearch({
    query,
    size: Math.min(maxSources * 2, 20),
    sort: recencyWeight > authorityWeight ? 'freshness' : 'relevance',
    language: detection.language,
  });

  const sources = searchResponse.results.slice(0, maxSources).map((item, idx) => {
    const domain = extractDomain(item.url);
    const score = Number((item.score ?? Math.max(0.15, 1 - idx * 0.05)).toFixed(2));
    return {
      url: item.url,
      title: item.title,
      snippet: item.snippet,
      timestamp: new Date(item.fetched_at || Date.now()).getTime(),
      domain,
      relevanceScore: score,
      sourceType: classifySourceType(domain),
    };
  });

  const context = buildContextForLLM(sources);
  let summaryResult;
  if (!context) {
    summaryResult = {
      answer: 'No relevant sources were found to generate a summary.',
      model: { name: 'unavailable', provider: 'none' },
    };
  } else {
    // PERFORMANCE FIX #5: Run LLM analysis directly (pipeline overhead not needed for single task)
    // Pipeline is used when multiple tasks run in parallel
    try {
      const pipelineStart = Date.now();
      
      summaryResult = await analyzeWithLLM({
        task: 'qa',
        inputText: context,
        question: `${query} — answer in ${getLanguageLabel(detection.language)}.`,
        language: detection.language,
      });
      
      const pipelineLatency = Date.now() - pipelineStart;
      if (process.env.LOG_PERFORMANCE !== '0') {
        console.log(`[enhanced-research] LLM analysis latency: ${pipelineLatency}ms`);
      }
    } catch (error) {
      console.error('[enhanced-research] LLM analysis failed:', error);
      // Provide a better fallback that uses the sources
      const sourceSummaries = sources
        .slice(0, 3)
        .map((s, idx) => `${idx + 1}. ${s.title}: ${s.snippet?.slice(0, 200)}...`)
        .join('\n\n');
      summaryResult = {
        answer: `Based on ${sources.length} sources:\n\n${sourceSummaries}`,
        model: { name: 'fallback', provider: 'extraction' },
        latencyMs: 0,
      };
    }
  }

  const citations = sources.slice(0, Math.min(6, sources.length)).map((source, idx) => ({
    index: idx + 1,
    sourceIndex: idx,
    quote: source.snippet?.slice(0, 240) ?? '',
    confidence: Number((source.relevanceScore ?? 0.5).toFixed(2)),
  }));

  const confidence =
    sources.length > 0
      ? Number(
          (
            sources.reduce((sum, source) => sum + (source.relevanceScore ?? 0.5), 0) /
            sources.length
          ).toFixed(2)
        )
      : 0;

  const verification = {
    verified: confidence >= 0.5 && citations.length >= 2,
    claimDensity: sources.length,
    citationCoverage: Number(((citations.length / Math.max(1, sources.length)) * 100).toFixed(1)),
    ungroundedClaims: [],
    hallucinationRisk: Number((1 - confidence).toFixed(2)),
    suggestions:
      confidence >= 0.65 ? [] : ['Add more authoritative sources', 'Cross-check regional outlets'],
  };

  const prosCons = extractProsAndCons(sources);

  return {
    query: query.trim(),
    summary: summaryResult.answer?.trim() || '',
    confidence,
    sources,
    citations,
    verification,
    contradictions: includeCounterpoints ? buildContradictions(sources) : [],
    prosCons: prosCons.pros.length > 0 || prosCons.cons.length > 0 ? prosCons : undefined,
    language: detection.language,
    languageLabel: getLanguageLabel(detection.language),
    languageConfidence: detection.confidence,
  };
}
