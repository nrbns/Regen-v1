const LANGUAGE_LOCALE_MAP: Record<string, string> = {
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  ur: 'ur-PK',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ru: 'ru-RU',
  pt: 'pt-PT',
  ar: 'ar-SA',
};

function getLocaleFromLanguage(lang?: string): string {
  if (!lang || lang === 'auto') return 'en-US';
  return LANGUAGE_LOCALE_MAP[lang] || lang.includes('-') ? lang : `${lang}-${lang.toUpperCase()}`;
}

export function buildSearchUrl(
  provider: 'google' | 'duckduckgo' | 'bing' | 'yahoo',
  q: string,
  language?: string
) {
  const enc = encodeURIComponent(q);
  const locale = getLocaleFromLanguage(language);
  const langCode = locale.split('-')[0];

  switch (provider) {
    case 'duckduckgo':
      return `https://duckduckgo.com/?q=${enc}&kl=${locale}&hl=${langCode}`;
    case 'bing':
      return `https://www.bing.com/search?q=${enc}&setlang=${langCode}`;
    case 'yahoo':
      return `https://search.yahoo.com/search?p=${enc}&lang=${langCode}`;
    default:
      return `https://www.google.com/search?q=${enc}&hl=${langCode}&gl=${locale.split('-')[1] || 'US'}`;
  }
}

export function normalizeInputToUrlOrSearch(
  input: string,
  provider: 'google' | 'duckduckgo' | 'bing' | 'yahoo' | 'all',
  language?: string
) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // If contains spaces, treat as search
  if (/[\s]/.test(trimmed)) return buildSearchUrl(provider as any, trimmed, language);
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
  return buildSearchUrl(provider as any, trimmed, language);
}
