/**
 * Real-time Scraper Engine
 * Puppeteer/Playwright-based web scraping with AI summarization
 * This is the Perplexity/Qwen layer for Regen Browser
 */

const EventEmitter = require('events');
const Pino = require('pino');
const logger = Pino({ name: 'scraper-engine' });

// Try to load Puppeteer, fallback to Playwright if not available
let puppeteer = null;
let playwright = null;
let browserType = null;

try {
  puppeteer = require('puppeteer');
  browserType = 'puppeteer';
  logger.info('Puppeteer loaded successfully');
} catch (error) {
  logger.warn('Puppeteer not available, trying Playwright...');
  try {
    playwright = require('playwright');
    browserType = 'playwright';
    logger.info('Playwright loaded successfully');
  } catch (playwrightError) {
    logger.error('Neither Puppeteer nor Playwright available. Install one: npm install puppeteer OR npm install playwright');
    browserType = null;
  }
}

class ScraperEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      headless: true,
      timeout: 30000,
      maxConcurrent: 3,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      ...options,
    };
    this.browser = null;
    this.activePages = new Map(); // url -> page
    this.queue = [];
    this.processing = false;
    this.stats = {
      totalScrapes: 0,
      successful: 0,
      failed: 0,
      averageTime: 0,
    };
  }

  /**
   * Initialize browser instance
   */
  async initialize() {
    if (!browserType) {
      throw new Error('No browser automation library available. Install puppeteer or playwright.');
    }

    try {
      if (browserType === 'puppeteer') {
        this.browser = await puppeteer.launch({
          headless: this.options.headless,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
          ],
        });
      } else if (browserType === 'playwright') {
        const browser = await playwright.chromium.launch({
          headless: this.options.headless,
        });
        this.browser = browser;
      }

      logger.info({ browserType }, 'Browser initialized');
      this.emit('initialized');
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to initialize browser');
      throw error;
    }
  }

  /**
   * Scrape a URL and extract content
   */
  async scrape(url, options = {}) {
    const startTime = Date.now();
    const scrapeId = `scrape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    this.emit('scrape:start', { scrapeId, url });

    try {
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this._createPage();
      
      try {
        // Navigate to URL
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: this.options.timeout,
        });

        // Extract content
        const content = await this._extractContent(page, url);

        const duration = Date.now() - startTime;
        this.stats.totalScrapes++;
        this.stats.successful++;
        this._updateAverageTime(duration);

        this.emit('scrape:complete', { scrapeId, url, content, duration });

        return {
          success: true,
          scrapeId,
          url,
          content,
          duration,
        };
      } finally {
        await page.close();
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.stats.totalScrapes++;
      this.stats.failed++;

      logger.error({ url, error: error.message }, 'Scrape failed');

      this.emit('scrape:error', { scrapeId, url, error: error.message, duration });

      return {
        success: false,
        scrapeId,
        url,
        error: error.message,
        duration,
      };
    }
  }

  /**
   * Create a new page
   */
  async _createPage() {
    if (browserType === 'puppeteer') {
      const page = await this.browser.newPage();
      await page.setUserAgent(this.options.userAgent);
      await page.setViewport(this.options.viewport);
      return page;
    } else if (browserType === 'playwright') {
      const context = await this.browser.newContext({
        userAgent: this.options.userAgent,
        viewport: this.options.viewport,
      });
      return await context.newPage();
    }
  }

  /**
   * Extract content from page
   */
  async _extractContent(page, url) {
    if (browserType === 'puppeteer') {
      return await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style, noscript');
        scripts.forEach(el => el.remove());

        // Extract main content
        const main = document.querySelector('main, article, [role="main"]') || document.body;
        
        return {
          title: document.title,
          url: window.location.href,
          text: main.innerText || main.textContent || '',
          html: main.innerHTML,
          links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
            text: a.textContent?.trim(),
            href: a.href,
          })),
          images: Array.from(document.querySelectorAll('img[src]')).map(img => ({
            alt: img.alt,
            src: img.src,
          })),
          meta: {
            description: document.querySelector('meta[name="description"]')?.content || '',
            keywords: document.querySelector('meta[name="keywords"]')?.content || '',
            ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
            ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
            ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
          },
        };
      });
    } else if (browserType === 'playwright') {
      return await page.evaluate(() => {
        const scripts = document.querySelectorAll('script, style, noscript');
        scripts.forEach(el => el.remove());

        const main = document.querySelector('main, article, [role="main"]') || document.body;
        
        return {
          title: document.title,
          url: window.location.href,
          text: main.innerText || main.textContent || '',
          html: main.innerHTML,
          links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
            text: a.textContent?.trim(),
            href: a.href,
          })),
          images: Array.from(document.querySelectorAll('img[src]')).map(img => ({
            alt: img.alt,
            src: img.src,
          })),
          meta: {
            description: document.querySelector('meta[name="description"]')?.content || '',
            keywords: document.querySelector('meta[name="keywords"]')?.content || '',
            ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
            ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
            ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
          },
        };
      });
    }
  }

  /**
   * Summarize scraped content using AI
   */
  async summarize(content, options = {}) {
    try {
      const { getRAGPipeline } = require('../../search-engine/rag-pipeline.cjs');
      const pipeline = getRAGPipeline();

      // Use RAG pipeline to summarize
      const summary = await pipeline.summarize(content.text || content.html, {
        maxLength: options.maxLength || 500,
        includeSources: true,
      });

      return {
        success: true,
        summary: summary.text || summary.summary,
        keyPoints: summary.keyPoints || [],
        sources: summary.sources || [],
      };
    } catch (error) {
      logger.error({ error: error.message }, 'Summarization failed');
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process research query (scrape multiple URLs and synthesize)
   */
  async processResearchQuery(query, urls, options = {}) {
    const startTime = Date.now();
    const results = [];

    this.emit('research:start', { query, urls });

    // Scrape all URLs in parallel (with concurrency limit)
    const chunks = [];
    for (let i = 0; i < urls.length; i += this.options.maxConcurrent) {
      chunks.push(urls.slice(i, i + this.options.maxConcurrent));
    }

    for (const chunk of chunks) {
      const scrapePromises = chunk.map(url => this.scrape(url));
      const chunkResults = await Promise.allSettled(scrapePromises);
      
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          results.push(result.value);
        }
      });
    }

    // Synthesize results
    const synthesized = await this._synthesizeResults(query, results);

    const duration = Date.now() - startTime;
    this.emit('research:complete', { query, results, synthesized, duration });

    return {
      success: true,
      query,
      results,
      synthesized,
      duration,
    };
  }

  /**
   * Synthesize multiple scraped results into a coherent answer
   */
  async _synthesizeResults(query, results) {
    try {
      const { getRAGPipeline } = require('../../search-engine/rag-pipeline.cjs');
      const pipeline = getRAGPipeline();

      // Combine all text content
      const combinedText = results
        .map(r => r.content?.text || '')
        .filter(Boolean)
        .join('\n\n---\n\n');

      // Generate synthesis
      const synthesis = await pipeline.answer(query, {
        context: combinedText,
        sources: results.map(r => ({
          url: r.url,
          title: r.content?.title || r.url,
          snippet: r.content?.text?.substring(0, 200) || '',
        })),
      });

      return {
        answer: synthesis.answer || synthesis.text,
        sources: synthesis.sources || results.map(r => ({
          url: r.url,
          title: r.content?.title || r.url,
        })),
        confidence: synthesis.confidence || 0.8,
      };
    } catch (error) {
      logger.error({ error: error.message }, 'Synthesis failed');
      return {
        answer: 'Unable to synthesize results at this time.',
        sources: results.map(r => ({ url: r.url, title: r.content?.title || r.url })),
        confidence: 0.5,
      };
    }
  }

  /**
   * Update average processing time
   */
  _updateAverageTime(duration) {
    const total = this.stats.totalScrapes;
    this.stats.averageTime = (this.stats.averageTime * (total - 1) + duration) / total;
  }

  /**
   * Get statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      if (browserType === 'puppeteer') {
        await this.browser.close();
      } else if (browserType === 'playwright') {
        await this.browser.close();
      }
      this.browser = null;
      logger.info('Browser closed');
    }
  }
}

// Singleton instance
let scraperInstance = null;

function getScraperEngine(options) {
  if (!scraperInstance) {
    scraperInstance = new ScraperEngine(options);
  }
  return scraperInstance;
}

module.exports = {
  ScraperEngine,
  getScraperEngine,
};




