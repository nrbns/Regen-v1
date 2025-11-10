import { BrowserWindow, ipcMain } from 'electron';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { getTabs } from './tabs';
import { createLogger } from './utils/logger';

const logger = createLogger('cross-reality');

interface HandoffRequest {
  tabId: string;
  target: 'mobile' | 'xr';
  timestamp: number;
  url: string;
  title: string;
  preview?: string;
}

interface HandoffEvent extends HandoffRequest {
  sourceWindowId: number;
}

const handoffQueue: HandoffEvent[] = [];

function broadcastHandoff(event: HandoffEvent) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      win.webContents.send('cross-reality:handoff', event);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Failed to send handoff event', error);
      }
    }
  }
}

function resolveTabMetadata(tabId: string) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    const tab = getTabs(win).find((t) => t.id === tabId);
    if (tab) {
      try {
        const wc = tab.view.webContents;
        return {
          url: wc.getURL() || 'about:blank',
          title: wc.getTitle() || 'Untitled',
        };
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function registerCrossRealityBridge(): void {
  registerHandler('cross-reality:handoff', z.object({
    tabId: z.string(),
    target: z.enum(['mobile', 'xr']),
    preview: z.string().optional(),
  }), async (event, request) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      throw new Error('Source window unavailable');
    }

    const metadata = resolveTabMetadata(request.tabId);
    if (!metadata) {
      throw new Error('Tab metadata unavailable');
    }

    const handoffEvent: HandoffEvent = {
      tabId: request.tabId,
      target: request.target,
      timestamp: Date.now(),
      url: metadata.url,
      title: metadata.title,
      preview: request.preview,
      sourceWindowId: win.id,
    };

    handoffQueue.push(handoffEvent);
    broadcastHandoff(handoffEvent);
    return { success: true, handoff: handoffEvent };
  });

  registerHandler('cross-reality:queue', z.object({}), async () => {
    return { handoffs: handoffQueue.slice(-10) };
  });

  ipcMain.handle('cross-reality:accept', (_event, payload: { tabId: string }) => {
    const matchIndex = handoffQueue.findIndex((entry) => entry.tabId === payload.tabId);
    if (matchIndex >= 0) {
      handoffQueue.splice(matchIndex, 1);
    }
    return { success: true };
  });
}
