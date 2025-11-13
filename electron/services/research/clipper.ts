/**
 * Research Clipper - Browser extension-like functionality for capturing web pages
 * Works within Electron's BrowserView context
 */

import { BrowserWindow } from 'electron';
import { registerHandler } from '../../shared/ipc/router';
import { z } from 'zod';
import { app } from 'electron';
import * as path from 'node:path';
import { promises as fs } from 'node:fs';

/**
 * Content script to inject into pages for full-page capture
 * Note: Currently using SCROLL_CAPTURE_SCRIPT instead
 */
// const CAPTURE_SCRIPT = `
// (function() {
//   function captureFullPage() {
//     const data = {
//       url: window.location.href,
//       title: document.title,
//       html: document.documentElement.outerHTML,
//       text: document.body?.innerText || '',
//       metadata: {
//         viewport: {
//           width: window.innerWidth,
//           height: window.innerHeight,
//         },
//         scroll: {
//           x: window.scrollX,
//           y: window.scrollY,
//         },
//         timestamp: Date.now(),
//       },
//       // Capture all styles
//       styles: Array.from(document.styleSheets).map((sheet, idx) => {
//         try {
//           return {
//             href: sheet.href || null,
//             rules: Array.from(sheet.cssRules || []).map(rule => rule.cssText),
//           };
//         } catch (e) {
//           return { href: sheet.href || null, rules: [] };
//         }
//       }),
//     };
//     
//     return data;
//   }
//   
//   // Execute capture
//   return captureFullPage();
// })();
// `;

/**
 * Enhanced capture with scrolling for full-page screenshots
 */
const SCROLL_CAPTURE_SCRIPT = `
(async function() {
  const originalScrollY = window.scrollY;
  const originalScrollX = window.scrollX;
  
  try {
    // Scroll to top
    window.scrollTo(0, 0);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get full page dimensions
    const fullHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    
    const fullWidth = Math.max(
      document.body.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.clientWidth,
      document.documentElement.scrollWidth,
      document.documentElement.offsetWidth
    );
    
    // Capture HTML
    const html = document.documentElement.outerHTML;
    const title = document.title;
    const url = window.location.href;
    
    // Restore scroll position
    window.scrollTo(originalScrollX, originalScrollY);
    
    return {
      url,
      title,
      html,
      text: document.body?.innerText || '',
      dimensions: {
        width: fullWidth,
        height: fullHeight,
      },
      metadata: {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    // Restore scroll position on error
    window.scrollTo(originalScrollX, originalScrollY);
    throw error;
  }
})();
`;

/**
 * Register IPC handlers for page capture
 */
export function registerClipperIpc() {
  // Capture current page
  registerHandler('research:capturePage', z.object({
    tabId: z.string().optional(),
  }), async (event, _request) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
    if (!win) {
      throw new Error('No window found');
    }

    // Find the active BrowserView
    const views = win.getBrowserViews();
    const view = views.length > 0 ? views[views.length - 1] : null;
    
    if (!view) {
      throw new Error('No active tab found');
    }

    try {
      const webContents = view.webContents;
      const url = webContents.getURL();
      // const title = webContents.getTitle() || url;

      // Skip special pages
      if (url.startsWith('about:') || url.startsWith('chrome:') || !url || url === 'about:blank') {
        throw new Error('Cannot capture special pages');
      }

      // Wait for page to be ready
      if (webContents.isLoading()) {
        await new Promise<void>((resolve) => {
          const onFinish = () => {
            webContents.off('did-finish-load', onFinish);
            webContents.off('did-fail-load', onFinish);
            resolve();
          };
          webContents.once('did-finish-load', onFinish);
          webContents.once('did-fail-load', onFinish);
          setTimeout(() => onFinish(), 5000);
        });
      }

      // Execute capture script
      const captureData = await webContents.executeJavaScript(SCROLL_CAPTURE_SCRIPT, true);

      if (!captureData || !captureData.html) {
        throw new Error('Failed to capture page content');
      }

      // Save snapshot
      const snapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const snapshotsDir = path.join(app.getPath('userData'), 'research', 'snapshots');
      await fs.mkdir(snapshotsDir, { recursive: true });
      const snapshotPath = path.join(snapshotsDir, `${snapshotId}.html`);

      const snapshotData = {
        id: snapshotId,
        url: captureData.url,
        title: captureData.title,
        html: captureData.html,
        text: captureData.text,
        dimensions: captureData.dimensions,
        metadata: {
          ...captureData.metadata,
          capturedAt: Date.now(),
        },
      };

      await fs.writeFile(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf-8');

      return {
        snapshotId,
        url: captureData.url,
        title: captureData.title,
        dimensions: captureData.dimensions,
      };
    } catch (error) {
      console.error('Failed to capture page:', error);
      throw error;
    }
  });

  // Capture selected text/region
  registerHandler('research:captureSelection', z.object({
    tabId: z.string().optional(),
    text: z.string().optional(),
  }), async (event, _request) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
    if (!win) {
      throw new Error('No window found');
    }

    const views = win.getBrowserViews();
    const view = views.length > 0 ? views[views.length - 1] : null;
    
    if (!view) {
      throw new Error('No active tab found');
    }

    try {
      const webContents = view.webContents;
      const url = webContents.getURL();
      const title = webContents.getTitle() || url;

      // Get selected text from page
      const selectedText = _request.text || await webContents.executeJavaScript(`
        window.getSelection().toString()
      `, true).catch(() => '');

      if (!selectedText || selectedText.trim().length === 0) {
        throw new Error('No text selected');
      }

      // Create a clip (smaller snapshot focused on selection)
      const clipId = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const clipsDir = path.join(app.getPath('userData'), 'research', 'clips');
      await fs.mkdir(clipsDir, { recursive: true });
      const clipPath = path.join(clipsDir, `${clipId}.json`);

      const clipData = {
        id: clipId,
        url,
        title,
        text: selectedText.trim(),
        metadata: {
          sourceUrl: url,
          sourceTitle: title,
          capturedAt: Date.now(),
          type: 'selection',
        },
      };

      await fs.writeFile(clipPath, JSON.stringify(clipData, null, 2), 'utf-8');

      return {
        clipId,
        url,
        text: selectedText.trim(),
      };
    } catch (error) {
      console.error('Failed to capture selection:', error);
      throw error;
    }
  });
}

/**
 * Setup context menu for a BrowserView's webContents
 */
export function setupContextMenuForWebContents(webContents: Electron.WebContents, browserWindow: Electron.BrowserWindow) {
  const { Menu } = require('electron');
  
  webContents.on('context-menu', async (event, params) => {
    const url = webContents.getURL();
    // Skip special pages
    if (url.startsWith('about:') || url.startsWith('chrome:') || !url || url === 'about:blank') {
      return;
    }

    const menu = Menu.buildFromTemplate([
      {
        label: 'Add to Research',
        click: async () => {
          try {
            // Find the tab ID for this webContents
            const { findTabByWebContents } = await import('../tabs');
            const tab = findTabByWebContents(webContents);
            const tabId = tab?.id;
            
            // Send message to renderer which will handle the capture via IPC
            browserWindow.webContents.send('research:capture-from-context-menu', {
              url,
              hasSelection: params.selectionText && params.selectionText.trim().length > 0,
              tabId,
            });
          } catch (error) {
            console.error('[Research Clipper] Failed to capture from context menu:', error);
          }
        },
      },
      {
        label: 'Capture Selection',
        visible: !!(params.selectionText && params.selectionText.trim().length > 0),
        click: async () => {
          try {
            browserWindow.webContents.send('research:capture-selection-from-context', {
              text: params.selectionText,
              url,
            });
          } catch (error) {
            console.error('[Research Clipper] Failed to capture selection:', error);
          }
        },
      },
    ]);

    menu.popup({
      window: browserWindow,
      x: params.x,
      y: params.y,
    });
  });
}

