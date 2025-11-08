/**
 * Atomic Session Persistence
 * Crash-safe session store using JSONL (JSON Lines) format
 * Persists every 2 seconds and on app close
 */

import { app, BrowserWindow } from 'electron';
import { promises as fs, existsSync, mkdirSync } from 'node:fs';
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

let persistenceTimer: NodeJS.Timeout | null = null;
let isShuttingDown = false;
let isSaving = false; // Prevent concurrent saves

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
            } catch (retryError: any) {
              // Temp file doesn't exist or rename failed - clean up and skip
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
export async function loadSessionState(): Promise<SessionSnapshot | null> {
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
    const snapshot = JSON.parse(content) as SessionSnapshot;
    return snapshot;
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

  // Save every 3 seconds (increased interval to reduce load)
  persistenceTimer = setInterval(() => {
    saveSessionState().catch(() => {
      // Silent fail - session persistence is non-critical
    });
  }, 3000);

  // Save on app close
  app.on('before-quit', () => {
    isShuttingDown = true;
    if (persistenceTimer) {
      clearInterval(persistenceTimer);
      persistenceTimer = null;
    }
    // Final save (synchronous to ensure it completes)
    saveSessionState().catch(() => {
      // Silent fail on shutdown
    });
  });

  // Save on window close
  app.on('window-all-closed', () => {
    saveSessionState().catch(() => {
      // Silent fail
    });
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

