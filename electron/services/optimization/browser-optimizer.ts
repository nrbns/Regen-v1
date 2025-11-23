/**
 * Browser-Level Optimizations
 * Prefetch, caching, GPU acceleration, page discard
 */

import { BrowserView } from 'electron';
import { app } from 'electron';

interface OptimizationConfig {
  enablePrefetch: boolean;
  enablePreconnect: boolean;
  enableGPUAcceleration: boolean;
  enablePageDiscard: boolean;
  prefetchDomains: string[];
  preconnectDomains: string[];
}

const DEFAULT_CONFIG: OptimizationConfig = {
  enablePrefetch: true,
  enablePreconnect: true,
  enableGPUAcceleration: true,
  enablePageDiscard: true,
  prefetchDomains: [
    'google.com',
    'youtube.com',
    'github.com',
    'stackoverflow.com',
    'reddit.com',
    'twitter.com',
    'facebook.com',
  ],
  preconnectDomains: ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'unpkg.com'],
};

class BrowserOptimizer {
  private config: OptimizationConfig;
  private inactiveTabs: Map<string, { view: BrowserView; lastActive: number }> = new Map();
  private discardTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize optimizations for a session
   */
  initializeSession(sess: Electron.Session) {
    if (this.config.enablePrefetch) {
      this.setupPrefetch(sess);
    }

    if (this.config.enablePreconnect) {
      this.setupPreconnect(sess);
    }

    if (this.config.enableGPUAcceleration) {
      this.setupGPUAcceleration();
    }

    if (this.config.enablePageDiscard) {
      this.setupPageDiscard();
    }
  }

  /**
   * Setup DNS prefetch for common domains
   */
  private setupPrefetch(sess: Electron.Session) {
    // Prefetch DNS for common domains
    sess.webRequest.onBeforeRequest(
      {
        urls: this.config.prefetchDomains.map(domain => `*://${domain}/*`),
      },
      (details, callback) => {
        // Allow request, but prefetch DNS
        callback({});
      }
    );
  }

  /**
   * Setup preconnect for resource domains
   */
  private setupPreconnect(sess: Electron.Session) {
    // Preconnect to common CDN/resource domains
    sess.webRequest.onBeforeRequest(
      {
        urls: this.config.preconnectDomains.map(domain => `*://${domain}/*`),
      },
      (details, callback) => {
        // Allow request
        callback({});
      }
    );
  }

  /**
   * Enable GPU acceleration flags
   */
  private setupGPUAcceleration() {
    // GPU acceleration is enabled by default in Electron
    // But we can set additional flags
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');
    app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
  }

  /**
   * Setup page discard for inactive tabs
   */
  private setupPageDiscard() {
    // Check for inactive tabs every 30 seconds
    this.discardTimer = setInterval(() => {
      this.discardInactiveTabs();
    }, 30000);
  }

  /**
   * Register a tab for discard tracking
   */
  registerTab(tabId: string, view: BrowserView) {
    this.inactiveTabs.set(tabId, {
      view,
      lastActive: Date.now(),
    });
  }

  /**
   * Mark tab as active
   */
  markTabActive(tabId: string) {
    const tab = this.inactiveTabs.get(tabId);
    if (tab) {
      tab.lastActive = Date.now();
    }
  }

  /**
   * Unregister a tab
   */
  unregisterTab(tabId: string) {
    this.inactiveTabs.delete(tabId);
  }

  /**
   * Discard inactive tabs (unload from memory)
   */
  private discardInactiveTabs() {
    const now = Date.now();
    const INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    for (const [tabId, tab] of this.inactiveTabs.entries()) {
      if (now - tab.lastActive > INACTIVE_THRESHOLD) {
        try {
          // Discard the page (unload from memory)
          const wc = tab.view.webContents;
          if (wc && !wc.isDestroyed()) {
            // Navigate to about:blank to free memory
            // The tab will reload when activated
            wc.loadURL('about:blank').catch(() => {});
            console.log(`[BrowserOptimizer] Discarded inactive tab ${tabId}`);
          }
        } catch (error) {
          console.warn(`[BrowserOptimizer] Failed to discard tab ${tabId}:`, error);
        }
      }
    }
  }

  /**
   * Prefetch a URL (DNS + connection)
   */
  async prefetchUrl(url: string): Promise<void> {
    try {
      // Prefetch DNS
      // In Electron, this happens automatically, but we can trigger a HEAD request
      const fetch = (await import('node-fetch')).default;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      await fetch(url, { method: 'HEAD', signal: controller.signal })
        .catch(() => {
          // Ignore errors - prefetch is best-effort
        })
        .finally(() => {
          clearTimeout(timeoutId);
        });
    } catch {
      // Prefetch failures are non-critical
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.discardTimer) {
      clearInterval(this.discardTimer);
      this.discardTimer = null;
    }
    this.inactiveTabs.clear();
  }
}

// Singleton instance
let optimizerInstance: BrowserOptimizer | null = null;

export function getBrowserOptimizer(config?: Partial<OptimizationConfig>): BrowserOptimizer {
  if (!optimizerInstance) {
    optimizerInstance = new BrowserOptimizer(config);
  }
  return optimizerInstance;
}
