/* eslint-env node */
/**
 * Enhanced Answer Generation
 * Uses parallel agents + golden prompts to beat Perplexity
 */

import { executeParallelAgents, synthesizeAgentResults } from './parallel-agents.js';
import { searchViralDevTweets } from './twitter-search.js';
// import { diverseSearch } from './multi-source-search.js'; // Unused
// import { analyzeWithLLM } from '../agent/llm.js'; // Unused
import { detectLanguage } from '../lang/detect.js';
import { getCachedResult, setCachedResult } from './cache-layer.js';
// import { getCachedOrCompute } from './cache-layer.js'; // Unused
import { generateSourcePreviews } from './source-preview.js';
// import { generatePreviews as generatePreviewsProduction } from './preview-production.js'; // Unused
import { pickBestAnswer } from './insight-scorer.js';
// import { bestOfThree } from './insight-scorer.js'; // Unused
// import { parallelSearch } from './scraper-parallel-production.js'; // Unused
// import { executeLangGraphWorkflow } from './langgraph-workflow.js'; // Unused

/**
 * Generate enhanced answer using all golden prompts
 * @param {Object} options - Research options
 * @param {string} options.query - Research query
 * @param {number} [options.max_context_tokens=2000] - Max context tokens
 * @param {boolean} [options.includeTwitter=true] - Include Twitter search
 * @param {boolean} [options.includePDF=true] - Include PDF sources
 * @param {boolean} [options.includeGitHub=true] - Include GitHub sources
 * @param {boolean} [options.includeArxiv=true] - Include arXiv sources
 * @param {string} [options.language] - Language code
 * @returns {Promise<Object>} Enhanced answer with citations
 */
export async function generateEnhancedAnswer({
  query,
  max_context_tokens: _max_context_tokens = 2000,
  includeTwitter = true,
  includePDF = true,
  includeGitHub = true,
  includeArxiv = true,
  language,
}) {
  if (!query || !query.trim()) {
    throw new Error('Query is required');
  }

  const detection = detectLanguage(query, language);
  const startTime = Date.now();

  // Step 0: Check cache (with auto-invalidation for buzzing topics)
  const cached = await getCachedResult(query, {
    includeTwitter,
    includePDF,
    includeGitHub,
    includeArxiv,
  });
  if (cached) {
    console.log('[EnhancedAnswer] Using cached result');
    return { ...cached, cached: true };
  }

  // Step 1: Execute parallel agents (5 golden prompts)
  console.log('[EnhancedAnswer] Executing parallel agents...');
  const agentResults = await executeParallelAgents(query, {
    maxResultsPerAgent: 10,
    includeTwitter,
    includePDF,
    includeGitHub,
    includeArxiv,
  });

  // Step 2: Get Twitter/X insights (if enabled)
  let twitterInsights = [];
  if (includeTwitter) {
    try {
      console.log('[EnhancedAnswer] Searching Twitter/X...');
      twitterInsights = await searchViralDevTweets(query, {
        maxResults: 4,
        minRetweets: 50,
        minFollowers: 10000,
        verifiedOnly: false,
      });
    } catch (error) {
      console.warn('[EnhancedAnswer] Twitter search failed:', error.message);
    }
  }

  // Step 3: Synthesize all results
  console.log('[EnhancedAnswer] Synthesizing results...');
  const synthesis = await synthesizeAgentResults(agentResults, query);

  // Step 4: Generate multiple answer versions
  const answerVersions = [
    formatAnswer(synthesis, twitterInsights).text,
    // Could generate alternative versions here
  ];

  // Step 5: Pick best answer using insight scorer
  const bestAnswerResult = await pickBestAnswer(answerVersions, query);
  const finalAnswer = bestAnswerResult.bestAnswer;

  // Step 6: Generate source previews
  const allUrls = [
    ...agentResults.agents.flatMap(a => a.results.map(r => r.url)),
    ...twitterInsights.map(t => t.url),
  ].filter(Boolean).slice(0, 15);

  const sourcePreviews = await generateSourcePreviews(allUrls);

  // Step 7: Build citations with previews
  const citations = buildCitations(agentResults, twitterInsights, sourcePreviews);

  const result = {
    answer: finalAnswer,
    query_id: `enhanced_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    citations,
    model: {
      name: 'enhanced-parallel-agents',
      provider: 'regen-research',
      latency_ms: Date.now() - startTime,
    },
    insights: synthesis.insights,
    hiddenGem: synthesis.hiddenGem,
    contraView: synthesis.contraView,
    twitterInsights: twitterInsights.slice(0, 4),
    strategies: agentResults.strategies,
    totalSources: agentResults.totalResults,
    language: detection.language,
    language_confidence: detection.confidence,
    insightScore: bestAnswerResult.score,
    sourcePreviews,
  };

  // Cache the result
  setCachedResult(query, result, {
    includeTwitter,
    includePDF,
    includeGitHub,
    includeArxiv,
  });

  return result;
}

/**
 * Format answer with Perplexity-killer template
 */
function formatAnswer(synthesis, twitterInsights) {
  let text = '';

  // One-sentence punchline
  if (synthesis.answer) {
    const lines = synthesis.answer.split('\n');
    const punchline = lines.find(l => l.trim() && !l.startsWith('•') && !l.startsWith('-'));
    if (punchline) {
      text += `${punchline.trim()}\n\n`;
    }
  }

  // Key Insights
  if (synthesis.insights && synthesis.insights.length > 0) {
    text += '**Key Insights:**\n';
    synthesis.insights.forEach(insight => {
      text += `• ${insight}\n`;
    });
    text += '\n';
  }

  // Hidden Gem
  if (synthesis.hiddenGem) {
    text += `**Hidden Gem:** ${synthesis.hiddenGem}\n\n`;
  }

  // Contra View
  if (synthesis.contraView) {
    text += `**Contra View:** ${synthesis.contraView}\n\n`;
  }

  // Twitter Insights
  if (twitterInsights && twitterInsights.length > 0) {
    text += '**Real-Time X/Twitter Insights:**\n';
    twitterInsights.slice(0, 3).forEach(tweet => {
      text += `• ${tweet.text.substring(0, 200)}${tweet.text.length > 200 ? '...' : ''} — [@${tweet.author}](${tweet.url})\n`;
    });
    text += '\n';
  }

  // Rest of answer
  if (synthesis.answer) {
    const rest = synthesis.answer
      .split('\n')
      .filter(l => !l.includes('KEY INSIGHTS') && !l.includes('HIDDEN GEM') && !l.includes('CONTRA VIEW'))
      .join('\n');
    if (rest.trim()) {
      text += rest.trim();
    }
  }

  return { text: text.trim() };
}

/**
 * Build citations from all sources with previews
 */
function buildCitations(agentResults, twitterInsights, sourcePreviews = []) {
  const citations = [];

  // Create preview map
  const previewMap = new Map();
  for (const preview of sourcePreviews) {
    previewMap.set(preview.url, preview);
  }

  // Add agent results with previews
  for (const agent of agentResults.agents) {
    for (const result of agent.results.slice(0, 3)) {
      const preview = previewMap.get(result.url);
      citations.push({
        id: result.url || `cite-${citations.length}`,
        url: result.url,
        title: preview?.title || result.title || 'Untitled',
        snippet: result.snippet || preview?.description || '',
        source_type: result.source || preview?.type || 'web',
        score: 0.9 - citations.length * 0.05,
        index: citations.length + 1,
        preview: preview || null,
      });
    }
  }

  // Add Twitter insights with previews
  for (const tweet of twitterInsights) {
    const preview = previewMap.get(tweet.url);
    citations.push({
      id: tweet.id,
      url: tweet.url,
      title: preview?.title || `Tweet by @${tweet.author}`,
      snippet: tweet.text.substring(0, 200) || preview?.description || '',
      source_type: 'twitter',
      score: 0.8,
      index: citations.length + 1,
      preview: preview || null,
    });
  }

  return citations.slice(0, 15); // Limit to top 15
}

