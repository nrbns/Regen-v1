import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export function extractReadable(html: string, baseUrl: string) {
  const dom = new JSDOM(html, { url: baseUrl });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  if (!article) return { title: '', text: '', excerpt: '', lang: 'en' };
  return { title: article.title || '', text: article.textContent || '', excerpt: article.excerpt || '', lang: dom.window.document.documentElement.lang || 'en' };
}


