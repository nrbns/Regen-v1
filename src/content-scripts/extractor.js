/**
 * Content Script Extractor
 * Injected at document_start to extract page content
 * Publishes to realtime bus via postMessage bridge
 * PR: Content extraction foundation
 */

(function () {
  'use strict';

  // Configuration
  const CONFIG = {
    extractInterval: 1000, // Extract every 1s
    maxContentLength: 50000, // Max 50KB
    enableScreenshots: false, // Screenshots disabled by default
  };

  // State
  let extractTimer = null;
  let lastExtract = null;
  let requestId = null;

  /**
   * Extract page content
   */
  function extractContent() {
    try {
      const content = {
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
        text: extractText(),
        links: extractLinks(),
        images: extractImages(),
        forms: extractForms(),
        metadata: extractMetadata(),
      };

      // Only send if changed
      const contentHash = hashContent(content);
      if (contentHash !== lastExtract) {
        lastExtract = contentHash;
        publishExtraction(content);
      }
    } catch (error) {
      console.error('[Extractor] Extraction error:', error);
    }
  }

  /**
   * Extract main text content
   */
  function extractText() {
    // Remove script and style elements
    const clone = document.cloneNode(true);
    const scripts = clone.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());

    // Get text content
    const body = clone.body || clone.documentElement;
    let text = body.innerText || body.textContent || '';

    // Clean up
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Limit length
    if (text.length > CONFIG.maxContentLength) {
      text = text.substring(0, CONFIG.maxContentLength) + '...';
    }

    return text;
  }

  /**
   * Extract links
   */
  function extractLinks() {
    const links = Array.from(document.querySelectorAll('a[href]'))
      .slice(0, 50) // Limit to 50 links
      .map(a => ({
        url: a.href,
        text: (a.textContent || '').trim().slice(0, 100),
        title: a.title || null,
      }))
      .filter(link => link.url && !link.url.startsWith('javascript:'));

    return links;
  }

  /**
   * Extract images
   */
  function extractImages() {
    const images = Array.from(document.querySelectorAll('img[src]'))
      .slice(0, 20) // Limit to 20 images
      .map(img => ({
        src: img.src,
        alt: img.alt || null,
        title: img.title || null,
      }))
      .filter(img => img.src);

    return images;
  }

  /**
   * Extract forms
   */
  function extractForms() {
    const forms = Array.from(document.querySelectorAll('form')).map(form => ({
      action: form.action || null,
      method: form.method || 'get',
      inputs: Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
        type: input.type || input.tagName.toLowerCase(),
        name: input.name || null,
        placeholder: input.placeholder || null,
      })),
    }));

    return forms;
  }

  /**
   * Extract metadata
   */
  function extractMetadata() {
    const meta = {};

    // Meta tags
    document.querySelectorAll('meta').forEach(tag => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (name && content) {
        meta[name] = content;
      }
    });

    // Open Graph
    const og = {};
    document.querySelectorAll('meta[property^="og:"]').forEach(tag => {
      const prop = tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (prop && content) {
        og[prop] = content;
      }
    });
    if (Object.keys(og).length > 0) {
      meta.og = og;
    }

    return meta;
  }

  /**
   * Hash content for change detection
   */
  function hashContent(content) {
    const str = JSON.stringify({
      url: content.url,
      title: content.title,
      textLength: content.text.length,
      linkCount: content.links.length,
    });

    // Simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Publish extraction to bridge
   */
  function publishExtraction(content) {
    // Send to parent window (Tauri bridge)
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'regen:extract',
          data: {
            requestId: requestId || `extract-${Date.now()}`,
            content,
          },
        },
        '*'
      );
    }

    // Also send to same window (for direct injection)
    window.postMessage(
      {
        type: 'regen:extract',
        data: {
          requestId: requestId || `extract-${Date.now()}`,
          content,
        },
      },
      '*'
    );
  }

  /**
   * Handle messages from bridge
   */
  window.addEventListener('message', event => {
    if (event.data && event.data.type === 'regen:extract:start') {
      requestId = event.data.requestId;
      extractContent(); // Immediate extract
    } else if (event.data && event.data.type === 'regen:extract:stop') {
      if (extractTimer) {
        clearInterval(extractTimer);
        extractTimer = null;
      }
    }
  });

  /**
   * Start periodic extraction
   */
  function start() {
    // Initial extract
    extractContent();

    // Periodic extraction
    extractTimer = setInterval(extractContent, CONFIG.extractInterval);
  }

  /**
   * Initialize
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Also extract on navigation (SPA)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(extractContent, 500); // Wait for page to settle
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
