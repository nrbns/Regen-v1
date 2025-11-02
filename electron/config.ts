export const cfg = {
  useMeili: process.env.SEARCH_USE_MEILI === 'true',
  meiliHost: process.env.MEILI_HOST || 'http://127.0.0.1:7700',
  meiliKey: process.env.MEILI_KEY || '',
  maxConcurrency: Number(process.env.SCRAPER_MAX_CONCURRENCY || 4),
  timeoutMs: Number(process.env.SCRAPER_TIMEOUT_MS || 35000),
  userAgent: process.env.SCRAPER_USER_AGENT || 'OmniBrowserBot/1.0 (+local) JS',
  proxyRotation: process.env.PROXY_ROTATION === 'true',
  proxyList: (process.env.PROXY_LIST || '').split(',').map(s => s.trim()).filter(Boolean),
};


