/* eslint-env node */
/**
 * Brave Search API Integration
 * Free tier: 2,000 queries/day
 * https://api.search.brave.com/app/documentation/web-search/free-api
 */

import fetch from 'node-fetch';

const BRAVE_API_BASE = 'https://api.search.brave.com/res/v1/web/search';

/**
 * Search using Brave Search API
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<Array>} Array of search results
 */
export async function braveSearch(query, options = {}) {
  const {
    count = 20,
    country = 'US',
    searchLang = 'en',
    safesearch = 'moderate',
    freshness = null, // 'pd' (past day), 'pw' (past week), 'pm' (past month), 'py' (past year)
  } = options;

  const apiKey = process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    console.warn('[BraveSearch] API key not configured');
    return [];
  }

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query.trim(),
      count: Math.min(count, 20).toString(), // Max 20 per request
      country,
      search_lang: searchLang,
      safesearch,
    });

    if (freshness) {
      params.append('freshness', freshness);
    }

    const url = `${BRAVE_API_BASE}?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Subscription-Token': apiKey,
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.warn('[BraveSearch] API request failed:', response.status, errorText);

      if (response.status === 401) {
        console.warn('[BraveSearch] Invalid API key');
      } else if (response.status === 429) {
        console.warn('[BraveSearch] Rate limit exceeded (2k queries/day free tier)');
      }

      return [];
    }

    const data = await response.json();

    // Transform Brave results to standard format
    const results = (data.web?.results || []).map((result, index) => ({
      id: `brave-${index}`,
      title: result.title || '',
      url: result.url || '',
      snippet: result.description || '',
      displayUrl: result.url || '',
      datePublished: result.age || null,
      source: 'brave',
      rank: index + 1,
    }));

    return results;
  } catch (error) {
    console.warn('[BraveSearch] Search failed:', error.message);
    return [];
  }
}

/**
 * Get multiple pages of results (pagination)
 */
export async function braveSearchPaginated(query, totalCount = 20, options = {}) {
  const results = [];
  const perPage = 20;
  const pages = Math.ceil(totalCount / perPage);

  for (let page = 0; page < pages; page++) {
    const pageResults = await braveSearch(query, {
      ...options,
      count: perPage,
      offset: page * perPage,
    });

    if (pageResults.length === 0) {
      break; // No more results
    }

    results.push(...pageResults);

    if (results.length >= totalCount) {
      break;
    }

    // Small delay to avoid rate limiting
    if (page < pages - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results.slice(0, totalCount);
}
