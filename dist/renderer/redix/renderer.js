/**
 * RedixContentRenderer - AI-Rendered Content (No iframes)
 *
 * Fetches, extracts, and renders web content as structured HTML.
 * Uses AI to process and summarize content instead of loading raw pages.
 */
export class RedixContentRenderer {
    pool;
    ai;
    constructor(pool, ai) {
        this.pool = pool;
        this.ai = ai;
    }
    /**
     * Render a URL as AI-processed content
     */
    async renderURL(url, container) {
        try {
            // 1. Fetch content
            const content = await this.fetchContent(url);
            // 2. Extract readable content
            const extracted = this.extractReadable(content, url);
            // 3. Process with AI (summarize, extract key points)
            const processed = await this.ai.processContent(extracted);
            // 4. Render as structured HTML
            const element = this.pool.getDiv();
            element.className = 'redix-content';
            element.innerHTML = this.buildContentHTML(processed);
            container.appendChild(element);
        }
        catch (error) {
            console.error('[RedixRenderer] Render failed:', error);
            throw error;
        }
    }
    /**
     * Fetch content from URL
     */
    async fetchContent(url) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'RedixBrowser/1.0',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        }
        catch (error) {
            console.error('[RedixRenderer] Fetch failed:', error);
            throw new Error(`Failed to fetch ${url}`);
        }
    }
    /**
     * Extract readable content from HTML
     */
    extractReadable(html, url) {
        // Simple extraction (in production, use Readability or similar)
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Extract title
        const title = doc.querySelector('title')?.textContent ||
            doc.querySelector('h1')?.textContent ||
            new URL(url).hostname;
        // Extract main content (prefer article, main, or body)
        const mainContent = doc.querySelector('article') ||
            doc.querySelector('main') ||
            doc.querySelector('body');
        // Remove scripts, styles, and other non-content elements
        const scripts = mainContent?.querySelectorAll('script, style, nav, header, footer, aside, .ad, .advertisement');
        scripts?.forEach(el => el.remove());
        const text = mainContent?.textContent || '';
        const htmlContent = mainContent?.innerHTML || '';
        return {
            title: title.trim(),
            text: text.trim().substring(0, 10000), // Limit text length
            html: htmlContent,
        };
    }
    /**
     * Build HTML for rendered content
     */
    buildContentHTML(content) {
        return `
      <article class="redix-content-article">
        <header class="redix-content-header">
          <h1 class="redix-content-title">${this.escapeHtml(content.title)}</h1>
          <div class="redix-content-meta">
            <span class="redix-content-domain">${this.escapeHtml(content.domain)}</span>
            ${content.date ? `<span class="redix-content-date">${this.escapeHtml(content.date)}</span>` : ''}
            ${content.author ? `<span class="redix-content-author">${this.escapeHtml(content.author)}</span>` : ''}
          </div>
        </header>
        
        ${content.summary ? `
          <div class="redix-content-summary">
            <h2>Summary</h2>
            <p>${this.escapeHtml(content.summary)}</p>
          </div>
        ` : ''}
        
        <div class="redix-content-body">
          ${this.sanitizeHTML(content.body)}
        </div>
        
        ${content.sources.length > 0 ? `
          <footer class="redix-content-footer">
            <h3>Sources</h3>
            <ul class="redix-content-sources">
              ${content.sources.map(source => `
                <li>
                  <a href="${this.escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">
                    ${this.escapeHtml(source.title)}
                  </a>
                </li>
              `).join('')}
            </ul>
          </footer>
        ` : ''}
      </article>
    `;
    }
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    /**
     * Sanitize HTML content (basic - in production use DOMPurify)
     */
    sanitizeHTML(html) {
        // Basic sanitization - remove script tags and dangerous attributes
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .replace(/on\w+='[^']*'/gi, '')
            .replace(/javascript:/gi, '');
    }
}
