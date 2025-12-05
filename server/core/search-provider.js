/* eslint-env node */
/**
 * Search Provider Abstraction
 * Switches between free cloud search APIs and local search
 */

import axios from 'axios';
import { isOffline } from './mode-manager.js';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const SEARXNG_URL = process.env.SEARXNG_URL || 'http://localhost:8080';

/**
 * Get search provider
 */
export async function getSearchProvider() {
  if (isOffline()) {
    // Offline: Use local SearXNG or Whoosh index
    return {
      type: 'local',
      provider: 'searxng',
      search: async (query, options = {}) => {
        return await searchWithSearXNG(query, options);
      },
    };
  } else {
    // Online: Use Brave Search (free) or SearXNG
    return {
      type: 'cloud',
      provider: BRAVE_API_KEY ? 'brave' : 'searxng',
      search: async (query, options = {}) => {
        if (BRAVE_API_KEY) {
          return await searchWithBrave(query, options);
        } else {
          return await searchWithSearXNG(query, options);
        }
      },
    };
  }
}

/**
 * Search with Brave API (free tier: 10k queries/month)
 */
async function searchWithBrave(query, options = {}) {
  if (!BRAVE_API_KEY) {
    throw new Error('BRAVE_API_KEY not configured');
  }

  try {
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: query,
        count: options.count || 10,
        safesearch: options.safesearch || 'moderate',
      },
      headers: {
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    });

    return {
      results: response.data.web?.results || [],
      total: response.data.web?.total || 0,
    };
  } catch (error) {
    throw new Error(`Brave search failed: ${error.message}`);
  }
}

/**
 * Search with SearXNG (self-hosted, free)
 */
async function searchWithSearXNG(query, options = {}) {
  try {
    const response = await axios.get(`${SEARXNG_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        engines: options.engines || 'google,bing,duckduckgo',
      },
    });

    return {
      results: response.data.results || [],
      total: response.data.number_of_results || 0,
    };
  } catch (error) {
    // Fallback to local Whoosh index if SearXNG unavailable
    console.warn('[SearchProvider] SearXNG failed, using local index');
    return await searchWithWhoosh(query, options);
  }
}

/**
 * Search with local Whoosh index (offline)
 */
async function searchWithWhoosh(query, options = {}) {
  // This would use a local Whoosh index
  // For now, return empty results
  console.warn('[SearchProvider] Whoosh index not implemented');
  return {
    results: [],
    total: 0,
  };
}




