/**
 * Tab Context IPC - Get active tab context (URL, title) for AI queries
 */

import { BrowserWindow } from 'electron';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { findTabById, getActiveTabIdForWindow } from './tabs';

export function registerTabContextIpc() {
  // Get active tab context (URL, title) for AI queries
  registerHandler(
    'tabs:getContext',
    z.object({
      tabId: z.string().optional(), // If not provided, uses active tab
    }),
    async (event, request) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) {
          return { success: false, error: 'Window not found' };
        }

        const tabId = request.tabId || getActiveTabIdForWindow(win.id);
        if (!tabId) {
          return { success: false, error: 'No active tab' };
        }

        const tab = findTabById(tabId);
        if (!tab) {
          return { success: false, error: 'Tab not found' };
        }

        const webContents = tab.view.webContents;
        const url = webContents.getURL();
        const title = webContents.getTitle();

        // Try to get page text (first 2000 chars) for context
        let pageText = '';
        try {
          const script = `
            (() => {
              const body = document.body?.innerText || '';
              const article = document.querySelector('article')?.innerText || '';
              return (article || body).slice(0, 2000);
            })();
          `;
          pageText = await webContents.executeJavaScript(script).catch(() => '');
        } catch {
          // Silent fail - pageText remains empty
        }

        return {
          success: true,
          context: {
            tabId,
            url,
            title,
            pageText,
            domain: url ? new URL(url).hostname : '',
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );
}

