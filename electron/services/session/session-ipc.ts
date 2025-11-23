/**
 * Session Persistence IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { sessionPersistence } from './persistence';

export function registerSessionIpc() {
  registerHandler('session:saveTabs', z.object({}), async event => {
    const win = (event.sender as any).getOwnerBrowserWindow?.() || null;
    if (!win) {
      throw new Error('No window associated with request');
    }

    // Get tabs from tabs service
    const { getTabs, getActiveTabId } = await import('../tabs');
    const tabs = getTabs(win);
    const activeId = getActiveTabId(win);

    const sessionId = 'default'; // Could be per-window or user session
    const tabRecords = tabs.map((tab, index) => {
      try {
        const wc = tab.view.webContents;
        return {
          id: tab.id,
          url: wc.getURL() || 'about:blank',
          title: wc.getTitle() || 'New Tab',
          active: tab.id === activeId,
          position: index,
          containerId: tab.containerId,
          mode: tab.mode,
          createdAt: tab.createdAt,
          lastActiveAt: tab.lastActiveAt,
          sessionId,
        };
      } catch {
        return {
          id: tab.id,
          url: 'about:blank',
          title: 'New Tab',
          active: tab.id === activeId,
          position: index,
          containerId: tab.containerId,
          mode: tab.mode,
          createdAt: tab.createdAt,
          lastActiveAt: tab.lastActiveAt,
          sessionId,
        };
      }
    });

    await sessionPersistence.saveTabs(win.id, tabRecords, sessionId);
    return { success: true, count: tabRecords.length };
  });

  registerHandler('session:loadTabs', z.object({}), async event => {
    const win = (event.sender as any).getOwnerBrowserWindow?.() || null;
    if (!win) {
      throw new Error('No window associated with request');
    }

    const sessionId = 'default';
    const tabs = await sessionPersistence.loadTabs(win.id, sessionId);
    return { tabs };
  });

  registerHandler(
    'session:addHistory',
    z.object({ url: z.string(), title: z.string(), typed: z.boolean().optional() }),
    async (_event, request) => {
      await sessionPersistence.addHistory(request.url, request.title, request.typed || false);
      return { success: true };
    }
  );

  registerHandler(
    'session:getHistory',
    z.object({ limit: z.number().optional() }),
    async (_event, request) => {
      const history = await sessionPersistence.getHistory(request.limit || 100);
      return { history };
    }
  );

  registerHandler(
    'session:searchHistory',
    z.object({ query: z.string(), limit: z.number().optional() }),
    async (_event, request) => {
      const results = await sessionPersistence.searchHistory(request.query, request.limit || 20);
      return { results };
    }
  );

  registerHandler(
    'session:saveSetting',
    z.object({ key: z.string(), value: z.unknown() }),
    async (_event, request) => {
      await sessionPersistence.saveSetting(request.key, request.value);
      return { success: true };
    }
  );

  registerHandler('session:getSetting', z.object({ key: z.string() }), async (_event, request) => {
    const value = await sessionPersistence.getSetting(request.key);
    return { value };
  });
}
