/* eslint-env node */
/**
 * Local Reranker for Search Results
 * Uses free models from HuggingFace
 * Options: BGE-Reranker, ColBERT, Qwen2.5 Reranker
 */

import fetch from 'node-fetch';

/**
 * Simple TF-IDF based reranker (no external dependencies)
 * Fallback when ML models aren't available
 */
export function simpleReranker(query, results) {
  if (!results || results.length === 0) return results;

  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 2);

  const scored = results.map(result => {
    const text = `${result.title} ${result.snippet}`.toLowerCase();
    let score = 0;

    // Count query term matches
    for (const term of queryTerms) {
      const matches = (text.match(new RegExp(term, 'g')) || []).length;
      score += matches;
    }

    // Boost for title matches
    const titleMatches = queryTerms.filter(term =>
      result.title?.toLowerCase().includes(term)
    ).length;
    score += titleMatches * 2;

    // Boost for exact phrase match
    if (text.includes(query.toLowerCase())) {
      score += 5;
    }

    // Penalize low-quality domains
    const lowQualityDomains = ['pinterest.com', 'quora.com'];
    const domain = new URL(result.url).hostname;
    if (lowQualityDomains.some(d => domain.includes(d))) {
      score -= 2;
    }

    return { ...result, relevanceScore: score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return scored;
}

/**
 * Rerank using HuggingFace Inference API (free tier)
 * Model: BGE-Reranker-Large or similar
 */
export async function hfReranker(query, results, model = 'BAAI/bge-reranker-large') {
  if (!results || results.length === 0) return results;

  // HuggingFace free tier has rate limits, so use simple reranker for large sets
  if (results.length > 10) {
    return simpleReranker(query, results);
  }

  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    const useHF = apiKey && process.env.USE_HF_RERANKER === 'true';

    if (!useHF) {
      return simpleReranker(query, results);
    }

    // Prepare pairs for reranking
    const pairs = results.map(result => [query, `${result.title} ${result.snippet}`]);

    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: pairs }),
      timeout: 10000,
    });

    if (!response.ok) {
      console.warn('[Reranker] HF API failed, using simple reranker');
      return simpleReranker(query, results);
    }

    const scores = await response.json();

    // Combine scores with results
    const scored = results.map((result, index) => ({
      ...result,
      relevanceScore: scores[index] || 0,
    }));

    // Sort by score descending
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scored;
  } catch (error) {
    console.warn('[Reranker] Error, using simple reranker:', error.message);
    return simpleReranker(query, results);
  }
}

/**
 * Main rerank function - tries HF first, falls back to simple
 */
export async function rerankResults(query, results, topK = 5) {
  if (!results || results.length === 0) return [];

  // Use HF reranker if available, otherwise simple
  const reranked = await hfReranker(query, results);

  // Return top K results
  return reranked.slice(0, topK);
}



