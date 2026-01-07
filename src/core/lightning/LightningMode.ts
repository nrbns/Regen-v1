/**
 * Lightning Mode - Feature #5
 * Speed booster with tracker/ad blocking
 */

export class LightningMode {
  private static enabled = false;
  private static blockedDomains = new Set<string>();
  private static blockedScripts = new Set<string>();

  static init() {
    // Load blocklists
    this.loadBlocklists();

    // Common trackers
    const commonTrackers = [
      'google-analytics.com',
      'googletagmanager.com',
      'facebook.net',
      'doubleclick.net',
      'adservice.google',
      'adsystem.amazon',
      'scorecardresearch.com',
      'quantserve.com',
    ];

    commonTrackers.forEach(domain => this.blockedDomains.add(domain));
  }

  static enable() {
    this.enabled = true;
    this.injectContentScript();
  }

  static disable() {
    this.enabled = false;
  }

  static isEnabled(): boolean {
    return this.enabled;
  }

  private static loadBlocklists() {
    // Load from localStorage or fetch from CDN
    const saved = localStorage.getItem('lightning-blocklist');
    if (saved) {
      try {
        const domains = JSON.parse(saved);
        domains.forEach((d: string) => this.blockedDomains.add(d));
      } catch {
        // Invalid data
      }
    }
  }

  private static injectContentScript() {
    // Inject blocking script into all tabs
    const script = `
      (function() {
        // Block trackers
        const blockedDomains = ${JSON.stringify(Array.from(this.blockedDomains))};
        
        // Intercept fetch
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          const url = args[0];
          if (typeof url === 'string') {
            const domain = new URL(url).hostname;
            if (blockedDomains.some(b => domain.includes(b))) {
              console.log('[Lightning] Blocked:', url);
              return Promise.reject(new Error('Blocked by Lightning Mode'));
            }
          }
          return originalFetch.apply(this, args);
        };

        // Block script tags
        const observer = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
              if (node.nodeName === 'SCRIPT') {
                const src = (node as HTMLScriptElement).src;
                if (src && blockedDomains.some(b => src.includes(b))) {
                  console.log('[Lightning] Blocked script:', src);
                  node.remove();
                }
              }
            });
          });
        });

        observer.observe(document.head, { childList: true, subtree: true });

        // Remove ads
        const adSelectors = [
          '[class*="ad"]',
          '[id*="ad"]',
          '[class*="advertisement"]',
          'iframe[src*="ads"]',
        ];

        const removeAds = () => {
          adSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
              if (el.textContent?.length < 100) { // Small elements likely ads
                el.remove();
              }
            });
          });
        };

        removeAds();
        setInterval(removeAds, 2000);
      })();
    `;

    // This would be injected via Tauri command or content script
    return script;
  }

  static shouldBlock(url: string): boolean {
    if (!this.enabled) return false;

    try {
      const domain = new URL(url).hostname;
      return Array.from(this.blockedDomains).some(blocked => domain.includes(blocked));
    } catch {
      return false;
    }
  }

  static addBlockedDomain(domain: string) {
    this.blockedDomains.add(domain);
    const list = Array.from(this.blockedDomains);
    localStorage.setItem('lightning-blocklist', JSON.stringify(list));
  }
}

// Auto-init
LightningMode.init();
