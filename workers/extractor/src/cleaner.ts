import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export type CleanResult = {
  title: string | null;
  text: string;
  html: string;
  language: string;
};

export function cleanHtml(html: string): CleanResult {
  const dom = new JSDOM(html, {
    contentType: 'text/html',
  });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const text =
    article?.textContent?.trim() ||
    dom.window.document.body.textContent?.replace(/\s+/g, ' ').trim() ||
    '';

  const title = article?.title || dom.window.document.title || null;
  const language = dom.window.document.documentElement.lang || 'unknown';

  return {
    title,
    text,
    html: article?.content || dom.window.document.body.innerHTML || '',
    language,
  };
}
