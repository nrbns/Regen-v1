/**
 * SessionStore - Atomic, crash-safe session persistence
 * 
 * Uses JSONL (JSON Lines) format with atomic writes via fs.rename() pattern
 * Autosaves every 2s + on window blur
 * Restores windows, tabs, activeTabId, and window bounds on startup
 */

import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const rename = promisify(fs.rename);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

interface TabState {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  active: boolean;
  mode?: 'normal' | 'ghost' | 'private';
  containerId?: string;
  containerName?: string;
  containerColor?: string;
  createdAt?: number;
  lastActiveAt?: number;
  sessionId?: string;
  profileId?: string;
  sleeping?: boolean;
}

interface WindowState {
  id: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    maximized?: boolean;
    fullscreen?: boolean;
  };
  tabs: TabState[];
  activeTabId: string | null;
  createdAt: number;
  lastActiveAt: number;
}

interface SessionState {
  version: string;
  timestamp: number;
  windows: WindowState[];
  globalState?: {
    lastActiveWindowId?: string;
  };
}

export class SessionStore {
  private sessionDir: string;
  private sessionFile: string;
  private tempFile: string;
  private autosaveTimer: NodeJS.Timeout | null = null;
  private pendingWrite: Promise<void> | null = null;
  private isDirty = false;
  private lastSaved: number = 0;
  private readonly AUTOSAVE_INTERVAL = 2000; // 2 seconds
  private readonly MIN_SAVE_INTERVAL = 500; // Throttle rapid saves

  constructor() {
    this.sessionDir = path.join(app.getPath('userData'), 'sessions');
    this.sessionFile = path.join(this.sessionDir, 'session.jsonl');
    this.tempFile = path.join(this.sessionDir, 'session.jsonl.tmp');
    
    // Ensure session directory exists
    this.ensureSessionDir();
  }

  private async ensureSessionDir(): Promise<void> {
    try {
      await mkdir(this.sessionDir, { recursive: true });
    } catch (error) {
      console.error('[SessionStore] Failed to create session directory:', error);
    }
  }

  /**
   * Save session state atomically
   * Uses write-to-temp + rename pattern for atomicity
   */
  async save(state: SessionState): Promise<void> {
    // Throttle rapid saves
    const now = Date.now();
    if (now - this.lastSaved < this.MIN_SAVE_INTERVAL && this.pendingWrite) {
      this.isDirty = true;
      return this.pendingWrite;
    }

    this.isDirty = false;
    this.lastSaved = now;

    const writePromise = (async () => {
      try {
        // Ensure directory exists
        await this.ensureSessionDir();

        // Serialize state to JSONL format (single line)
        const jsonLine = JSON.stringify(state) + '\n';

        // Write to temp file first
        await writeFile(this.tempFile, jsonLine, { encoding: 'utf8', flag: 'w' });

        // Force fsync for crash safety (if available)
        try {
          const fd = fs.openSync(this.tempFile, 'r+');
          fs.fsyncSync(fd);
          fs.closeSync(fd);
        } catch {
          // fsync not critical, continue
        }

        // Atomic rename (atomic on most filesystems)
        await rename(this.tempFile, this.sessionFile);

        // Clean up old temp files if they exist
        try {
          if (fs.existsSync(this.tempFile)) {
            fs.unlinkSync(this.tempFile);
          }
        } catch {
          // Ignore cleanup errors
        }
      } catch (error) {
        console.error('[SessionStore] Failed to save session:', error);
        throw error;
      }
    })();

    this.pendingWrite = writePromise;
    return writePromise;
  }

  /**
   * Load session state from disk
   * Returns null if no session exists or is corrupted
   */
  async load(): Promise<SessionState | null> {
    try {
      if (!fs.existsSync(this.sessionFile)) {
        return null;
      }

      const content = await readFile(this.sessionFile, { encoding: 'utf8' });
      const lines = content.trim().split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        return null;
      }

      // Read the last line (most recent session)
      const lastLine = lines[lines.length - 1];
      const state = JSON.parse(lastLine) as SessionState;

      // Validate structure
      if (!state || !state.windows || !Array.isArray(state.windows)) {
        console.warn('[SessionStore] Invalid session structure');
        return null;
      }

      return state;
    } catch (error) {
      console.error('[SessionStore] Failed to load session:', error);
      return null;
    }
  }

  /**
   * Start autosave timer
   * Saves every AUTOSAVE_INTERVAL ms
   */
  startAutosave(getState: () => SessionState): void {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
    }

    this.autosaveTimer = setInterval(() => {
      if (this.isDirty || !this.pendingWrite) {
        const state = getState();
        void this.save(state).catch((error) => {
          console.error('[SessionStore] Autosave failed:', error);
        });
      }
    }, this.AUTOSAVE_INTERVAL);
  }

  /**
   * Stop autosave timer
   */
  stopAutosave(): void {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  /**
   * Force immediate save (called on window blur, before quit)
   */
  async forceSave(state: SessionState): Promise<void> {
    this.stopAutosave();
    await this.save(state);
  }

  /**
   * Clear session (for "Start fresh" option)
   */
  async clear(): Promise<void> {
    try {
      if (fs.existsSync(this.sessionFile)) {
        fs.unlinkSync(this.sessionFile);
      }
      if (fs.existsSync(this.tempFile)) {
        fs.unlinkSync(this.tempFile);
      }
    } catch (error) {
      console.error('[SessionStore] Failed to clear session:', error);
    }
  }

  /**
   * Get session file path (for diagnostics)
   */
  getSessionFilePath(): string {
    return this.sessionFile;
  }
}

// Singleton instance
let sessionStoreInstance: SessionStore | null = null;

export function getSessionStore(): SessionStore {
  if (!sessionStoreInstance) {
    sessionStoreInstance = new SessionStore();
  }
  return sessionStoreInstance;
}

