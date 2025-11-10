import { app, BrowserWindow, session } from 'electron';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { registerTabIpc } from './tabs';
import { setActiveProfileForWindow, removeWindow as removeProfileWindow } from './profiles';

interface ShadowSessionOptions {
  url?: string;
  persona?: string;
  summary?: boolean;
  profileId?: string;
  sourceWindowId?: number;
}

interface ShadowSessionRecord {
  id: string;
  window: BrowserWindow;
  partition: string;
  createdAt: number;
  persona?: string;
  summaryRequested: boolean;
  profileId?: string;
  events: Array<{ url: string; title: string; timestamp: number }>;
  ended: boolean;
  sourceWindowId?: number;
}

export interface ShadowSessionSummary {
  sessionId: string;
  persona?: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  totalVisits: number;
  uniqueHosts: number;
  visited: Array<{ url: string; title: string; firstSeen: number }>;
  recommendations: string[];
}

const shadowSessions = new Map<string, ShadowSessionRecord>();

function getPreloadPath(): string {
  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  return isDev
    ? path.join(process.cwd(), 'electron', 'preload.cjs')
    : path.join(__dirname, 'preload.js');
}

async function clearShadowPartition(partition: string, forensic = false): Promise<void> {
  const sess = session.fromPartition(partition, { cache: false });
  try {
    await sess.clearCache();
    await sess.clearStorageData({
      storages: ['appcache', 'cookies', 'filesystem', 'indexdb', 'localstorage', 'serviceworkers', 'shadercache', 'websql', 'cachestorage'],
      quotas: ['temporary', 'persistent', 'syncable'],
    });
    if (forensic) {
      await sess.clearHostResolverCache();
      await sess.clearCodeCaches({ onlyOlderThan: 0 });
    }
    await sess.flushStorageData();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[shadow] Failed to clear shadow partition', error);
    }
  }
}

function recordNavigation(record: ShadowSessionRecord, url: string, title: string): void {
  if (!url || url.startsWith('about:')) return;
  const timestamp = Date.now();
  record.events.push({
    url,
    title,
    timestamp,
  });
}

function buildSummary(record: ShadowSessionRecord, endedAt: number): ShadowSessionSummary {
  const visitedMap = new Map<string, { url: string; title: string; firstSeen: number }>();
  for (const event of record.events) {
    if (!visitedMap.has(event.url)) {
      visitedMap.set(event.url, {
        url: event.url,
        title: event.title,
        firstSeen: event.timestamp,
      });
    }
  }

  const visited = Array.from(visitedMap.values()).sort((a, b) => a.firstSeen - b.firstSeen);
  const uniqueHosts = new Set(
    visited.map((entry) => {
      try {
        return new URL(entry.url).hostname.replace(/^www\./, '');
      } catch {
        return entry.url;
      }
    }),
  ).size;

  const recommendations: string[] = [];
  if (visited.length === 0) {
    recommendations.push('No browsing activity detected during the shadow session.');
  } else {
    recommendations.push('Review the summary before applying actions to your real session.');
    if (uniqueHosts > 3) {
      recommendations.push('Consider opening high-risk destinations in private mode with shields enabled.');
    }
    recommendations.push('Discard any downloaded content before leaving shadow mode.');
  }

  return {
    sessionId: record.id,
    persona: record.persona,
    startedAt: record.createdAt,
    endedAt,
    durationMs: Math.max(0, endedAt - record.createdAt),
    totalVisits: record.events.length,
    uniqueHosts,
    visited,
    recommendations,
  };
}

async function finalizeShadowSession(record: ShadowSessionRecord, opts?: { forensic?: boolean }): Promise<ShadowSessionSummary | null> {
  if (record.ended) {
    return null;
  }
  record.ended = true;

  const endedAt = Date.now();
  const summary = record.summaryRequested ? buildSummary(record, endedAt) : null;

  const notifySummary = () => {
    const target =
      (record.sourceWindowId ? BrowserWindow.fromId(record.sourceWindowId) : null) ||
      BrowserWindow.getAllWindows().find((win) => !win.isDestroyed());
    if (target && !target.isDestroyed()) {
      try {
        target.webContents.send('private:shadow:ended', {
          sessionId: record.id,
          summary,
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[shadow] Failed to send summary event', error);
        }
      }
    }
  };

  if (!record.window.isDestroyed()) {
    try {
      record.window.destroy();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[shadow] Failed to destroy shadow window', error);
      }
    }
  }

  await clearShadowPartition(record.partition, opts?.forensic ?? false);
  removeProfileWindow(record.window.id);
  shadowSessions.delete(record.id);
  notifySummary();
  return summary;
}

export async function startShadowSession(options: ShadowSessionOptions = {}): Promise<{ sessionId: string; windowId: number; partition: string }> {
  const sessionId = randomUUID();
  const partition = `temp:shadow:${sessionId}`;
  await clearShadowPartition(partition);

  const preloadPath = getPreloadPath();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#080A12',
    show: true,
    title: 'OmniBrowser — Shadow Session',
    autoHideMenuBar: true,
    webPreferences: {
      session: session.fromPartition(partition, { cache: false }),
      partition,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      preload: preloadPath,
    },
  });

  win.setContentProtection(true);
  registerTabIpc(win);
  (win as any).__ob_tabModeDefault = 'private';
  (win as any).__ob_defaultPartitionOverride = partition;
  (win as any).__ob_shadowSessionId = sessionId;

  if (options.profileId) {
    setActiveProfileForWindow(win, options.profileId);
  } else {
    setActiveProfileForWindow(win, 'default');
  }

  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.loadURL(devUrl).catch((error) => console.error('[shadow] Failed to load dev URL', error));
      }
    }, 100);
  } else {
    const htmlPath = path.resolve(app.getAppPath(), 'dist', 'index.html');
    win.loadFile(htmlPath).catch((error) => console.error('[shadow] Failed to load index', error));
  }

  const record: ShadowSessionRecord = {
    id: sessionId,
    window: win,
    partition,
    createdAt: Date.now(),
    persona: options.persona,
    summaryRequested: options.summary !== false,
    profileId: options.profileId,
    events: [],
    ended: false,
    sourceWindowId: options.sourceWindowId,
  };
  shadowSessions.set(sessionId, record);

  const captureNavigation = (url: string) => {
    let title = '';
    try {
      title = win.webContents.getTitle() || '';
    } catch {
      title = '';
    }
    recordNavigation(record, url, title);
  };

  win.webContents.on('did-navigate', (_event, url) => captureNavigation(url));
  win.webContents.on('did-navigate-in-page', (_event, url) => captureNavigation(url));
  win.webContents.on('page-title-updated', (_event, title) => {
    if (!record.events.length) return;
    const current = record.events[record.events.length - 1];
    current.title = title;
  });

  win.on('closed', () => {
    void finalizeShadowSession(record).catch(() => {});
  });

  if (options.url) {
    win.webContents.once('did-finish-load', () => {
      if (!win.isDestroyed()) {
        win.webContents.loadURL(options.url!).catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[shadow] Failed to navigate to initial URL', error);
          }
        });
      }
    });
  }

  return { sessionId, windowId: win.id, partition };
}

export async function endShadowSession(sessionId: string, opts?: { forensic?: boolean }): Promise<{ success: boolean; summary: ShadowSessionSummary | null }> {
  const record = shadowSessions.get(sessionId);
  if (!record) {
    return { success: false, summary: null };
  }
  const summary = await finalizeShadowSession(record, { forensic: opts?.forensic });
  return { success: true, summary: summary ?? null };
}

export function hasShadowSession(sessionId: string): boolean {
  return shadowSessions.has(sessionId);
}


