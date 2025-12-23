/**
 * Page Analysis Service
 * Analyzes page content and structure
 */

export interface PageEntity {
  type: 'person' | 'organization' | 'location' | 'date' | 'email' | 'keyword' | 'other';
  value: string;
  context?: string;
}

export interface PageStructure {
  headings: Array<{ level: number; text: string }>;
  lists: string[][];
  tables: Array<{ headers: string[]; rows: string[][] }>;
  links: Array<{ text: string; href: string }>;
  forms: Array<{ id?: string; name?: string; method?: string; action?: string; fields: number }>;
}

export interface SuggestedAction {
  id: string;
  type: string;
  title: string;
  description?: string;
  priority: number;
  skillId?: string;
  actionId?: string;
  context?: Record<string, any>;
}

export interface PageAnalysis {
  url: string;
  title: string;
  description: string;
  content: string;
  language: string;
  readingTime: number;
  contentType: 'article' | 'product' | 'form' | 'other';
  keywords: string[];
  entities: PageEntity[];
  structure: PageStructure;
  actions: SuggestedAction[];
}

/**
 * Analyze current page content and structure
 */
export async function analyzePage(): Promise<PageAnalysis> {
  const url = window.location.href;
  const title = document.title || 'Untitled Page';
  const description =
    document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  const bodyText = document.body.innerText || '';

  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
    level: Number(h.tagName.replace('H', '')),
    text: h.textContent || '',
  }));

  const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
    text: a.textContent || '',
    href: a.getAttribute('href') || '',
  }));

  const forms = Array.from(document.querySelectorAll('form')).map(form => ({
    id: form.id || undefined,
    name: (form as HTMLFormElement).name || undefined,
    method: (form as HTMLFormElement).method || undefined,
    action: (form as HTMLFormElement).action || undefined,
    fields: form.querySelectorAll('input, textarea, select').length,
  }));

  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / 200);

  const contentType: PageAnalysis['contentType'] = forms.length
    ? 'form'
    : wordCount > 500
      ? 'article'
      : 'other';

  const keywords = Array.from(bodyText.toLowerCase().match(/\b[a-z]{4,}\b/g) || []).slice(0, 20);

  const entities: PageEntity[] = [];
  const emailRegex = /[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/g;
  const dateRegex = /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g;

  const emails = bodyText.match(emailRegex) || [];
  emails.forEach(value => entities.push({ type: 'email', value }));

  const dates = bodyText.match(dateRegex) || [];
  dates.forEach(value => entities.push({ type: 'date', value }));

  const actions: SuggestedAction[] = [
    {
      id: 'summarize',
      type: 'summarize',
      title: 'Summarize Page',
      description: 'Generate a quick summary',
      priority: 5,
    },
    {
      id: 'translate',
      type: 'translate',
      title: 'Translate Page',
      description: 'Translate page content',
      priority: 4,
    },
    {
      id: 'compose-email',
      type: 'compose_email',
      title: 'Compose Email',
      description: 'Draft an email with this page context',
      priority: 6,
      skillId: 'regen-gmail',
      actionId: 'composeEmail',
    },
    {
      id: 'create-calendar',
      type: 'create_calendar',
      title: 'Create Calendar Event',
      description: 'Schedule an event from this page',
      priority: 6,
      skillId: 'regen-calendar',
      actionId: 'createEvent',
    },
  ];

  if (forms.length) {
    actions.push({
      id: 'autofill',
      type: 'autofill',
      title: 'Autofill Form',
      description: 'Fill detected form automatically',
      priority: 8,
      skillId: 'regen-autofill',
      actionId: 'autofillForm',
    });
  }

  return {
    url,
    title,
    description,
    content: bodyText.substring(0, 10000),
    language: document.documentElement.lang || 'en',
    readingTime,
    contentType,
    keywords,
    entities,
    structure: {
      headings,
      lists: [],
      tables: [],
      links,
      forms,
    },
    actions,
  };
}
