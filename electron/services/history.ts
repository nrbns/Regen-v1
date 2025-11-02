import { ipcMain, BrowserWindow } from 'electron';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';

export type HistoryEntry = { 
  id: string;
  url: string; 
  title: string; 
  timestamp: number;
  visitCount: number;
  favicon?: string;
  lastVisitTime?: number;
};

const items: HistoryEntry[] = [];
const urlToEntry = new Map<string, HistoryEntry>();

export function pushHistory(url: string, title: string) {
  try {
    // Skip internal URLs and special pages
    if (url.startsWith('about:') || url.startsWith('chrome:') || url.startsWith('ob://') || url.startsWith('obx://')) {
      return;
    }

    // Check if URL already exists
    const existing = urlToEntry.get(url);
    const now = Date.now();
    
    if (existing) {
      // Update existing entry
      existing.title = title || existing.title;
      existing.visitCount = (existing.visitCount || 1) + 1;
      existing.lastVisitTime = now;
      
      // Move to top
      const index = items.indexOf(existing);
      if (index > 0) {
        items.splice(index, 1);
        items.unshift(existing);
      }
    } else {
      // Create new entry
      const id = `${url}_${now}`;
      const entry: HistoryEntry = {
        id,
        url,
        title: title || url,
        timestamp: now,
        visitCount: 1,
        lastVisitTime: now,
      };
      
      items.unshift(entry);
      urlToEntry.set(url, entry);
      
      // Limit history size (keep last 5000 entries)
      if (items.length > 5000) {
        const removed = items.pop();
        if (removed) {
          urlToEntry.delete(removed.url);
        }
      }
    }
    
    // Emit update event to all windows
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send('history:updated');
      }
    });
  } catch (error) {
    console.error('Failed to push history:', error);
  }
}

export function getHistory(): HistoryEntry[] {
  return [...items];
}

export function clearHistory(): void {
  items.length = 0;
  urlToEntry.clear();
}

export function searchHistory(query: string): HistoryEntry[] {
  const lowerQuery = query.toLowerCase();
  return items.filter(entry => 
    entry.url.toLowerCase().includes(lowerQuery) ||
    entry.title.toLowerCase().includes(lowerQuery)
  );
}

export function registerHistoryIpc() {
  // Typed IPC handlers
  registerHandler('history:list', z.object({}), async () => {
    return getHistory();
  });

  registerHandler('history:clear', z.object({}), async () => {
    clearHistory();
    return { success: true };
  });

  registerHandler('history:search', z.object({ query: z.string() }), async (_event, request) => {
    return searchHistory(request.query);
  });

  registerHandler('history:deleteUrl', z.object({ url: z.string() }), async (_event, request) => {
    const entry = urlToEntry.get(request.url);
    if (entry) {
      const index = items.indexOf(entry);
      if (index >= 0) {
        items.splice(index, 1);
      }
      urlToEntry.delete(request.url);
    }
    return { success: true };
  });

  // Legacy handlers for backwards compatibility
  ipcMain.handle('history:list', () => getHistory());
  ipcMain.handle('history:clear', () => {
    clearHistory();
    return true;
  });
}


