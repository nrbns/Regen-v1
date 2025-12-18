/**
 * Gmail Context Extractor
 * Extracts relevant context from pages for Gmail composition
 */

import type { SkillContext } from '../types';

export function extractPageContext(_context?: SkillContext): {
  suggestedSubject?: string;
  suggestedBody?: string;
} {
  const selectedText = getSelectedText();
  const pageTitle = document.title;

  return {
    suggestedSubject: pageTitle || undefined,
    suggestedBody: selectedText || undefined,
  };
}

/**
 * Get selected text from page
 */
function getSelectedText(): string {
  return window.getSelection()?.toString() || '';
}

/**
 * Get page content
 */
function getPageContent(): string {
  const main = document.querySelector('main') || document.querySelector('article') || document.body;
  return main?.innerText || '';
}

/**
 * Extract email addresses from page
 */
export function extractEmails(): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const content = getPageContent();
  return [...new Set(content.match(emailRegex) || [])];
}

/**
 * Extract links from page
 */
export function extractLinks(): { text: string; href: string }[] {
  const links: { text: string; href: string }[] = [];
  document.querySelectorAll('a').forEach(link => {
    links.push({
      text: link.innerText,
      href: link.href,
    });
  });
  return links;
}
