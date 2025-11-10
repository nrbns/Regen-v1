/**
 * Atomic Session Persistence
 * Crash-safe session store using JSONL (JSON Lines) format
 * Persists every 2 seconds and on app close
 */

import { app, BrowserWindow } from 'electron';
import { promises as fs, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { registerHandler } from '../shared/ipc/router';
import { getSessionManager, BrowserSession } from './sessions';
import { getTabs, getActiveTabIdForWindow, closeAllTabs, createTabOnWindow, activateTabByWindowId } from './tabs';

export interface SessionTabState {
  id: string;
  url: string;
  title: string;
  sessionId?: string;
  partition: string;
  containerId?: string;
  createdAt: number;
  lastActiveAt: number;
  profileId?: string;
}

export interface WindowState {
  id: number;
  bounds: { x: number; y: number; width: number; height: number; isMaximized: boolean };
  tabs: SessionTabState[];
  activeTabId: string | null;
  activeSessionId: string | null;
  createdAt: number;
  lastFocusedAt: number | null;
}

export interface SessionState {
  version: 1;
  updatedAt: number;
  windows: WindowState[];
  sessions: BrowserSession[];
}

export interface SessionSummary {
  updatedAt: number;
  windowCount: number;
  tabCount: number;
}

type LegacyTabState = {
  id: string;
  url: string;
  title: string;
  sessionId?: string;
  partition: string;
  containerId?: string;
};

type LegacyWindowState = {
  id: number;
  bounds: { x: number; y: number; width: number; height: number; isMaximized: boolean };
  tabs: LegacyTabState[];
  activeTabId: string | null;
  activeSessionId: string | null;
};

type LegacySessionSnapshot = {
  timestamp: number;
  windows: LegacyWindowState[];
  sessions: BrowserSession[];
};

function migrateLegacySnapshot(snapshot: LegacySessionSnapshot | SessionState): SessionState {
  if ((snapshot as SessionState).version === 1) {
    return snapshot as SessionState;
  }

  const legacy = snapshot as LegacySessionSnapshot;
  const migratedUpdatedAt = legacy.timestamp ?? Date.now();

  const windows: WindowState[] = (legacy.windows || []).map((win) => {
    const createdAt = (win as any).createdAt ?? migratedUpdatedAt;
    const lastFocusedAt = (win as any).lastFocusedAt ?? createdAt;
    return {
      id: win.id,
      bounds: win.bounds,
      tabs: (win.tabs || []).map((tab) => {
        const tabCreated = (tab as any).createdAt ?? migratedUpdatedAt;
        const tabLastActive = (tab as any).lastActiveAt ?? tabCreated;
        return {
          id: tab.id,
          url: tab.url,
          title: tab.title,
          sessionId: tab.sessionId,
          partition: tab.partition,
          containerId: tab.containerId,
          createdAt: tabCreated,
          lastActiveAt: tabLastActive,
          profileId: (tab as any).profileId,
        };
      }),
      activeTabId: win.activeTabId ?? null,
      activeSessionId: win.activeSessionId ?? null,
      createdAt,
      lastFocusedAt,
    };
  });

  return {
    version: 1,
    updatedAt: migratedUpdatedAt,
    windows,
    sessions: legacy.sessions || [],
  };
}

// Get userData directory path - only if app is ready (main process only)
let SESSION_FILE: string;
let SNAPSHOT_FILE: string;
let USER_DATA_DIR: string;

// Initialize paths only in main process
function initializePaths(): void {
  try {
    // Only initialize if app is available (main process check)
    if (!app || !app.isReady()) {
      return;
    }
    USER_DATA_DIR = app.getPath('userData');
    SESSION_FILE = path.join(USER_DATA_DIR, 'sessions.jsonl');
    SNAPSHOT_FILE = path.join(USER_DATA_DIR, 'session-snapshot.json');
    
    // Ensure directory exists synchronously immediately
    if (!existsSync(USER_DATA_DIR)) {
      mkdirSync(USER_DATA_DIR, { recursive: true });
    }
  } catch (error: any) {
    // Silently fail if not in main process or app not ready
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Session] Failed to initialize paths:', error.message);
    }
  }
}

// Initialize paths when app is ready (defer initialization to avoid issues)
// Don't initialize at module load - wait for explicit call from startSessionPersistence

const persistenceTimerRef: { current: NodeJS.Timeout | null } = { current: null };
let isSaving = false;
let isShuttingDown = false;
const SHADOW_SESSION_MARKER = '__ob_shadowSessionId';

function isShadowWindow(win: BrowserWindow): boolean {
  return Boolean((win as any)[SHADOW_SESSION_MARKER]);
}

/**
 * Save session state atomically (write to temp file, then rename)
 */
async function saveSessionState(): Promise<void> {
  // Guard: only run in main process
  if (typeof app === 'undefined' || !app.isReady()) {
    return;
  }
  
  // Guard: prevent concurrent saves
  if (isSaving || isShuttingDown) {
    return;
  }
  
  // Ensure paths are initialized
  if (!USER_DATA_DIR || !SNAPSHOT_FILE) {
    initializePaths();
    if (!USER_DATA_DIR || !SNAPSHOT_FILE) {
      // Still not initialized - skip this save
      return;
    }
  }
  
  isSaving = true;

  try {
    const sessionManager = getSessionManager();
    const windows = BrowserWindow.getAllWindows();
    const windowsState: WindowState[] = [];

    for (const win of windows) {
      if (win.isDestroyed()) continue;
      if (isShadowWindow(win)) continue;

      const tabs = getTabs(win);
      const tabsState = tabs.map(t => {
        if (t.mode && t.mode !== 'normal') {
          return null;
        }
        try {
          return {
            id: t.id,
            url: t.view.webContents.getURL() || 'about:blank',
            title: t.view.webContents.getTitle() || 'New Tab',
            sessionId: t.sessionId,
            partition: t.partition,
            containerId: t.containerId,
            createdAt: t.createdAt,
            lastActiveAt: t.lastActiveAt,
            profileId: t.profileId,
          };
        } catch {
          // Tab might be destroyed, skip
          return null;
        }
      }).filter(Boolean) as WindowState['tabs'];

      const bounds = win.getBounds();
      const windowCreatedAt = (win as any).__ob_createdAt ?? Date.now();
      const windowLastFocused = (win as any).__ob_lastFocusedAt ?? windowCreatedAt;

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
        activeTabId: getActiveTabIdForWindow(win.id),
        activeSessionId: sessionManager.getActiveSession()?.id || null,
        createdAt: windowCreatedAt,
        lastFocusedAt: typeof windowLastFocused === 'number' ? windowLastFocused : windowCreatedAt,
      });
    }

    const sessions = sessionManager.listSessions();
    const snapshot: SessionState = {
      version: 1,
      updatedAt: Date.now(),
      windows: windowsState,
      sessions,
    };

    // Ensure directory exists - USER_DATA_DIR should already be initialized
    // But double-check and create if needed (synchronous operation)
    try {
      // Create directory synchronously with recursive option
      if (!existsSync(USER_DATA_DIR)) {
        mkdirSync(USER_DATA_DIR, { recursive: true });
      }
      // Verify it exists now (synchronous check)
      if (!existsSync(USER_DATA_DIR)) {
        // Directory creation failed - skip this save
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Session] Directory does not exist after creation attempt');
        }
        return;
      }
      // Also verify we can write to it
      try {
        await fs.access(USER_DATA_DIR, fs.constants.W_OK);
      } catch {
        // No write permission - skip this save
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Session] No write permission to directory');
        }
        return;
      }
    } catch (error: any) {
      // Directory creation failed - skip this save silently
      // Only log in dev mode for non-critical errors
      if (process.env.NODE_ENV === 'development' && error.code !== 'EEXIST') {
        console.warn('[Session] Failed to ensure directory exists:', error.message);
      }
      return;
    }
    
    // Atomic write: write to temp file, then rename
    const tempFile = `${SNAPSHOT_FILE}.tmp`;
    const snapshotJson = JSON.stringify(snapshot, null, 2);
    
    try {
      // Write temp file directly to the directory (which we know exists and is writable)
      await fs.writeFile(tempFile, snapshotJson, 'utf-8');
      
      // Verify temp file was created successfully
      try {
        await fs.access(tempFile);
      } catch {
        // Temp file wasn't created - skip rename
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Session] Temp file was not created');
        }
        return;
      }
      
      // Rename (atomic operation) - directory is guaranteed to exist at this point
      await fs.rename(tempFile, SNAPSHOT_FILE);
      
    } catch (error: any) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempFile).catch(() => {});
      } catch {}
      
      // If rename fails with ENOENT, directory might have been deleted (unlikely but possible)
      if (error.code === 'ENOENT') {
        // Try one more time to create directory and retry
        try {
          // Ensure directory exists again
          if (!existsSync(USER_DATA_DIR)) {
            mkdirSync(USER_DATA_DIR, { recursive: true });
          }
          // Verify directory exists before retry
          if (existsSync(USER_DATA_DIR)) {
            await fs.writeFile(tempFile, snapshotJson, 'utf-8');
            // Verify temp file exists before rename
            try {
              await fs.access(tempFile);
              await fs.rename(tempFile, SNAPSHOT_FILE);
            } catch {
              try {
                await fs.unlink(tempFile).catch(() => {});
              } catch {}
            }
          }
        } catch (retryError: any) {
          // Final failure - silent fail in production, log in dev
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Session] Failed to save after retry:', retryError.message);
          }
        }
      } else {
        // Other errors (permissions, disk full, etc.) - silent fail in production
        if (process.env.NODE_ENV === 'development' && error.code !== 'EBUSY') {
          console.warn('[Session] Failed to save snapshot:', error.message);
        }
      }
    } finally {
      isSaving = false;
    }

    // Also append to JSONL for audit trail (keep last 100 entries)
    // Directory should already exist from above, but verify
    const jsonlDir = path.dirname(SESSION_FILE);
    if (!existsSync(jsonlDir)) {
      try {
        mkdirSync(jsonlDir, { recursive: true });
      } catch {
        // Silent fail - JSONL is just audit trail
      }
    }
    
    const jsonlLine = JSON.stringify(snapshot) + '\n';
    try {
      await fs.appendFile(SESSION_FILE, jsonlLine, 'utf-8');
    } catch {
      // If file doesn't exist, create it
      try {
        await fs.writeFile(SESSION_FILE, jsonlLine, 'utf-8');
      } catch {
        // Silent fail for JSONL - it's just an audit trail
      }
    }

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
  } catch (error: any) {
    // Top-level error handler - only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.error('[Session] Failed to save session state:', error.message || error);
    }
  } finally {
    isSaving = false;
  }
}

/**
 * Load session state from disk
 */
export async function loadSessionState(): Promise<SessionState | null> {
  // Guard: only run in main process
  if (typeof app === 'undefined' || !app.isReady()) {
    return null;
  }
  
  // Ensure paths are initialized
  if (!SNAPSHOT_FILE) {
    initializePaths();
    if (!SNAPSHOT_FILE) {
      return null;
    }
  }
  
  try {
    const content = await fs.readFile(SNAPSHOT_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return migrateLegacySnapshot(parsed);
  } catch (error) {
    // No saved state, return null
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load session state:', error);
      }
    }
    return null;
  }
}

/**
 * Restore windows from snapshot
 */
export async function restoreWindows(
  snapshot: SessionState,
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
      if (!win || win.isDestroyed()) continue;
      (win as any).__ob_createdAt = windowState.createdAt ?? Date.now();
      (win as any).__ob_lastFocusedAt = windowState.lastFocusedAt ?? Date.now();

      // Restore tabs after a brief delay to ensure window is ready
      setTimeout(() => {
        void restoreWindowTabs(win, windowState);
      }, 150);
    } catch (error) {
      console.error('Failed to restore window:', error);
    }
  }
}

export async function restoreWindowTabs(win: BrowserWindow, windowState: WindowState): Promise<void> {
  if (!win || win.isDestroyed()) return;
  try {
    closeAllTabs(win);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Session] Failed to close existing tabs before restore', error);
    }
  }

  for (const tabState of windowState.tabs) {
    try {
      await createTabOnWindow(win, {
        id: tabState.id,
        url: tabState.url || 'about:blank',
        sessionId: tabState.sessionId,
        containerId: tabState.containerId,
        profileId: tabState.profileId,
        createdAt: tabState.createdAt,
        lastActiveAt: tabState.lastActiveAt,
        activate: false,
        fromSessionRestore: true,
      });
    } catch (error) {
      console.error('[Session] Failed to create restored tab', error);
    }
  }

  const targetTabId = windowState.activeTabId || windowState.tabs[0]?.id;
  if (targetTabId) {
    activateTabByWindowId(win.id, targetTabId);
  }
}

export async function getLastSessionSummary(): Promise<SessionSummary | null> {
  const snapshot = await loadSessionState();
  if (!snapshot) return null;
  const tabCount = snapshot.windows.reduce((total, win) => total + win.tabs.length, 0);
  return {
    updatedAt: snapshot.updatedAt,
    windowCount: snapshot.windows.length,
    tabCount,
  };
}

export function registerSessionStateIpc(): void {
  registerHandler('session:lastSnapshotSummary', z.object({}), async () => {
    const summary = await getLastSessionSummary();
    return { summary };
  });

  registerHandler('session:restoreLast', z.object({}), async (event) => {
    const snapshot = await loadSessionState();
    if (!snapshot || snapshot.windows.length === 0) {
      return { restored: false };
    }

    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) {
      return { restored: false };
    }

    const targetState =
      snapshot.windows.find((w) => w.id === win.id) ?? snapshot.windows[0];

    try {
      if (targetState.bounds) {
        try {
          win.setBounds({
            x: targetState.bounds.x,
            y: targetState.bounds.y,
            width: targetState.bounds.width,
            height: targetState.bounds.height,
          });
          if (targetState.bounds.isMaximized) {
            win.maximize();
          } else if (win.isMaximized()) {
            win.unmaximize();
          }
        } catch {}
      }

      win.webContents.send('session:restoring', true);
      await restoreWindowTabs(win, targetState);
      win.webContents.send('session:restoring', false);
      return { restored: true, tabCount: targetState.tabs.length };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Session] Failed to restore last snapshot via IPC', error);
      }
      win.webContents.send('session:restoring', false);
      return { restored: false, error: (error as Error).message };
    }
  });
}

/**
 * Start automatic persistence (every 3 seconds)
 */
export function startSessionPersistence(): void {
  // Guard: only run in main process
  if (typeof app === 'undefined' || !app.isReady()) {
    // Wait for app to be ready
    app.once('ready', startSessionPersistence);
    return;
  }
  
  // Ensure paths are initialized
  initializePaths();
  
  if (!USER_DATA_DIR || !SNAPSHOT_FILE) {
    // Paths not initialized - skip persistence
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Session] Cannot start persistence - paths not initialized');
    }
    return;
  }

  // Save immediately on start (but don't block if it fails)
  saveSessionState().catch(() => {
    // Silent fail - will retry on next interval
  });

  // Save every 2 seconds
  persistenceTimerRef.current = setInterval(() => {
    saveSessionState().catch(() => {
      // Silent fail - session persistence is non-critical
    });
  }, 2000);

  // Save on app close
  app.on('before-quit', () => {
    isShuttingDown = true;
    if (persistenceTimerRef.current) {
      clearInterval(persistenceTimerRef.current);
      persistenceTimerRef.current = null;
    }
    // Final save (synchronous to ensure it completes)
    saveSessionState().catch(() => {
      // Silent fail on shutdown
    });
  });

  // Track focus to keep metadata fresh
  app.on('browser-window-focus', (_event, focusedWindow) => {
    if (focusedWindow) {
      (focusedWindow as any).__ob_lastFocusedAt = Date.now();
    }
  });

  // Save on window blur and when all windows closed
  app.on('browser-window-blur', () => {
    saveSessionState().catch(() => {});
  });

  app.on('window-all-closed', () => {
    saveSessionState().catch(() => {});
  });
}

/**
 * Stop automatic persistence
 */
export function stopSessionPersistence(): void {
  if (persistenceTimerRef.current) {
    clearInterval(persistenceTimerRef.current);
    persistenceTimerRef.current = null;
  }
}

/**
 * Force immediate save (for testing or manual triggers)
 */
export function forceSaveSessionState(): Promise<void> {
  return saveSessionState();
}

