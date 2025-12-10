/**
 * Scrape Handler Content Script
 * Listens for scrape commands from parent window and executes them
 * Injected into iframe tabs for live DOM scraping
 */

(function () {
  'use strict';

  // Listen for scrape commands from parent
  window.addEventListener('message', event => {
    // Security: Only accept messages from same origin or trusted source
    if (event.data?.type === 'scrape:execute') {
      try {
        // Execute the scrape script
        const scrapeScript = event.data.script;
        const result = eval(`(${scrapeScript})()`);

        // Send result back to parent
        window.parent.postMessage(
          {
            type: 'scrape:result',
            result: result,
          },
          '*'
        );
      } catch (error) {
        // Send error back
        window.parent.postMessage(
          {
            type: 'scrape:result',
            result: {
              url: window.location.href,
              title: document.title || '',
              content: '',
              text: '',
              error: error.message,
              timestamp: Date.now(),
              success: false,
            },
          },
          '*'
        );
      }
    }
  });

  // Also expose a global function for direct access (same-origin only)
  if (typeof window.browserScrape === 'undefined') {
    window.browserScrape = function () {
      try {
        const title = document.title || '';
        const text = document.body?.innerText || document.body?.textContent || '';
        const html = document.documentElement.outerHTML || '';

        const images = Array.from(document.querySelectorAll('img'))
          .map(img => img.src || img.getAttribute('data-src'))
          .filter(Boolean);

        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({
            text: a.textContent?.trim() || '',
            url: a.href || '',
          }))
          .filter(l => l.url && l.url.startsWith('http'));

        return {
          url: window.location.href,
          title,
          content: text.substring(0, 50000),
          text: text.substring(0, 50000),
          html: html.substring(0, 200000),
          images: images.slice(0, 20),
          links: links.slice(0, 50),
          timestamp: Date.now(),
          success: true,
        };
      } catch (e) {
        return {
          url: window.location.href,
          title: document.title || '',
          content: '',
          text: '',
          error: e.message,
          timestamp: Date.now(),
          success: false,
        };
      }
    };
  }
})();
