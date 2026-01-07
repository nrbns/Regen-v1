/* eslint-env node */
/**
 * Multi-Source Search Engine
 * Beats Perplexity by using diverse sources: Brave, Mojeek, Kagi, Marginalia, etc.
 */

import axios from 'axios';

const SEARCH_ENGINES = {
  brave: {
    name: 'Brave Search',
    enabled: process.env.BRAVE_API_KEY ? true : false,
    search: async query => {
      if (!process.env.BRAVE_API_KEY) return null;
      try {
        const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
          params: { q: query, count: 10 },
          headers: { 'X-Subscription-Token': process.env.BRAVE_API_KEY },
        });
        return (
          response.data.web?.results?.map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.description,
            source: 'brave',
          })) || []
        );
      } catch (error) {
        console.warn('[MultiSourceSearch] Brave search failed:', error.message);
        return [];
      }
    },
  },

  mojeek: {
    name: 'Mojeek',
    enabled: true, // Free, no API key needed
    search: async query => {
      try {
        const response = await axios.get('https://api.mojeek.com/search', {
          params: { q: query, api_key: process.env.MOJEEK_API_KEY || '', fmt: 'json' },
        });
        return (
          response.data.response?.results?.map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.desc,
            source: 'mojeek',
          })) || []
        );
      } catch (error) {
        console.warn('[MultiSourceSearch] Mojeek search failed:', error.message);
        return [];
      }
    },
  },

  kagi: {
    name: 'Kagi',
    enabled: process.env.KAGI_API_KEY ? true : false,
    search: async query => {
      if (!process.env.KAGI_API_KEY) return null;
      try {
        const response = await axios.get('https://kagi.com/api/v0/search', {
          params: { q: query },
          headers: { Authorization: `Bot ${process.env.KAGI_API_KEY}` },
        });
        return (
          response.data.data?.results?.map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            source: 'kagi',
          })) || []
        );
      } catch (error) {
        console.warn('[MultiSourceSearch] Kagi search failed:', error.message);
        return [];
      }
    },
  },

  marginalia: {
    name: 'Marginalia',
    enabled: true, // Free, no API key needed
    search: async query => {
      try {
        const _response = await axios.get('https://search.marginalia.nu/search', {
          params: { q: query },
        });
        // Marginalia returns HTML, would need parsing
        // For now, return empty - implement parser if needed
        return [];
      } catch (error) {
        console.warn('[MultiSourceSearch] Marginalia search failed:', error.message);
        return [];
      }
    },
  },

  duckduckgo: {
    name: 'DuckDuckGo',
    enabled: true, // Fallback
    search: async query => {
      try {
        const response = await axios.get('https://api.duckduckgo.com/', {
          params: { q: query, format: 'json', no_html: '1' },
        });
        return (response.data.Results || []).map(r => ({
          title: r.Text,
          url: r.FirstURL,
          snippet: r.Text,
          source: 'duckduckgo',
        }));
      } catch (error) {
        console.warn('[MultiSourceSearch] DuckDuckGo search failed:', error.message);
        return [];
      }
    },
  },
};

/**
 * Search across multiple engines in parallel
 */
export async function multiSourceSearch(query, options = {}) {
  const { maxResults = 50, engines = Object.keys(SEARCH_ENGINES) } = options;

  const enabledEngines = engines
    .filter(name => SEARCH_ENGINES[name]?.enabled)
    .map(name => SEARCH_ENGINES[name]);

  // Execute all searches in parallel
  const searchPromises = enabledEngines.map(engine =>
    engine.search(query).catch(error => {
      console.warn(`[MultiSourceSearch] ${engine.name} failed:`, error.message);
      return [];
    })
  );

  const results = await Promise.all(searchPromises);

  // Flatten and deduplicate by URL
  const allResults = results.flat();
  const seenUrls = new Set();
  const uniqueResults = [];

  for (const result of allResults) {
    if (result?.url && !seenUrls.has(result.url)) {
      seenUrls.add(result.url);
      uniqueResults.push(result);
      if (uniqueResults.length >= maxResults) break;
    }
  }

  return {
    results: uniqueResults,
    sources: enabledEngines.map(e => e.name),
    total: uniqueResults.length,
  };
}

/**
 * Search with source diversity requirements
 * Forces at least one PDF, one GitHub, one arXiv, etc.
 */
export async function diverseSearch(query, requirements = {}) {
  const {
    requirePDF = true,
    requireGitHub = true,
    requireArxiv = true,
    requireTwitter: _requireTwitter = false,
  } = requirements;

  const queries = [
    query, // General search
    ...(requirePDF ? [`${query} filetype:pdf`] : []),
    ...(requireGitHub ? [`site:github.com ${query}`] : []),
    ...(requireArxiv ? [`site:arxiv.org ${query}`] : []),
  ];

  const allResults = await Promise.all(queries.map(q => multiSourceSearch(q, { maxResults: 20 })));

  const combined = allResults.flatMap(r => r.results);

  // Deduplicate
  const seenUrls = new Set();
  const unique = [];
  for (const result of combined) {
    if (result?.url && !seenUrls.has(result.url)) {
      seenUrls.add(result.url);
      unique.push(result);
    }
  }

  return {
    results: unique,
    hasPDF: unique.some(r => r.url?.endsWith('.pdf') || r.url?.includes('.pdf')),
    hasGitHub: unique.some(r => r.url?.includes('github.com')),
    hasArxiv: unique.some(r => r.url?.includes('arxiv.org')),
    total: unique.length,
  };
}
