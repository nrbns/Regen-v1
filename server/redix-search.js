/* eslint-env node */

import { URL as NodeURL } from 'url';

const defaultFetch = globalThis.fetch;

async function ensureFetch() {
  if (defaultFetch) {
    return defaultFetch;
  }
  const module = await import('node-fetch');
  return module.default;
}

export async function runSearch(query) {
  const fetchImpl = await ensureFetch();
  const AbortCtor = globalThis.AbortController || null;
  const controller = AbortCtor ? new AbortCtor() : null;
  const timeout = controller ? globalThis.setTimeout?.(() => controller.abort(), 7000) : null;

  try {
    const UrlCtor = globalThis.URL || NodeURL;
    const url = new UrlCtor('https://api.duckduckgo.com/');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('no_redirect', '1');
    url.searchParams.set('no_html', '1');

    const res = await fetchImpl(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RedixBot/1.0 (+https://omnibrowser.dev)',
      },
    });
    if (!res.ok) {
      throw new Error(`upstream responded ${res.status}`);
    }

    const data = await res.json();
    const items = [];
    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (topic.Topics) {
          for (const nested of topic.Topics) {
            if (nested.Text) {
              items.push({
                title: nested.Text,
                url: nested.FirstURL,
                snippet: nested.Result?.replace(/<[^>]*>/g, '') ?? nested.Text,
                source: 'duckduckgo',
              });
            }
          }
        } else if (topic.Text) {
          items.push({
            title: topic.Text,
            url: topic.FirstURL,
            snippet: topic.Result?.replace(/<[^>]*>/g, '') ?? topic.Text,
            source: 'duckduckgo',
          });
        }
      }
    }

    if (items.length === 0 && data.AbstractText) {
      items.push({
        title: data.Heading || query,
        url: data.AbstractURL || null,
        snippet: data.AbstractText,
        source: 'duckduckgo',
      });
    }

    return items.slice(0, 10);
  } finally {
    if (timeout && globalThis.clearTimeout) {
      globalThis.clearTimeout(timeout);
    }
  }
}


