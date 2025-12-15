/**
 * Page Analysis Service
 * Analyzes page content and structure
 */

export interface PageAnalysis {
  title: string;
  description: string;
  content: string;
  language: string;
  readingTime: number;
  structure: {
    headings: string[];
    lists: string[][];
    tables: any[];
    links: Array<{ text: string; href: string }>;
  };
  actions: SuggestedAction[];
}

export interface SuggestedAction {
  id: string;
  action: string;
  label: string;
  skillId?: string;
  context?: Record<string, any>;
}

/**
 * Analyze current page content and structure
 */
export async function analyzePage(): Promise<PageAnalysis> {
  // Get page content
  const title = document.title || 'Untitled Page';
  const description =
    document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  // Extract text content
  const bodyText = document.body.innerText || '';

  // Extract structure
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(
    h => h.textContent || ''
  );

  const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
    text: a.textContent || '',
    href: a.getAttribute('href') || '',
  }));

  // Calculate reading time (approx 200 words per minute)
  const wordCount = bodyText.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  // Suggest common actions
  const actions: SuggestedAction[] = [
    {
      id: 'summarize',
      action: 'summarize',
      label: 'Summarize',
      skillId: 'page-summarizer',
    },
    {
      id: 'translate',
      action: 'translate',
      label: 'Translate',
      skillId: 'page-translator',
    },
  ];

  return {
    title,
    description,
    content: bodyText.substring(0, 10000), // Limit content
    language: document.documentElement.lang || 'en',
    readingTime,
    structure: {
      headings,
      lists: [],
      tables: [],
      links,
    },
    actions,
  };
}
