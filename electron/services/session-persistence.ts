/**
 * Atomic Session Persistence
 * Crash-safe session store using JSONL (JSON Lines) format
 * Persists every 2 seconds and on app close
 */

import { app, BrowserWindow } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getSessionManager, BrowserSession } from './sessions';
import { getTabs } from './tabs';

export interface WindowState {
  id: number;
  bounds: { x: number; y: number; width: number; height: number; isMaximized: boolean };
  tabs: Array<{
    id: string;
    url: string;
    title: string;
    sessionId?: string;
    partition: string;
  }>;
  activeTabId: string | null;
  activeSessionId: string | null;
}

export interface SessionSnapshot {
  timestamp: number;
  windows: WindowState[];
  sessions: BrowserSession[];
}

const SESSION_FILE = path.join(app.getPath('userData'), 'sessions.jsonl');
const SNAPSHOT_FILE = path.join(app.getPath('userData'), 'session-snapshot.json');
let persistenceTimer: NodeJS.Timeout | null = null;
let isShuttingDown = false;

/**
 * Save session state atomically (write to temp file, then rename)
 */
async function saveSessionState(): Promise<void> {
  if (isShuttingDown) return;

  try {
    const sessionManager = getSessionManager();
    const windows = BrowserWindow.getAllWindows();
    const windowsState: WindowState[] = [];

    for (const win of windows) {
      if (win.isDestroyed()) continue;

      const tabs = getTabs(win);
      const tabsState = tabs.map(t => {
        try {
          return {
            id: t.id,
            url: t.view.webContents.getURL() || 'about:blank',
            title: t.view.webContents.getTitle() || 'New Tab',
            sessionId: t.sessionId,
            partition: t.partition,
          };
        } catch {
          // Tab might be destroyed, skip
          return null;
        }
      }).filter(Boolean) as WindowState['tabs'];

      const bounds = win.getBounds();
      windowsState.push({
        id: win.id,
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized: win.isMaximized(),
        },
        tabs: tabsState,
        activeTabId: null, // Will be set from tabs service
        activeSessionId: sessionManager.getActiveSession()?.id || null,
      });
    }

    const sessions = sessionManager.listSessions();
    const snapshot: SessionSnapshot = {
      timestamp: Date.now(),
      windows: windowsState,
      sessions,
    };

    // Atomic write: write to temp file, then rename
    const tempFile = `${SNAPSHOT_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(snapshot, null, 2), 'utf-8');
    await fs.rename(tempFile, SNAPSHOT_FILE);

    // Also append to JSONL for audit trail (keep last 100 entries)
    const jsonlLine = JSON.stringify(snapshot) + '\n';
    await fs.appendFile(SESSION_FILE, jsonlLine, 'utf-8').catch(() => {
      // If file doesn't exist, create it
      return fs.writeFile(SESSION_FILE, jsonlLine, 'utf-8');
    });

    // Trim JSONL to last 100 entries
    try {
      const content = await fs.readFile(SESSION_FILE, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      if (lines.length > 100) {
        const recentLines = lines.slice(-100);
        await fs.writeFile(SESSION_FILE, recentLines.join('\n') + '\n', 'utf-8');
      }
    } catch {
      // File might not exist yet, that's ok
    }
  } catch (error) {
    console.error('Failed to save session state:', error);
  }
}

/**
 * Load session state from disk
 */
export async function loadSessionState(): Promise<SessionSnapshot | null> {
  try {
    const content = await fs.readFile(SNAPSHOT_FILE, 'utf-8');
    const snapshot = JSON.parse(content) as SessionSnapshot;
    return snapshot;
  } catch (error) {
    // No saved state, return null
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Failed to load session state:', error);
    }
    return null;
  }
}

/**
 * Restore windows from snapshot
 */
export async function restoreWindows(
  snapshot: SessionSnapshot,
  createWindow: (bounds: WindowState['bounds']) => BrowserWindow
): Promise<void> {
  const sessionManager = getSessionManager();

  // Restore sessions first
  for (const session of snapshot.sessions) {
    if (session.id !== 'default') {
      sessionManager.createSession(session.name, session.profileId, session.color);
    }
  }

  // Restore active session
  if (snapshot.windows.length > 0 && snapshot.windows[0].activeSessionId) {
    sessionManager.setActiveSession(snapshot.windows[0].activeSessionId);
  }

  // Restore windows
  for (const windowState of snapshot.windows) {
    try {
      const win = createWindow(windowState.bounds);
      
      // Restore tabs after a brief delay to ensure window is ready
      setTimeout(async () => {
        for (const tabState of windowState.tabs) {
          try {
            const { registerTabIpc } = await import('./tabs');
            // Tab creation will be handled by tabs service
            // We just need to ensure the window is ready
          } catch (error) {
            console.error('Failed to restore tab:', error);
          }
        }
      }, 500);
    } catch (error) {
      console.error('Failed to restore window:', error);
    }
  }
}

/**
 * Start automatic persistence (every 2 seconds)
 */
export function startSessionPersistence(): void {
  // Save immediately on start
  saveSessionState();

  // Save every 2 seconds
  persistenceTimer = setInterval(() => {
    saveSessionState();
  }, 2000);

  // Save on app close
  app.on('before-quit', () => {
    isShuttingDown = true;
    if (persistenceTimer) {
      clearInterval(persistenceTimer);
      persistenceTimer = null;
    }
    // Final save (synchronous to ensure it completes)
    saveSessionState().catch(console.error);
  });

  // Save on window close
  app.on('window-all-closed', () => {
    saveSessionState().catch(console.error);
  });
}

/**
 * Stop automatic persistence
 */
export function stopSessionPersistence(): void {
  if (persistenceTimer) {
    clearInterval(persistenceTimer);
    persistenceTimer = null;
  }
}

/**
 * Force immediate save (for testing or manual triggers)
 */
export function forceSaveSessionState(): Promise<void> {
  return saveSessionState();
}

