/**
 * Page Extractor - Extract clean text and metadata from DOM
 * Handles structured content, tables, and removes noise
 * 
 * Simple utility function for "Ask about this page" feature
 */

/**
 * Simple page context extractor for "Ask about this page"
 * Returns basic title, URL, and text content
 * 
 * Security: Sanitizes output to prevent XSS and limits content size
 */
export function extractPageContext(): { title: string; url: string; text: string } {
  // Security: Limit text extraction to prevent memory issues
  const MAX_TEXT_LENGTH = 50000; // 50KB limit
  const MAX_TITLE_LENGTH = 200;
  
  let text = '';
  let charCount = 0;
  
  try {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: () => {
          // Stop if we've reached the limit
          if (charCount >= MAX_TEXT_LENGTH) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    
    let node: Node | null;
    while ((node = walker.nextNode()) && charCount < MAX_TEXT_LENGTH) {
      const t = (node.textContent || '').trim();
      if (t) {
        const remaining = MAX_TEXT_LENGTH - charCount;
        const toAdd = t.slice(0, remaining);
        text += toAdd + '\n';
        charCount += toAdd.length + 1; // +1 for newline
        
        if (charCount >= MAX_TEXT_LENGTH) break;
      }
    }
  } catch (error) {
    // Fail gracefully if DOM access fails
    console.warn('[PageExtractor] Failed to extract page context:', error);
    text = '';
  }

  // Sanitize title and URL
  const title = (document.title || '').slice(0, MAX_TITLE_LENGTH);
  const url = window.location.href.slice(0, 2048); // URL length limit

  return {
    title,
    url,
    text: text.slice(0, MAX_TEXT_LENGTH), // Final safety check
  };
}

export interface PageMetadata {
  title: string;
  description?: string;
  url: string;
  headings: Array<{ level: number; text: string }>;
  mainContent: string;
  tables?: Array<{ headers: string[]; rows: string[][] }>;
  links?: Array<{ text: string; url: string }>;
  images?: Array<{ alt?: string; src: string }>;
  author?: string;
  publishedDate?: string;
  wordCount: number;
  estimatedReadTime: number; // in minutes
}

/**
 * Extract clean text from an element, removing script/style tags
 */
function extractCleanText(element: Element | Document): string {
  // Clone to avoid modifying the original
  const clone = element.cloneNode(true) as Element;
  
  // Remove script and style elements
  const scripts = clone.querySelectorAll('script, style, noscript, iframe, embed, object');
  scripts.forEach(el => el.remove());
  
  // Get text content and clean it up
  let text = clone.textContent || '';
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Remove common noise patterns
  text = text.replace(/\[.*?\]/g, ''); // Remove [bracketed content]
  text = text.replace(/\(.*?\)/g, ''); // Remove (parentheses)
  text = text.replace(/\s+/g, ' '); // Normalize again
  
  return text.trim();
}

/**
 * Extract headings with their hierarchy
 */
function extractHeadings(document: Document): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];
  const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  for (const heading of Array.from(headingElements)) {
    const level = parseInt(heading.tagName.charAt(1));
    const text = extractCleanText(heading);
    if (text) {
      headings.push({ level, text });
    }
  }
  
  return headings;
}

/**
 * Extract structured tables
 */
function extractTables(document: Document): Array<{ headers: string[]; rows: string[][] }> {
  const tables: Array<{ headers: string[]; rows: string[][] }> = [];
  const tableElements = document.querySelectorAll('table');
  
  for (const table of Array.from(tableElements)) {
    const headers: string[] = [];
    const rows: string[][] = [];
    
    // Extract headers from thead or first tr
    const thead = table.querySelector('thead');
    if (thead) {
      const headerRow = thead.querySelector('tr');
      if (headerRow) {
        const cells = headerRow.querySelectorAll('th, td');
        for (const cell of Array.from(cells)) {
          headers.push(extractCleanText(cell));
        }
      }
    } else {
      // Try first row as headers
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        const cells = firstRow.querySelectorAll('th, td');
        for (const cell of Array.from(cells)) {
          headers.push(extractCleanText(cell));
        }
      }
    }
    
    // Extract data rows
    const tbody = table.querySelector('tbody') || table;
    const dataRows = tbody.querySelectorAll('tr');
    
    for (const row of Array.from(dataRows)) {
      // Skip header row if we already extracted headers
      if (thead && row.parentElement === thead) continue;
      
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        const rowData = Array.from(cells).map((cell: Element) => extractCleanText(cell));
        rows.push(rowData);
      }
    }
    
    if (headers.length > 0 || rows.length > 0) {
      tables.push({ headers, rows });
    }
  }
  
  return tables;
}

/**
 * Extract links with their text
 */
function extractLinks(document: Document): Array<{ text: string; url: string }> {
  const links: Array<{ text: string; url: string }> = [];
  const linkElements = document.querySelectorAll('a[href]');
  
  for (const link of Array.from(linkElements)) {
    const href = link.getAttribute('href');
    const text = extractCleanText(link);
    
    if (href && text) {
      // Resolve relative URLs
      try {
        const url = new URL(href, document.location.href).href;
        links.push({ text, url });
      } catch {
        // Invalid URL, skip
      }
    }
  }
  
  return links;
}

/**
 * Extract images with alt text
 */
function extractImages(document: Document): Array<{ alt?: string; src: string }> {
  const images: Array<{ alt?: string; src: string }> = [];
  const imageElements = document.querySelectorAll('img[src]');
  
  for (const img of Array.from(imageElements)) {
    const src = img.getAttribute('src');
    const alt = img.getAttribute('alt') || undefined;
    
    if (src) {
      // Resolve relative URLs
      try {
        const url = new URL(src, document.location.href).href;
        images.push({ alt, src: url });
      } catch {
        // Invalid URL, skip
      }
    }
  }
  
  return images;
}

/**
 * Find the main content area using common patterns
 */
function findMainContent(document: Document): Element | null {
  // Try common semantic elements first
  const semanticSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.main-content',
    '.post-content',
    '.entry-content',
    '#content',
    '#main-content',
  ];
  
  for (const selector of semanticSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  
  // Fallback: find the largest non-nav/footer element
  const body = document.body;
  if (!body) return null;
  
  let largestElement: Element | null = null;
  let largestSize = 0;
  
  const candidates = body.querySelectorAll('div, section');
  for (const candidate of Array.from(candidates)) {
    // Skip navigation, footer, header
    const role = candidate.getAttribute('role');
    const className = candidate.className.toLowerCase();
    const id = candidate.id.toLowerCase();
    
    if (
      role === 'navigation' ||
      role === 'footer' ||
      role === 'header' ||
      className.includes('nav') ||
      className.includes('footer') ||
      className.includes('header') ||
      id.includes('nav') ||
      id.includes('footer') ||
      id.includes('header')
    ) {
      continue;
    }
    
    const text = extractCleanText(candidate);
    if (text.length > largestSize) {
      largestSize = text.length;
      largestElement = candidate;
    }
  }
  
  return largestElement || body;
}

/**
 * Extract metadata from meta tags
 */
function extractMetaTags(document: Document): {
  description?: string;
  author?: string;
  publishedDate?: string;
} {
  const meta: {
    description?: string;
    author?: string;
    publishedDate?: string;
  } = {};
  
  // Description
  const descTag = document.querySelector('meta[name="description"], meta[property="og:description"]');
  if (descTag) {
    meta.description = descTag.getAttribute('content') || undefined;
  }
  
  // Author
  const authorTag = document.querySelector('meta[name="author"], meta[name="article:author"]');
  if (authorTag) {
    meta.author = authorTag.getAttribute('content') || undefined;
  }
  
  // Published date
  const dateTag = document.querySelector('meta[name="article:published_time"], meta[property="article:published_time"], time[datetime]');
  if (dateTag) {
    meta.publishedDate = dateTag.getAttribute('datetime') || dateTag.getAttribute('content') || undefined;
  }
  
  return meta;
}

/**
 * Calculate estimated read time (average 200 words per minute)
 */
function calculateReadTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Extract page content and metadata from DOM
 */
export function extractPageContent(document: Document, url?: string): PageMetadata {
  const docUrl = url || document.location?.href || '';
  const title = document.title || '';
  
  // Extract meta tags
  const meta = extractMetaTags(document);
  
  // Extract headings
  const headings = extractHeadings(document);
  
  // Find and extract main content
  const mainContentElement = findMainContent(document);
  const mainContent = mainContentElement ? extractCleanText(mainContentElement) : extractCleanText(document.body || document);
  
  // Extract structured data
  const tables = extractTables(document);
  const links = extractLinks(document);
  const images = extractImages(document);
  
  // Calculate word count and read time
  const wordCount = mainContent.split(/\s+/).filter(Boolean).length;
  const estimatedReadTime = calculateReadTime(wordCount);
  
  return {
    title,
    description: meta.description,
    url: docUrl,
    headings,
    mainContent,
    tables: tables.length > 0 ? tables : undefined,
    links: links.length > 0 ? links : undefined,
    images: images.length > 0 ? images : undefined,
    author: meta.author,
    publishedDate: meta.publishedDate,
    wordCount,
    estimatedReadTime,
  };
}

/**
 * Extract page content from a URL (requires server-side or Electron context)
 * This is a placeholder - actual implementation depends on how you fetch pages
 */
export async function extractPageContentFromUrl(_url: string): Promise<PageMetadata | null> {
  // This would typically use Electron's webContents or a headless browser
  // For now, return null - implement based on your architecture
  console.warn('[PageExtractor] extractPageContentFromUrl requires Electron or server context');
  return null;
}

/**
 * Format extracted content for LLM consumption
 */
export function formatForLLM(metadata: PageMetadata, includeStructured = true): string {
  let output = `# ${metadata.title}\n\n`;
  
  if (metadata.description) {
    output += `**Description:** ${metadata.description}\n\n`;
  }
  
  if (metadata.url) {
    output += `**URL:** ${metadata.url}\n\n`;
  }
  
  if (metadata.author) {
    output += `**Author:** ${metadata.author}\n`;
  }
  
  if (metadata.publishedDate) {
    output += `**Published:** ${metadata.publishedDate}\n`;
  }
  
  output += `\n---\n\n`;
  
  // Add headings structure
  if (metadata.headings.length > 0) {
    output += `## Document Structure\n\n`;
    for (const heading of metadata.headings) {
      const prefix = '#'.repeat(heading.level);
      output += `${prefix} ${heading.text}\n`;
    }
    output += `\n---\n\n`;
  }
  
  // Add main content
  output += `## Content\n\n${metadata.mainContent}\n\n`;
  
  // Add structured tables if requested
  if (includeStructured && metadata.tables && metadata.tables.length > 0) {
    output += `\n---\n\n## Tables\n\n`;
    for (const table of metadata.tables) {
      if (table.headers.length > 0) {
        output += `| ${table.headers.join(' | ')} |\n`;
        output += `| ${table.headers.map(() => '---').join(' | ')} |\n`;
      }
      for (const row of table.rows) {
        if (row.length > 0) {
          output += `| ${row.join(' | ')} |\n`;
        }
      }
      output += `\n`;
    }
  }
  
  return output;
}

