export function buildSearchUrl(provider: 'google'|'duckduckgo'|'bing'|'yahoo', q: string) {
  const enc = encodeURIComponent(q);
  switch (provider) {
    case 'duckduckgo': return `https://duckduckgo.com/?q=${enc}`;
    case 'bing': return `https://www.bing.com/search?q=${enc}`;
    case 'yahoo': return `https://search.yahoo.com/search?p=${enc}`;
    default: return `https://www.google.com/search?q=${enc}`;
  }
}

export function normalizeInputToUrlOrSearch(input: string, provider: 'google'|'duckduckgo'|'bing'|'yahoo'|'all') {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // If contains spaces, treat as search
  if (/[\s]/.test(trimmed)) return buildSearchUrl(provider as any, trimmed);
  // Try as-is URL
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
  } catch {}
  // Try with https://
  try {
    const u2 = new URL(`https://${trimmed}`);
    return u2.toString();
  } catch {}
  // Fallback to search
  return buildSearchUrl(provider as any, trimmed);
}


