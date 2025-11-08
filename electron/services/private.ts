/**
 * Private Window / Ghost Mode / Incognito Support
 * In-memory partitions, content protection, automatic cleanup
 */

import { app, BrowserWindow, session } from 'electron';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { registerTabIpc } from './tabs';

export interface PrivateWindowOptions {
  url?: string;
  autoCloseAfter?: number; // milliseconds (e.g., 10 minutes = 600000)
  contentProtection?: boolean; // macOS: prevent screen recording
  ghostMode?: boolean; // Enhanced privacy: max fingerprint protection
}

const privateWindows = new Map<number, {
  window: BrowserWindow;
  partition: string;
  autoCloseTimer?: NodeJS.Timeout;
  createdAt: number;
}>();

/**
 * Create a private window with in-memory partition
 * Data is not persisted - cookies, storage, etc. are cleared on close
 */
export function createPrivateWindow(options: PrivateWindowOptions = {}): BrowserWindow {
  const partition = `temp:private:${randomUUID()}`;
  const sess = session.fromPartition(partition, { cache: false });
  
  // Clear partition on close
  sess.clearStorageData();
  sess.clearCache();

  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  const preloadPath = isDev
    ? path.join(process.cwd(), 'electron', 'preload.cjs')
    : path.join(__dirname, 'preload.js');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#1A1D28',
    title: 'OmniBrowser (Private)',
    webPreferences: {
      session: sess,
      partition,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      preload: preloadPath,
    },
    // macOS content protection
    ...(options.contentProtection !== false && process.platform === 'darwin' ? {
      titleBarStyle: 'hiddenInset',
    } : {}),
  });

  // Apply content protection (macOS)
  if (options.contentProtection !== false && process.platform === 'darwin') {
    win.setContentProtection(true);
  }

  registerTabIpc(win);
  (win as any).__ob_tabModeDefault = 'private';
  (win as any).__ob_defaultPartitionOverride = partition;

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.loadURL(devUrl).catch(err => console.error('Failed to load dev URL in private window:', err));
      }
    }, 100);
  } else {
    const htmlPath = path.resolve(app.getAppPath(), 'dist', 'index.html');
    win.loadFile(htmlPath).catch(err => console.error('Failed to load index in private window:', err));
  }

  // Auto-close timer
  if (options.autoCloseAfter && options.autoCloseAfter > 0) {
    const timer = setTimeout(() => {
      win.close();
    }, options.autoCloseAfter);
    privateWindows.set(win.id, {
      window: win,
      partition,
      autoCloseTimer: timer,
      createdAt: Date.now(),
    });
  } else {
    privateWindows.set(win.id, {
      window: win,
      partition,
      createdAt: Date.now(),
    });
  }

  // Cleanup on close
  win.on('closed', () => {
    const record = privateWindows.get(win.id);
    if (record) {
      if (record.autoCloseTimer) {
        clearTimeout(record.autoCloseTimer);
      }
      // Clear all data
      sess.clearStorageData();
      sess.clearCache();
      sess.clearHostResolverCache();
      privateWindows.delete(win.id);
    }
  });

  const attemptInitialTab = () => {
    const createTabFn = (win as any).__ob_createTab as ((opts: any) => Promise<{ id: string }>) | undefined;
    if (createTabFn) {
      createTabFn({
        url: options.url || 'about:blank',
        partitionOverride: partition,
        mode: 'private',
      }).catch((error: any) => {
        console.error('Failed to create initial private tab:', error);
      });
      return true;
    }
    return false;
  };

  const scheduleInitialTab = (attempt = 0) => {
    if (win.isDestroyed()) return;
    if (attemptInitialTab()) return;
    if (attempt < 10) {
      setTimeout(() => scheduleInitialTab(attempt + 1), 150);
    }
  };

  // Wait briefly to ensure registerTabIpc has initialized helpers
  setTimeout(() => scheduleInitialTab(0), 200);

  return win;
}

/**
 * Create a ghost tab (enhanced private tab in existing window)
 */
export async function createGhostTab(
  window: BrowserWindow,
  url: string = 'about:blank'
): Promise<string> {
  const createTabFn = (window as any).__ob_createTab as ((opts: any) => Promise<{ id: string }>) | undefined;
  if (!createTabFn) {
    throw new Error('Tab system not initialized for window');
  }
  const result = await createTabFn({
    url,
    mode: 'ghost',
    activate: true,
  });
  return result.id;
}

/**
 * Check if a window is private
 */
export function isPrivateWindow(windowId: number): boolean {
  return privateWindows.has(windowId);
}

/**
 * Get all private windows
 */
export function getPrivateWindows(): BrowserWindow[] {
  return Array.from(privateWindows.values()).map(r => r.window);
}

/**
 * Close all private windows (panic mode)
 */
export function closeAllPrivateWindows(): number {
  let count = 0;
  for (const record of privateWindows.values()) {
    record.window.close();
    count++;
  }
  return count;
}
