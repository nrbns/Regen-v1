/* eslint-env node */

import { researchSearch } from './search.js';
import { analyzeWithLLM, streamLLMAnswer } from '../agent/llm.js';
import { detectLanguage } from '../lang/detect.js';
import { executeParallelAgents, synthesizeAgentResults } from './parallel-agents.js';
import { searchViralDevTweets } from './twitter-search.js';

function buildContext(results, maxCharacters = 8000) {
  if (!results?.length) return '';
  const joined = results
    .map(
      (item, idx) => `[${idx + 1}] ${item.title}\n${item.snippet}\nSource: ${item.url ?? 'unknown'}`
    )
    .join('\n\n');
  return joined.slice(0, maxCharacters);
}

/**
 * Generate research answer from query
 * @param {Object} options - Research options
 * @param {string} options.query - Research query
 * @param {number} [options.max_context_tokens=1500] - Max context tokens
 * @param {Array} [options.source_filters] - Source filters
 * @param {string} [options.freshness='auto'] - Freshness filter
 * @param {boolean} [options.return_documents=true] - Return documents
 * @param {string} [options.language] - Language code
 * @returns {Promise<Object>} Research answer with citations
 */
export async function generateResearchAnswer({
  query,
  max_context_tokens = 1500,
  source_filters,
  freshness = 'auto',
  return_documents = true,
  language,
}) {
  if (!query || !query.trim()) {
    throw new Error('Query is required');
  }

  const detection = detectLanguage(query, language);
  const searchResponse = await researchSearch({
    query,
    size: 10,
    sourceFilters: source_filters,
    sort: freshness === 'latest' ? 'freshness' : 'relevance',
    language: detection.language,
  });

  if (!searchResponse.results.length) {
    return {
      answer: 'No relevant documents were found for this query.',
      query_id: searchResponse.query_id,
      citations: [],
      model: {
        name: 'unavailable',
        provider: 'none',
        latency_ms: searchResponse.latency_ms,
      },
      provenance: [],
      language: searchResponse.detected_language?.language ?? detection.language,
      language_confidence: searchResponse.detected_language?.confidence ?? detection.confidence,
    };
  }

  const contextText = buildContext(searchResponse.results, max_context_tokens * 4);
  const llmResult = await analyzeWithLLM({
    task: 'qa',
    inputText: contextText,
    question: query,
    url: searchResponse.results[0]?.url,
    language: searchResponse.detected_language?.language ?? detection.language,
  }).catch(error => {
    return {
      answer: `Unable to generate answer at this time. Reason: ${error.message}`,
      summary: '',
      highlights: [],
      model: {
        name: 'error',
        provider: 'none',
        tokensUsed: 0,
      },
      latencyMs: 0,
    };
  });

  const citations = searchResponse.results.slice(0, 8).map((item, idx) => ({
    id: item.id,
    url: item.url,
    title: item.title,
    snippet: item.snippet,
    source_type: item.source_type,
    fetched_at: item.fetched_at,
    score: item.score,
    license: item.license || null,
    index: idx + 1,
  }));

  const response = {
    answer: llmResult.answer?.trim() || llmResult.summary || '',
    query_id: searchResponse.query_id,
    citations,
    model: {
      name: llmResult.model?.name || llmResult.model || 'unknown',
      provider: llmResult.model?.provider || 'unknown',
      latency_ms: llmResult.latencyMs ?? 0,
    },
    language: searchResponse.detected_language?.language ?? detection.language,
    language_confidence: searchResponse.detected_language?.confidence ?? detection.confidence,
  };

  if (return_documents) {
    response.provenance = searchResponse.results.map(item => ({
      id: item.id,
      content: item.snippet,
      metadata: {
        url: item.url,
        title: item.title,
        source_type: item.source_type,
        fetched_at: item.fetched_at,
      },
    }));
  }

  return response;
}

export async function streamResearchAnswer({
  query,
  max_context_tokens = 1500,
  source_filters,
  freshness = 'auto',
  onToken,
  onSources,
  language,
}) {
  if (!query || !query.trim()) {
    throw new Error('Query is required');
  }

  const detection = detectLanguage(query, language);
  const searchResponse = await researchSearch({
    query,
    size: 10,
    sourceFilters: source_filters,
    sort: freshness === 'latest' ? 'freshness' : 'relevance',
    language: detection.language,
  });

  const citations = searchResponse.results.slice(0, 8).map((item, idx) => ({
    id: item.id,
    url: item.url,
    title: item.title,
    snippet: item.snippet,
    source_type: item.source_type,
    fetched_at: item.fetched_at,
    score: item.score,
    license: item.license || null,
    index: idx + 1,
  }));

  onSources?.(citations);

  if (!searchResponse.results.length) {
    return {
      query_id: searchResponse.query_id,
      citations: [],
      model: {
        name: 'unavailable',
        provider: 'none',
        latency_ms: 0,
      },
      language: searchResponse.detected_language?.language ?? detection.language,
      language_confidence: searchResponse.detected_language?.confidence ?? detection.confidence,
    };
  }

  const contextText = buildContext(searchResponse.results, max_context_tokens * 4);
  const streamMeta = await streamLLMAnswer({
    task: 'qa',
    inputText: contextText,
    question: query,
    url: searchResponse.results[0]?.url,
    onToken,
    language: searchResponse.detected_language?.language ?? detection.language,
  });

  return {
    query_id: searchResponse.query_id,
    citations,
    model: {
      name: streamMeta.model,
      provider: streamMeta.provider,
      latency_ms: streamMeta.latencyMs,
    },
    language: searchResponse.detected_language?.language ?? detection.language,
    language_confidence: searchResponse.detected_language?.confidence ?? detection.confidence,
  };
}
