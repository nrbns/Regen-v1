/* eslint-env node */
/**
 * Real-Time Source Preview Generator
 * Turns any URL into a nice preview box for the UI
 */

import axios from 'axios';
import { parallelScrape } from './scraper-parallel.js';

const PREVIEW_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate preview for a URL
 */
export async function generateSourcePreview(url, options = {}) {
  const { forceRefresh = false } = options;

  // Check cache
  if (!forceRefresh && PREVIEW_CACHE.has(url)) {
    const cached = PREVIEW_CACHE.get(url);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.preview;
    }
  }

  let preview = {
    url,
    title: null,
    description: null,
    image: null,
    favicon: null,
    siteName: null,
    type: 'web',
    metadata: {},
  };

  try {
    // Try to get Open Graph / Twitter Card metadata
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RegenResearch/1.0)',
      },
      maxRedirects: 5,
    });

    const html = response.data;
    
    // Extract Open Graph tags
    const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogDescription = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogSiteName = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i)?.[1];

    // Extract Twitter Card tags
    const twitterTitle = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i)?.[1];
    const twitterDescription = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i)?.[1];
    const twitterImage = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)?.[1];

    // Extract title
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();

    // Extract favicon
    const favicon = html.match(/<link[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["']([^"']+)["']/i)?.[1];

    preview.title = ogTitle || twitterTitle || title || null;
    preview.description = ogDescription || twitterDescription || null;
    preview.image = ogImage || twitterImage || null;
    preview.siteName = ogSiteName || new URL(url).hostname;
    preview.favicon = favicon ? new URL(favicon, url).href : `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;

    // Special handling for known domains
    if (url.includes('arxiv.org')) {
      preview.type = 'arxiv';
      const arxivData = await parallelScrape([url]);
      if (arxivData.results[0]) {
        preview.metadata = arxivData.results[0];
      }
    } else if (url.includes('github.com')) {
      preview.type = 'github';
      const githubData = await parallelScrape([url]);
      if (githubData.results[0]) {
        preview.metadata = githubData.results[0];
      }
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      preview.type = 'twitter';
      const twitterData = await parallelScrape([url]);
      if (twitterData.results[0]) {
        preview.metadata = twitterData.results[0];
      }
    }

  } catch (error) {
    console.warn('[SourcePreview] Failed to generate preview:', error.message);
    // Return basic preview with URL
    preview.title = new URL(url).hostname;
    preview.description = url;
  }

  // Cache the result
  PREVIEW_CACHE.set(url, {
    preview,
    timestamp: Date.now(),
  });

  return preview;
}

/**
 * Generate previews for multiple URLs in parallel
 */
export async function generateSourcePreviews(urls) {
  const previews = await Promise.all(
    urls.map(url => generateSourcePreview(url).catch(() => ({
      url,
      title: new URL(url).hostname,
      description: url,
      type: 'web',
    })))
  );

  return previews;
}

/**
 * Clear preview cache
 */
export function clearPreviewCache() {
  PREVIEW_CACHE.clear();
}

/**
 * Get cache stats
 */
export function getPreviewCacheStats() {
  return {
    size: PREVIEW_CACHE.size,
    entries: Array.from(PREVIEW_CACHE.keys()),
  };
}







