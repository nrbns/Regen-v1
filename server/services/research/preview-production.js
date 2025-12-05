/* eslint-env node */
/**
 * Production Source Preview Generator
 * Exactly like the UI preview boxes
 * Converted from Python production code
 */

import axios from 'axios';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const PREVIEW_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate preview for a URL
 */
export async function generatePreview(url) {
  // Check cache
  if (PREVIEW_CACHE.has(url)) {
    const cached = PREVIEW_CACHE.get(url);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.preview;
    }
  }

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RegenResearch/1.0)',
      },
      responseType: 'text',
    });

    const contentType = response.headers['content-type'] || '';

    // Handle PDFs
    if (contentType.includes('application/pdf')) {
      const preview = {
        url,
        title: url.split('/').pop() || 'PDF Document',
        preview: 'PDF document',
        icon: '📄',
        favicon: 'https://www.google.com/s2/favicons?domain=' + new URL(url).hostname + '&sz=32',
      };
      cachePreview(url, preview);
      return preview;
    }

    // Parse HTML with Readability
    const dom = new JSDOM(response.data, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      // Fallback to basic extraction
      const titleMatch = response.data.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
      
      const preview = {
        url,
        title,
        preview: '',
        favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
      };
      cachePreview(url, preview);
      return preview;
    }

    // Clean and truncate text
    let text = article.textContent || article.excerpt || '';
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length > 320) {
      text = text.substring(0, 300) + '...';
    }

    const preview = {
      url,
      title: article.title || new URL(url).hostname,
      preview: text,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
    };

    cachePreview(url, preview);
    return preview;
  } catch (error) {
    console.warn('[PreviewGenerator] Failed to generate preview:', error.message);
    const preview = {
      url,
      title: 'Could not fetch',
      preview: '',
      favicon: '🔗',
    };
    cachePreview(url, preview);
    return preview;
  }
}

/**
 * Cache preview
 */
function cachePreview(url, preview) {
  PREVIEW_CACHE.set(url, {
    preview,
    timestamp: Date.now(),
  });

  // Cleanup if cache too large
  if (PREVIEW_CACHE.size > 1000) {
    const entries = Array.from(PREVIEW_CACHE.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      PREVIEW_CACHE.delete(entries[i][0]);
    }
  }
}

/**
 * Generate previews for multiple URLs in parallel
 */
export async function generatePreviews(urls) {
  const previews = await Promise.all(
    urls.map(url => generatePreview(url).catch(() => ({
      url,
      title: 'Could not fetch',
      preview: '',
      favicon: '🔗',
    })))
  );

  return previews;
}




