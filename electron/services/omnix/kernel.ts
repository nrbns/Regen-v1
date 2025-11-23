/**
 * OmniKernel - Unified API for all OmniBrowser modes
 * Provides consistent interface: omnix.browser, omnix.scrape, omnix.ai, etc.
 */

import { BrowserWindow } from 'electron';
// Note: These imports are for Node.js backend, not available in Electron main process
// import { enqueueScrape } from '../../server/services/queue/queue';
// import { analyzeWithLLM } from '../../server/services/agent/llm';

export interface OmniKernel {
  browser: {
    getPage(): Promise<{ url: string; title: string; html?: string; text?: string } | null>;
    getActiveTab(): Promise<{ id: string; url: string; title: string } | null>;
    captureSnapshot(
      url?: string
    ): Promise<{ url: string; title: string; html: string; text: string }>;
  };
  scrape: {
    fetch(
      url: string,
      options?: { timeout?: number; cache?: boolean }
    ): Promise<{ body: string; status: number; headers: Record<string, string> }>;
    enqueue(url: string): Promise<{ jobId: string }>;
  };
  ai: {
    ask(
      question: string,
      context?: { url?: string; text?: string }
    ): Promise<{ answer: string; sources?: string[] }>;
    summarize(url: string): Promise<{ summary: string; highlights: string[] }>;
  };
  trade: {
    getChart(symbol: string): Promise<{ data: unknown }>;
  };
  file: {
    save(path: string, content: string): Promise<{ success: boolean }>;
    read(path: string): Promise<{ content: string }>;
  };
  security: {
    scanPage(url: string): Promise<{ threats: string[]; score: number }>;
  };
}

class OmniKernelImpl implements OmniKernel {
  private win: BrowserWindow | null = null;

  setWindow(win: BrowserWindow) {
    this.win = win;
  }

  browser = {
    getPage: async () => {
      const tab = await this.browser.getActiveTab();
      if (!tab) return null;
      return this.browser.captureSnapshot(tab.url);
    },

    getActiveTab: async () => {
      if (!this.win) return null;
      const tabs = await import('../tabs').then(m => m.getTabs(this.win!));
      const activeId = await import('../tabs').then(m => m.getActiveTabId(this.win!));
      const tab = tabs.find(t => t.id === activeId);
      if (!tab) return null;

      try {
        const wc = tab.view.webContents;
        return {
          id: tab.id,
          url: wc.getURL(),
          title: wc.getTitle(),
        };
      } catch {
        return null;
      }
    },

    captureSnapshot: async (
      url?: string
    ): Promise<{ url: string; title: string; html: string; text: string }> => {
      const tab = await this.browser.getActiveTab();
      if (!tab && !url) {
        throw new Error('No active tab and no URL provided');
      }

      const targetUrl = url || tab?.url;
      if (!targetUrl) {
        throw new Error('No URL available for snapshot');
      }

      // Use scrape service to get page content
      // Note: enqueueScrape is a Node.js backend function, not available in Electron main process
      // This is a placeholder - in production, use IPC to call the backend
      // const _jobId = `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      // await enqueueScrape({ url: targetUrl, jobId: _jobId });

      // Wait for result (simplified - in production, use proper polling)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get from Redis (would need Redis client here)
      // For now, return basic structure
      return {
        url: targetUrl,
        title: tab?.title || new URL(targetUrl).hostname,
        html: '', // Would fetch from Redis
        text: '', // Would extract from HTML
      };
    },
  };

  scrape = {
    fetch: async (_url: string, _options = {}) => {
      // Note: This would use IPC to call backend scrape service
      // Placeholder implementation
      // const _jobId = `fetch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      // await enqueueScrape({ url: _url, jobId: _jobId, ..._options });
      // Return would come from Redis after worker processes
      return { body: '', status: 200, headers: {} };
    },

    enqueue: async (_url: string) => {
      // Note: This would use IPC to call backend scrape service
      // Placeholder implementation
      const jobId = `scrape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      // await enqueueScrape({ url: _url, jobId });
      return { jobId };
    },
  };

  ai = {
    ask: async (question: string, context?: { url?: string; text?: string }) => {
      // Note: analyzeWithLLM is a Node.js backend function, not available in Electron main process
      // This is a placeholder - in production, use IPC to call the backend
      if (context?.url) {
        await this.browser.captureSnapshot(context.url);
        // const result = await analyzeWithLLM({ ... });
        // Placeholder
        return {
          answer: 'AI analysis would be performed here via IPC',
          sources: [context.url],
        };
      } else if (context?.text) {
        // const result = await analyzeWithLLM({ ... });
        // Placeholder
        return {
          answer: 'AI analysis would be performed here via IPC',
          sources: [],
        };
      }
      throw new Error('Context (url or text) required');
    },

    summarize: async (url: string) => {
      await this.browser.captureSnapshot(url);
      // const result = await analyzeWithLLM({ ... });
      // Placeholder
      return {
        summary: 'Summary would be generated here via IPC',
        highlights: [],
      };
    },
  };

  trade = {
    getChart: async (symbol: string) => {
      // Placeholder - would integrate with trading APIs
      return { data: { symbol, price: 0 } };
    },
  };

  file = {
    save: async (path: string, content: string) => {
      const fs = await import('fs/promises');
      await fs.writeFile(path, content, 'utf-8');
      return { success: true };
    },

    read: async (path: string) => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(path, 'utf-8');
      return { content };
    },
  };

  security = {
    scanPage: async (_url: string) => {
      // Placeholder - would integrate with threat detection
      return { threats: [], score: 100 };
    },
  };
}

// Singleton instance
let kernelInstance: OmniKernelImpl | null = null;

export function getOmniKernel(win?: BrowserWindow): OmniKernel {
  if (!kernelInstance) {
    kernelInstance = new OmniKernelImpl();
  }
  if (win) {
    kernelInstance.setWindow(win);
  }
  return kernelInstance;
}

// Expose to renderer via preload
export const omnix = getOmniKernel();
