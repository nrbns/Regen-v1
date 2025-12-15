/**
 * Request Interceptor
 * Intercepts network requests to block ads
 */

import { getAdblockerEngine } from './engine';
import { getAdblockerStorage } from './storage';

/**
 * Intercept fetch requests
 */
export function interceptFetch(): void {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const [resource, init] = args;
    const url = typeof resource === 'string' ? resource : resource.url;

    const engine = getAdblockerEngine();
    const request = engine.shouldBlock({
      url,
      type: init?.method || 'GET',
    });

    if (request.blocked) {
      // Record block in stats
      const storage = getAdblockerStorage();
      const stats = (await storage.loadStats()) || {
        totalBlocked: 0,
        blockedByType: {},
        blockedByList: {},
      };

      stats.totalBlocked++;
      stats.blockedByType[request.type] = (stats.blockedByType[request.type] || 0) + 1;
      await storage.saveStats(stats);

      // Return empty response instead of blocking
      return new Response(null, {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    return originalFetch.apply(this, args);
  };
}

/**
 * Intercept XMLHttpRequest
 */
export function interceptXHR(): void {
  const OriginalXHR = window.XMLHttpRequest;

  window.XMLHttpRequest = class extends OriginalXHR {
    open(method: string, url: string | URL, ...args: any[]): void {
      const urlString = typeof url === 'string' ? url : url.toString();
      const engine = getAdblockerEngine();
      const request = engine.shouldBlock({
        url: urlString,
        type: method,
      });

      if (request.blocked) {
        // Block the request by overriding send
        this.send = function () {
          // Request blocked - do nothing
          this.readyState = 4;
          this.status = 200;
          this.statusText = 'OK';
          if (this.onload) {
            this.onload(new Event('load'));
          }
        };
        return;
      }

      super.open(method, url, ...args);
    }
  } as any;
}

/**
 * Block script tags
 */
export function interceptScripts(): void {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeName === 'SCRIPT') {
          const script = node as HTMLScriptElement;
          const src = script.src;

          if (src) {
            const engine = getAdblockerEngine();
            const request = engine.shouldBlock({
              url: src,
              type: 'script',
            });

            if (request.blocked) {
              // Remove the script
              script.remove();
            }
          }
        } else if (node.nodeName === 'IMG') {
          const img = node as HTMLImageElement;
          const src = img.src;

          if (src) {
            const engine = getAdblockerEngine();
            const request = engine.shouldBlock({
              url: src,
              type: 'image',
            });

            if (request.blocked) {
              // Replace with placeholder or remove
              img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
              img.style.display = 'none';
            }
          }
        }
      });
    });
  });

  observer.observe(document, {
    childList: true,
    subtree: true,
  });
}

/**
 * Initialize all interceptors
 */
export function initializeInterceptors(): void {
  interceptFetch();
  interceptXHR();
  interceptScripts();
}
