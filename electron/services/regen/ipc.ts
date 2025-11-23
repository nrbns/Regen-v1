/**
 * Regen IPC Handlers
 * Exposes Regen functionality to renderer via IPC
 */

import { registerHandler } from '../../shared/ipc/router';
import { z } from 'zod';
import { handleMessage, type RegenMessage, type RegenResponse } from './core';
import * as browserTools from './tools/browserTools';
import { createLogger } from '../utils/logger';

const log = createLogger('regen-ipc');

/**
 * Register all Regen IPC handlers
 */
export function registerRegenIpc(): void {
  // Handle Regen query
  registerHandler(
    'regen:query',
    z.object({
      sessionId: z.string(),
      message: z.string(),
      mode: z.enum(['research', 'trade', 'browser', 'automation', 'handsFree']).optional(),
      source: z.enum(['text', 'voice']).optional(),
      tabId: z.string().optional(),
      context: z
        .object({
          url: z.string().optional(),
          title: z.string().optional(),
          dom: z.string().optional(),
        })
        .optional(),
    }),
    async (_event, request): Promise<RegenResponse> => {
      const msg: RegenMessage = {
        sessionId: request.sessionId,
        message: request.message,
        mode: request.mode || 'research',
        source: request.source || 'text',
        tabId: request.tabId,
        context: request.context,
      };

      return await handleMessage(msg);
    }
  );

  // Browser tools
  registerHandler(
    'regen:getDom',
    z.object({
      tabId: z.string(),
    }),
    async (_event, request) => {
      return await browserTools.getDom(request.tabId);
    }
  );

  registerHandler(
    'regen:clickElement',
    z.object({
      tabId: z.string(),
      selector: z.string(),
    }),
    async (_event, request) => {
      return await browserTools.clickElement(request.tabId, request.selector);
    }
  );

  registerHandler(
    'regen:scroll',
    z.object({
      tabId: z.string(),
      amount: z.number().default(500),
    }),
    async (_event, request) => {
      return await browserTools.scrollTab(request.tabId, request.amount || 500);
    }
  );

  registerHandler(
    'regen:openTab',
    z.object({
      url: z.string(),
      background: z.boolean().optional(),
    }),
    async (event, request) => {
      const { BrowserWindow } = await import('electron');
      const window =
        BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow();
      return await browserTools.openTab(
        request.url,
        request.background || false,
        window || undefined
      );
    }
  );

  registerHandler(
    'regen:typeIntoElement',
    z.object({
      tabId: z.string(),
      selector: z.string(),
      text: z.string(),
    }),
    async (_event, request) => {
      return await browserTools.typeInto(request.tabId, request.selector, request.text);
    }
  );

  registerHandler(
    'regen:goBack',
    z.object({
      tabId: z.string(),
    }),
    async (_event, request) => {
      return await browserTools.goBack(request.tabId);
    }
  );

  registerHandler(
    'regen:goForward',
    z.object({
      tabId: z.string(),
    }),
    async (_event, request) => {
      return await browserTools.goForward(request.tabId);
    }
  );

  registerHandler(
    'regen:switchTab',
    z.object({
      index: z.number().optional(),
      id: z.string().optional(),
    }),
    async (_event, request) => {
      if (request.id) {
        // Find tab by ID and get its index
        const { BrowserWindow } = await import('electron');
        const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        if (window) {
          const tabsModule = await import('../../services/tabs');
          const tabs = tabsModule.getTabs(window);
          const index = tabs.findIndex((t: { id: string }) => t.id === request.id);
          if (index >= 0) {
            return await browserTools.switchTab(index);
          }
        }
        return { success: false, error: 'Tab not found' };
      } else if (typeof request.index === 'number') {
        return await browserTools.switchTab(request.index);
      }
      return { success: false, error: 'Either index or id must be provided' };
    }
  );

  registerHandler(
    'regen:closeTab',
    z.object({
      tabId: z.string(),
    }),
    async (_event, request) => {
      return await browserTools.closeTab(request.tabId);
    }
  );

  registerHandler(
    'regen:readPage',
    z.object({
      tabId: z.string(),
    }),
    async (_event, request) => {
      return await browserTools.readPage(request.tabId);
    }
  );

  log.info('Regen IPC handlers registered');
}
