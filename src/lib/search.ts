const LANGUAGE_LOCALE_MAP: Record<string, string> = {
  // 22 Indic languages (Bhashini supported)
  as: 'as-IN', // Assamese
  bn: 'bn-IN', // Bengali
  brx: 'brx-IN', // Bodo
  doi: 'doi-IN', // Dogri
  gom: 'gom-IN', // Konkani
  gu: 'gu-IN', // Gujarati
  hi: 'hi-IN', // Hindi
  kn: 'kn-IN', // Kannada
  ks: 'ks-IN', // Kashmiri
  mai: 'mai-IN', // Maithili
  ml: 'ml-IN', // Malayalam
  mni: 'mni-IN', // Manipuri
  mr: 'mr-IN', // Marathi
  ne: 'ne-NP', // Nepali
  or: 'or-IN', // Odia
  pa: 'pa-IN', // Punjabi
  sa: 'sa-IN', // Sanskrit
  sat: 'sat-IN', // Santali
  sd: 'sd-PK', // Sindhi
  ta: 'ta-IN', // Tamil
  te: 'te-IN', // Telugu
  ur: 'ur-PK', // Urdu
  // Other languages
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

// Search engines that allow iframe embedding (no X-Frame-Options blocking)
const IFRAME_FRIENDLY_PROVIDERS = ['bing', 'yahoo', 'startpage', 'ecosia'];

export function buildSearchUrl(
  provider: 'google' | 'duckduckgo' | 'bing' | 'yahoo' | 'startpage' | 'ecosia',
  q: string,
  language?: string,
  preferIframeFriendly: boolean = true
) {
  const enc = encodeURIComponent(q);
  const locale = getLocaleFromLanguage(language);
  const langCode = locale.split('-')[0];

  // If iframe-friendly is preferred and current provider blocks iframes, use fallback
  if (preferIframeFriendly && !IFRAME_FRIENDLY_PROVIDERS.includes(provider)) {
    // DuckDuckGo and Google block iframes - use Bing as fallback
    if (provider === 'duckduckgo' || provider === 'google') {
      return `https://www.bing.com/search?q=${enc}&setlang=${langCode}`;
    }
  }

  switch (provider) {
    case 'duckduckgo':
      return `https://duckduckgo.com/?q=${enc}&kl=${locale}&hl=${langCode}`;
    case 'bing':
      return `https://www.bing.com/search?q=${enc}&setlang=${langCode}`;
    case 'yahoo':
      return `https://search.yahoo.com/search?p=${enc}&lang=${langCode}`;
    case 'startpage':
      return `https://www.startpage.com/sp/search?query=${enc}&language=${langCode}`;
    case 'ecosia':
      return `https://www.ecosia.org/search?q=${enc}&language=${langCode}`;
    default:
      // Google blocks iframes - use Bing for iframe compatibility
      if (preferIframeFriendly) {
        return `https://www.bing.com/search?q=${enc}&setlang=${langCode}`;
      }
      return `https://www.google.com/search?q=${enc}&hl=${langCode}&gl=${locale.split('-')[1] || 'US'}`;
  }
}

/**
 * Check if a string is likely a URL
 */
function isLikelyUrl(input: string): boolean {
  const trimmed = input.trim().toLowerCase();

  // Has protocol
  if (/^[a-z][a-z0-9+.-]*:/.test(trimmed)) {
    return true;
  }

  // Has spaces - definitely not a URL
  if (/\s/.test(trimmed)) {
    return false;
  }

  // Looks like a domain (has TLD)
  const domainPattern = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(\/.*)?$/i;
  if (domainPattern.test(trimmed)) {
    // Check if it's a valid domain format
    try {
      const testUrl = new URL(`https://${trimmed}`);
      // Valid domain-like structure
      return testUrl.hostname.includes('.') && testUrl.hostname.split('.').length >= 2;
    } catch {
      return false;
    }
  }

  // IP address pattern
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/;
  if (ipPattern.test(trimmed)) {
    return true;
  }

  // Localhost
  if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')) {
    return true;
  }

  // Special protocols
  if (/^(about|file|data|blob|javascript):/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Normalize input to URL or search query
 * Enhanced to properly detect non-URLs and convert to Google search in language
 */
export function normalizeInputToUrlOrSearch(
  input: string,
  provider: 'google' | 'duckduckgo' | 'bing' | 'yahoo' | 'all' = 'google',
  language?: string,
  preferIframeFriendly: boolean = true
): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return 'about:blank';
  }

  // Check if it's likely a URL
  if (isLikelyUrl(trimmed)) {
    // Try parsing as-is URL
    try {
      const url = new URL(trimmed);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
    } catch {
      // Not a valid URL with protocol
    }

    // Try with https:// prefix
    try {
      const url = new URL(`https://${trimmed}`);
      return url.toString();
    } catch {
      // Not a valid URL even with https://
    }
  }

  // Not a URL - convert to search
  // Default to Bing if provider is 'all' and iframe-friendly is preferred (Bing allows iframes)
  const searchProvider = provider === 'all' ? (preferIframeFriendly ? 'bing' : 'google') : provider;
  return buildSearchUrl(searchProvider, trimmed, language, preferIframeFriendly);
}
