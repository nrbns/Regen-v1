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
    const urlStr = typeof resource === 'string' ? resource : (resource as any).url;

    const engine = getAdblockerEngine();
    const shouldBlockRequest = engine.shouldBlock({
      url: urlStr,
      type: (init?.method as string) || 'GET',
    });

    if (shouldBlockRequest.isBlocked) {
      // Record block in stats
      const storage = getAdblockerStorage();
      const stats = (await storage.loadStats()) || {
        blockedCount: 0,
        lastUpdated: Date.now(),
      };

      stats.blockedCount++;
      stats.lastUpdated = Date.now();
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

    return originalFetch.apply(this, args as any);
  };
}

/**
 * Intercept XMLHttpRequest
 */
export function interceptXHR(): void {
  const OriginalXHR = window.XMLHttpRequest;

  window.XMLHttpRequest = class extends OriginalXHR {
    private _readyState = 0;
    private _status = 0;
    private _statusText = '';

    get readyState() {
      return this._readyState;
    }
    get status() {
      return this._status;
    }
    get statusText() {
      return this._statusText;
    }

    open(method: string, url: string | URL, ...args: any[]): void {
      const urlString = typeof url === 'string' ? url : url.toString();
      const engine = getAdblockerEngine();
      const shouldBlockRequest = engine.shouldBlock({
        url: urlString,
        type: method,
      });

      if (shouldBlockRequest.isBlocked) {
        // Block the request by overriding send
        this.send = function () {
          // Request blocked - do nothing
          (this as any)._readyState = 4;
          (this as any)._status = 200;
          (this as any)._statusText = 'OK';
          if ((this as any).onload) {
            (this as any).onload(new Event('load'));
          }
        };
        return;
      }

      const [asyncOrUndefined, userOrUndefined, passwordOrUndefined] = args as any[];
      super.open(method, url as any, asyncOrUndefined, userOrUndefined, passwordOrUndefined);
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
            const shouldBlockRequest = engine.shouldBlock({
              url: src,
              type: 'script',
            });

            if (shouldBlockRequest.isBlocked) {
              // Remove the script
              script.remove();
            }
          }
        } else if (node.nodeName === 'IMG') {
          const img = node as HTMLImageElement;
          const src = img.src;

          if (src) {
            const engine = getAdblockerEngine();
            const shouldBlockRequest = engine.shouldBlock({
              url: src,
              type: 'image',
            });

            if (shouldBlockRequest.isBlocked) {
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
