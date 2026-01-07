/**
 * DOM Analyzer - Extracts structured snapshot of page for safe agent actions
 * PR: Agent system core component
 */

export interface ElementSnapshot {
  id: string;
  tag: string;
  text?: string;
  selector: string;
  attributes: Record<string, string>;
  bounds?: { x: number; y: number; width: number; height: number };
  visible: boolean;
  interactive: boolean;
}

export interface PageSnapshot {
  url: string;
  title: string;
  timestamp: number;
  elements: ElementSnapshot[];
  content: string;
  metadata: {
    elementCount: number;
    interactiveCount: number;
    formCount: number;
    linkCount: number;
  };
}

/**
 * Generate a stable CSS selector for an element
 */
function generateSelector(element: Element): string {
  // Try ID first
  if (element.id) {
    return `#${element.id}`;
  }

  // Try data-testid or data-cy
  const testId = element.getAttribute('data-testid') || element.getAttribute('data-cy');
  if (testId) {
    return `[data-testid="${testId}"]`;
  }

  // Try class name (if unique)
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(Boolean);
    if (classes.length > 0) {
      const classSelector = `.${classes[0]}`;
      const matches = document.querySelectorAll(classSelector);
      if (matches.length === 1) {
        return classSelector;
      }
    }
  }

  // Fallback to tag + nth-child
  let path: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    }

    let sibling = current;
    let nth = 1;
    while (sibling.previousElementSibling) {
      sibling = sibling.previousElementSibling;
      if (sibling.tagName === current.tagName) {
        nth++;
      }
    }

    if (nth > 1) {
      selector += `:nth-of-type(${nth})`;
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * Check if element is interactive
 */
function isInteractive(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'details', 'summary'];
  
  if (interactiveTags.includes(tag)) {
    return true;
  }

  // Check for role attributes
  const role = element.getAttribute('role');
  if (role && ['button', 'link', 'tab', 'menuitem'].includes(role)) {
    return true;
  }

  // Check for event handlers (simplified)
  const hasClick = !!(element.getAttribute('onclick') || 
                   element.getAttribute('data-action') ||
                   (element instanceof HTMLElement && window.getComputedStyle(element).cursor === 'pointer'));

  return hasClick;
}

/**
 * Analyze DOM and extract structured snapshot
 */
export function analyzeDOM(doc: Document = window.document): PageSnapshot {
  const url = doc.location?.href || window.location.href;
  const title = doc.title || 'Untitled';
  const timestamp = Date.now();

  const elements: ElementSnapshot[] = [];
  const allElements = doc.querySelectorAll('*');
  const textContent: string[] = [];

  let formCount = 0;
  let linkCount = 0;

  allElements.forEach((element, index) => {
    // Skip script, style, and hidden elements
    const tag = element.tagName.toLowerCase();
    if (['script', 'style', 'meta', 'link', 'noscript'].includes(tag)) {
      return;
    }

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return;
    }

    // Extract text content (first 200 chars)
    const text = element.textContent?.trim().slice(0, 200) || '';
    if (text && text.length > 10) {
      textContent.push(text);
    }

    // Generate selector
    const selector = generateSelector(element);

    // Extract attributes
    const attributes: Record<string, string> = {};
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-') || 
          ['id', 'class', 'type', 'name', 'value', 'href', 'src', 'alt', 'title'].includes(attr.name)) {
        attributes[attr.name] = attr.value;
      }
    });

    // Get bounds
    const rect = element.getBoundingClientRect();
    const bounds = {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };

    const interactive = isInteractive(element);
    const visible = rect.width > 0 && rect.height > 0;

    if (tag === 'form') formCount++;
    if (tag === 'a') linkCount++;

    elements.push({
      id: `elem-${index}`,
      tag,
      text: text || undefined,
      selector,
      attributes,
      bounds,
      visible,
      interactive,
    });
  });

  const interactiveCount = elements.filter(e => e.interactive).length;

  return {
    url,
    title,
    timestamp,
    elements,
    content: textContent.join(' ').slice(0, 5000), // First 5000 chars
    metadata: {
      elementCount: elements.length,
      interactiveCount,
      formCount,
      linkCount,
    },
  };
}

/**
 * Find element by selector (with fallback strategies)
 */
export function findElementBySelector(
  selector: string,
  snapshot?: PageSnapshot,
  doc: Document = window.document
): Element | null {
  // Try direct query
  try {
    const element = doc.querySelector(selector);
    if (element) {
      return element;
    }
  } catch (e) {
    console.warn('[domAnalyzer] Invalid selector:', selector, e);
  }

  // Fallback: Use snapshot context
  if (snapshot) {
    const snapshotElement = snapshot.elements.find(e => e.selector === selector);
    if (snapshotElement) {
      // Try to find by ID or other attributes
      if (snapshotElement.attributes.id) {
        const byId = doc.getElementById(snapshotElement.attributes.id);
        if (byId) return byId;
      }

      // Try by text content
      if (snapshotElement.text) {
        const allElements = doc.querySelectorAll(snapshotElement.tag);
        for (const elem of Array.from(allElements)) {
          if (elem.textContent?.trim().includes(snapshotElement.text.slice(0, 50))) {
            return elem;
          }
        }
      }
    }
  }

  return null;
}
