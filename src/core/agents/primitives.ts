/**
 * Agent Primitives - Low-level DOM manipulation and page interaction
 * Provides safe, permission-gated primitives for agent automation
 */

export interface DOMSelector {
  type: 'id' | 'class' | 'tag' | 'selector' | 'text' | 'xpath';
  value: string;
}

export interface ClickOptions {
  timeout?: number;
  waitForNavigation?: boolean;
  offset?: { x: number; y: number };
}

export interface FillOptions {
  clear?: boolean;
  selectAll?: boolean;
  timeout?: number;
}

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg';
  quality?: number;
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
}

export interface ScrollOptions {
  behavior?: 'smooth' | 'instant' | 'auto';
  block?: 'start' | 'center' | 'end' | 'nearest';
}

export interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  text?: string;
  value?: string;
  attributes: Record<string, string>;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visible: boolean;
  clickable: boolean;
}

export interface PageInfo {
  url: string;
  title: string;
  viewport: { width: number; height: number };
  readyState: DocumentReadyState;
}

/**
 * Convert selector to DOM element
 */
function resolveSelector(selector: DOMSelector, document: Document): Element | null {
  try {
    switch (selector.type) {
      case 'id':
        return document.getElementById(selector.value);
      case 'class':
        return document.getElementsByClassName(selector.value)[0] || null;
      case 'tag':
        return document.getElementsByTagName(selector.value)[0] || null;
      case 'selector':
        return document.querySelector(selector.value);
      case 'text':
        // Find element containing text
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        );
        let node;
        while ((node = walker.nextNode())) {
          if (node.textContent?.includes(selector.value)) {
            return node.parentElement;
          }
        }
        return null;
      case 'xpath':
        const result = document.evaluate(
          selector.value,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        return result.singleNodeValue as Element | null;
      default:
        return null;
    }
  } catch (error) {
    console.error('[AgentPrimitives] Selector resolution error:', error);
    return null;
  }
}

/**
 * Wait for element to be visible
 */
function waitForElement(
  selector: DOMSelector,
  document: Document,
  timeout = 5000
): Promise<Element | null> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const check = () => {
      const element = resolveSelector(selector, document);
      if (element && isVisible(element)) {
        resolve(element);
        return;
      }

      if (Date.now() - startTime > timeout) {
        resolve(null);
        return;
      }

      setTimeout(check, 100);
    };

    check();
  });
}

/**
 * Check if element is visible
 */
function isVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Check if element is clickable
 */
function isClickable(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;

  // Check if it's a naturally clickable element
  const clickableTags = ['a', 'button', 'input', 'select', 'textarea'];
  if (clickableTags.includes(element.tagName.toLowerCase())) {
    return true;
  }

  // Check if it has click handlers
  const hasOnClick = element.onclick !== null;
  const hasClickListeners = element.getAttribute('onclick') !== null;

  // Check cursor style
  const style = window.getComputedStyle(element);
  const cursor = style.cursor;
  const isPointer = cursor === 'pointer' || cursor === 'grab' || cursor === 'pointer';

  return hasOnClick || hasClickListeners || isPointer;
}

/**
 * Scroll element into view
 */
async function scrollIntoView(element: Element, options: ScrollOptions = {}): Promise<void> {
  if (!(element instanceof HTMLElement)) return;

  element.scrollIntoView({
    behavior: options.behavior || 'smooth',
    block: options.block || 'center',
    inline: 'nearest',
  });

  // Wait for scroll to complete
  await new Promise((resolve) => setTimeout(resolve, options.behavior === 'smooth' ? 300 : 0));
}

/**
 * Read element information
 */
export async function readElement(
  selector: DOMSelector,
  document: Document = window.document
): Promise<ElementInfo | null> {
  const element = resolveSelector(selector, document);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const attributes: Record<string, string> = {};

  // Extract attributes
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    attributes[attr.name] = attr.value;
  }

  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    className: element.className || undefined,
    text: element.textContent?.trim() || undefined,
    value: (element as HTMLInputElement).value || undefined,
    attributes,
    boundingBox: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    },
    visible: isVisible(element),
    clickable: isClickable(element),
  };
}

/**
 * Click on an element
 */
export async function clickElement(
  selector: DOMSelector,
  options: ClickOptions = {},
  document: Document = window.document
): Promise<boolean> {
  const element = await waitForElement(selector, document, options.timeout);
  if (!element) return false;

  if (!(element instanceof HTMLElement)) return false;

  // Scroll into view
  await scrollIntoView(element);

  // Create and dispatch click event
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
  });

  element.dispatchEvent(clickEvent);

  // Also trigger native click if possible
  if (element.click) {
    element.click();
  }

  // Wait for navigation if requested
  if (options.waitForNavigation) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return true;
}

/**
 * Fill an input field
 */
export async function fillInput(
  selector: DOMSelector,
  value: string,
  options: FillOptions = {},
  document: Document = window.document
): Promise<boolean> {
  const element = await waitForElement(selector, document, options.timeout);
  if (!element) return false;

  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    return false;
  }

  // Scroll into view
  await scrollIntoView(element);

  // Focus
  element.focus();

  // Clear if requested
  if (options.clear || options.selectAll) {
    if (options.selectAll) {
      element.select();
    } else {
      element.value = '';
    }
  }

  // Set value
  element.value = value;

  // Dispatch input events
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));

  return true;
}

/**
 * Read text from an element
 */
export async function readText(
  selector: DOMSelector,
  document: Document = window.document
): Promise<string | null> {
  const element = resolveSelector(selector, document);
  if (!element) return null;

  return element.textContent?.trim() || null;
}

/**
 * Read all text from the page
 */
export function readPageText(document: Document = window.document): string {
  // Clone body to avoid modifying original
  const clone = document.body.cloneNode(true) as HTMLElement;

  // Remove script and style elements
  const scripts = clone.querySelectorAll('script, style, noscript');
  scripts.forEach((el) => el.remove());

  return clone.textContent?.trim() || '';
}

/**
 * Take a screenshot (requires Electron context or Canvas API)
 */
export async function takeScreenshot(
  _options: ScreenshotOptions = {},
  _document: Document = window.document
): Promise<string | null> {
  // This requires Electron's webContents.capturePage() or html2canvas
  // For now, return null - implement based on your architecture
  console.warn('[AgentPrimitives] Screenshot requires Electron context');
  return null;
}

/**
 * Scroll the page
 */
export async function scrollPage(
  direction: 'up' | 'down' | 'left' | 'right' | 'top' | 'bottom',
  amount?: number,
  options: ScrollOptions = {}
): Promise<void> {
  const scrollAmount = amount || window.innerHeight;
  const windowScroll = { x: 0, y: 0 };

  switch (direction) {
    case 'down':
      windowScroll.y = scrollAmount;
      break;
    case 'up':
      windowScroll.y = -scrollAmount;
      break;
    case 'right':
      windowScroll.x = scrollAmount;
      break;
    case 'left':
      windowScroll.x = -scrollAmount;
      break;
    case 'top':
      window.scrollTo({ top: 0, behavior: options.behavior || 'smooth' });
      return;
    case 'bottom':
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: options.behavior || 'smooth',
      });
      return;
  }

  window.scrollBy({
    left: windowScroll.x,
    top: windowScroll.y,
    behavior: options.behavior || 'smooth',
  });

  await new Promise((resolve) => setTimeout(resolve, options.behavior === 'smooth' ? 300 : 0));
}

/**
 * Wait for page to be ready
 */
export async function waitForPageReady(
  document: Document = window.document,
  timeout = 10000
): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve(true);
      return;
    }

    const startTime = Date.now();

    const check = () => {
      if (document.readyState === 'complete') {
        resolve(true);
        return;
      }

      if (Date.now() - startTime > timeout) {
        resolve(false);
        return;
      }

      setTimeout(check, 100);
    };

    document.addEventListener('DOMContentLoaded', () => resolve(true));
    window.addEventListener('load', () => resolve(true));

    check();
  });
}

/**
 * Get page information
 */
export function getPageInfo(document: Document = window.document): PageInfo {
  return {
    url: document.location.href,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    readyState: document.readyState,
  };
}

/**
 * Wait for URL to change (navigation detection)
 */
export async function waitForNavigation(
  currentUrl: string,
  timeout = 10000
): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const check = () => {
      if (window.location.href !== currentUrl) {
        resolve(true);
        return;
      }

      if (Date.now() - startTime > timeout) {
        resolve(false);
        return;
      }

      setTimeout(check, 100);
    };

    check();
  });
}

/**
 * Extract structured data from page (uses pageExtractor)
 */
export async function extractStructuredData(
  document: Document = window.document
): Promise<any> {
  try {
    const { extractPageContent } = await import('../../utils/pageExtractor');
    return extractPageContent(document);
  } catch (error) {
    console.error('[AgentPrimitives] Failed to extract structured data:', error);
    return null;
  }
}

/**
 * Save to memory (uses SuperMemory tracker)
 */
export async function saveToMemory(
  url: string,
  title: string,
  content?: string,
  metadata?: Record<string, any>
): Promise<string | null> {
  try {
    const { trackVisit } = await import('../supermemory/tracker');
    return await trackVisit(url, title, {
      ...metadata,
      contentPreview: content?.substring(0, 500),
    });
  } catch (error) {
    console.error('[AgentPrimitives] Failed to save to memory:', error);
    return null;
  }
}

