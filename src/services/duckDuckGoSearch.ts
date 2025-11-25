// DuckDuckGo Instant Answer API client
// No API key required - public endpoint

export type DuckDuckGoResult = {
  Heading?: string;
  AbstractText?: string;
  AbstractURL?: string;
  AbstractSource?: string;
  RelatedTopics?: Array<{
    FirstURL?: string;
    Text?: string;
    Name?: string;
  }>;
  Results?: Array<{
    FirstURL: string;
    Text: string;
  }>;
  Answer?: string;
  AnswerType?: string;
  Definition?: string;
  DefinitionURL?: string;
  DefinitionSource?: string;
  Image?: string;
  ImageIsLogo?: number;
  Infobox?: any;
  Redirect?: string;
};

const LANGUAGE_LOCALE_MAP: Record<string, string> = {
  hi: 'in-hi',
  ta: 'in-ta',
  te: 'in-te',
  bn: 'in-bn',
  mr: 'in-mr',
  kn: 'in-kn',
  ml: 'in-ml',
  gu: 'in-gu',
  pa: 'in-pa',
  ur: 'pk-ur',
  en: 'us-en',
  es: 'es-es',
  fr: 'fr-fr',
  de: 'de-de',
  pt: 'pt-pt',
  zh: 'cn-zh',
  ja: 'jp-ja',
  ru: 'ru-ru',
};

function getDuckLocale(lang?: string): string {
  if (!lang || lang === 'auto') return 'us-en';
  return LANGUAGE_LOCALE_MAP[lang] || 'us-en';
}

export async function fetchDuckDuckGoInstant(
  query: string,
  language?: string
): Promise<DuckDuckGoResult | null> {
  if (!query || query.trim().length < 2) return null;

  try {
    const locale = getDuckLocale(language);
    const langCode = locale.split('-')[0];
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query.trim())}&format=json&no_redirect=1&skip_disambig=1&kl=${locale}&hl=${langCode}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as DuckDuckGoResult;
    return data;
  } catch (error) {
    console.warn('[DuckDuckGo] Search failed:', error);
    return null;
  }
}

export function formatDuckDuckGoResults(result: DuckDuckGoResult | null): Array<{
  title: string;
  url?: string;
  snippet: string;
  type: 'instant' | 'result' | 'related';
}> {
  if (!result) return [];

  const formatted: Array<{
    title: string;
    url?: string;
    snippet: string;
    type: 'instant' | 'result' | 'related';
  }> = [];

  // Instant Answer
  if (result.Heading && result.AbstractText) {
    formatted.push({
      title: result.Heading,
      url: result.AbstractURL,
      snippet: result.AbstractText,
      type: 'instant',
    });
  }

  // Answer box
  if (result.Answer) {
    formatted.push({
      title: result.AnswerType || 'Answer',
      snippet: result.Answer,
      type: 'instant',
    });
  }

  // Definition
  if (result.Definition) {
    formatted.push({
      title: result.DefinitionSource || 'Definition',
      url: result.DefinitionURL,
      snippet: result.Definition,
      type: 'instant',
    });
  }

  // Web Results
  if (result.Results && result.Results.length > 0) {
    result.Results.slice(0, 5).forEach(r => {
      formatted.push({
        title: r.Text || r.FirstURL,
        url: r.FirstURL,
        snippet: '',
        type: 'result',
      });
    });
  }

  // Related Topics
  if (result.RelatedTopics && result.RelatedTopics.length > 0) {
    result.RelatedTopics.slice(0, 5).forEach(rt => {
      formatted.push({
        title: rt.Text || rt.Name || 'Related',
        url: rt.FirstURL,
        snippet: '',
        type: 'related',
      });
    });
  }

  return formatted;
}
