/* eslint-env node */
/**
 * Multi-Source Search
 * Queries multiple search engines in parallel and returns ranked results
 */

import fetch from 'node-fetch';
import { researchSearch } from './search.js';
import { detectLanguage } from '../lang/detect.js';
import { braveSearch } from '../search/braveSearch.js';
import { rerankResults } from '../reranker/localReranker.js';

/**
 * Search result from a single source
 * @typedef {Object} SearchResult
 * @property {string} url
 * @property {string} title
 * @property {string} snippet
 * @property {string} source - 'google' | 'bing' | 'duckduckgo' | 'redix'
 * @property {number} score - Relevance score (0-1)
 * @property {string} lang - Detected language
 */

/**
 * Search using Brave Search (FREE - 2k queries/day)
 */
async function searchBrave(query, options = {}) {
  try {
    const results = await braveSearch(query, {
      count: 20,
      searchLang: options.lang || 'en',
    });

    return results.map((result, idx) => ({
      url: result.url,
      title: result.title,
      snippet: result.snippet,
      source: 'brave',
      score: 1 - idx * 0.05, // Higher score for top results
      lang: options.lang || 'en',
    }));
  } catch (error) {
    console.warn('[MultiSourceSearch] Brave search failed:', error.message);
    return [];
  }
}

/**
 * Search Google (via API or scraping fallback) - DEPRECATED, use Brave
 */
async function googleSearch(query, options = {}) {
  try {
    // If you have Google Custom Search API key, use it
    if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
      const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=5`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return (data.items || []).map((item, idx) => ({
          url: item.link,
          title: item.title,
          snippet: item.snippet || '',
          source: 'google',
          score: 1 - idx * 0.1,
          lang: options.lang || 'en',
        }));
      }
    }
    // Fallback: return empty (could add scraping here)
    return [];
  } catch (error) {
    console.warn('[MultiSourceSearch] Google search failed:', error.message);
    return [];
  }
}

/**
 * Search Bing (via API or scraping fallback)
 */
async function bingSearch(query, options = {}) {
  try {
    // If you have Bing Search API key, use it
    if (process.env.BING_SEARCH_API_KEY) {
      const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=5`;
      const response = await fetch(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.BING_SEARCH_API_KEY,
        },
      });
      if (response.ok) {
        const data = await response.json();
        return (data.webPages?.value || []).map((item, idx) => ({
          url: item.url,
          title: item.name,
          snippet: item.snippet || '',
          source: 'bing',
          score: 1 - idx * 0.1,
          lang: options.lang || 'en',
        }));
      }
    }
    // Fallback: return empty (could add scraping here)
    return [];
  } catch (error) {
    console.warn('[MultiSourceSearch] Bing search failed:', error.message);
    return [];
  }
}

/**
 * Search DuckDuckGo (via existing researchSearch)
 */
async function duckDuckGoSearch(query, options = {}) {
  try {
    const result = await researchSearch({
      query,
      size: 5,
      language: options.lang,
    });
    return (result.results || []).map((item, idx) => ({
      url: item.url,
      title: item.title,
      snippet: item.snippet || '',
      source: 'duckduckgo',
      score: item.score || 1 - idx * 0.1,
      lang: result.detected_language?.language || 'en',
    }));
  } catch (error) {
    console.warn('[MultiSourceSearch] DuckDuckGo search failed:', error.message);
    return [];
  }
}

/**
 * Search Reddit (via Reddit API or scraping)
 */
async function redditSearch(query, options = {}) {
  try {
    // Use Reddit search API
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=5&sort=relevance`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RegenBot/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return (data.data?.children || []).map((item, idx) => {
        const post = item.data;
        return {
          url: `https://reddit.com${post.permalink}`,
          title: post.title,
          snippet: post.selftext?.slice(0, 200) || post.title,
          source: 'reddit',
          score: 0.8 - idx * 0.1,
          lang: options.lang || 'en',
        };
      });
    }
    return [];
  } catch (error) {
    console.warn('[MultiSourceSearch] Reddit search failed:', error.message);
    return [];
  }
}

/**
 * Search Wikipedia (via Wikipedia API)
 */
async function wikipediaSearch(query, options = {}) {
  try {
    const lang = options.lang === 'hi' ? 'hi' : options.lang === 'ta' ? 'ta' : 'en';
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.extract) {
        return [
          {
            url: data.content_urls?.desktop?.page || data.content_urls?.mobile?.page,
            title: data.title,
            snippet: data.extract.slice(0, 300),
            source: 'wikipedia',
            score: 0.95, // High trust score for Wikipedia
            lang: lang,
          },
        ];
      }
    }
    return [];
  } catch (error) {
    console.warn('[MultiSourceSearch] Wikipedia search failed:', error.message);
    return [];
  }
}

/**
 * Search arXiv (for academic papers)
 */
async function arxivSearch(query, _options = {}) {
  try {
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=3`;
    const response = await fetch(url);

    if (response.ok) {
      const xml = await response.text();
      // Simple XML parsing (could use proper XML parser)
      const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
      return entries.map((entry, idx) => {
        const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
        const summaryMatch = entry.match(/<summary>([^<]+)<\/summary>/);
        const idMatch = entry.match(/<id>([^<]+)<\/id>/);

        return {
          url: idMatch ? idMatch[1] : '',
          title: titleMatch ? titleMatch[1].trim() : 'arXiv Paper',
          snippet: summaryMatch ? summaryMatch[1].slice(0, 300).trim() : '',
          source: 'arxiv',
          score: 0.9 - idx * 0.1,
          lang: 'en',
        };
      });
    }
    return [];
  } catch (error) {
    console.warn('[MultiSourceSearch] arXiv search failed:', error.message);
    return [];
  }
}

/**
 * Deduplicate results by URL
 */
function dedupeByUrl(results) {
  const seen = new Set();
  const deduped = [];

  for (const result of results) {
    if (!result.url) continue;

    // Normalize URL (remove trailing slash, fragment, etc.)
    const normalized = new URL(result.url).href.replace(/\/$/, '').split('#')[0];

    if (!seen.has(normalized)) {
      seen.add(normalized);
      deduped.push(result);
    }
  }

  return deduped;
}

/**
 * Score and rank results
 */
function scoreAndRank(results, query, queryLang) {
  return results
    .map(result => {
      let score = result.score || 0.5;

      // Boost score for language match
      if (result.lang === queryLang) {
        score += 0.2;
      }

      // Boost score for domain trust (simple heuristic)
      const domain = new URL(result.url).hostname;
      const trustedDomains = ['wikipedia.org', 'github.com', 'stackoverflow.com', 'reddit.com'];
      if (trustedDomains.some(td => domain.includes(td))) {
        score += 0.1;
      }

      // Boost score for longer snippets (more content)
      if (result.snippet && result.snippet.length > 100) {
        score += 0.05;
      }

      // Cap score at 1.0
      score = Math.min(1.0, score);

      return { ...result, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Multi-source search
 * Queries multiple engines in parallel and returns ranked, deduplicated results
 *
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {string} options.lang - Language code (e.g., 'en', 'hi', 'ta')
 * @param {number} options.maxResults - Maximum number of results to return
 * @returns {Promise<SearchResult[]>}
 */
export async function multiSourceSearch(query, options = {}) {
  const { lang = 'auto', maxResults = 8 } = options;

  // Detect query language
  const detection = detectLanguage(query, lang);
  const queryLang = detection.language || 'en';

  // Run searches in parallel - PRIORITIZE FREE SOURCES
  // Brave Search (FREE - primary source)
  // DuckDuckGo (FREE - fallback)
  // Reddit, Wikipedia, arXiv (FREE - supplementary)
  const [
    braveResults,
    ddgResults,
    redditResults,
    wikiResults,
    arxivResults,
    googleResults,
    bingResults,
  ] = await Promise.allSettled([
    searchBrave(query, { lang: queryLang }), // PRIMARY: Free Brave Search
    duckDuckGoSearch(query, { lang: queryLang }), // FREE fallback
    redditSearch(query, { lang: queryLang }), // FREE
    wikipediaSearch(query, { lang: queryLang }), // FREE
    arxivSearch(query, { lang: queryLang }), // FREE
    googleSearch(query, { lang: queryLang }), // Optional (requires API key)
    bingSearch(query, { lang: queryLang }), // Optional (requires API key)
  ]);

  // Combine results - prioritize free sources
  const allResults = [
    ...(braveResults.status === 'fulfilled' ? braveResults.value : []), // Primary
    ...(ddgResults.status === 'fulfilled' ? ddgResults.value : []), // Fallback
    ...(redditResults.status === 'fulfilled' ? redditResults.value : []), // Supplementary
    ...(wikiResults.status === 'fulfilled' ? wikiResults.value : []), // Supplementary
    ...(arxivResults.status === 'fulfilled' ? arxivResults.value : []), // Supplementary
    ...(googleResults.status === 'fulfilled' ? googleResults.value : []), // Optional
    ...(bingResults.status === 'fulfilled' ? bingResults.value : []), // Optional
  ];

  // Deduplicate by URL
  const deduped = dedupeByUrl(allResults);

  // Score and rank (basic scoring)
  const ranked = scoreAndRank(deduped, query, queryLang);

  // Rerank using local reranker (improves quality)
  const reranked = await rerankResults(query, ranked, maxResults * 2); // Get more for reranking

  // Return top N results
  return reranked.slice(0, maxResults);
}
