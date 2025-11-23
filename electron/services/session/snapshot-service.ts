/**
 * Enhanced Session Snapshot Service
 * Saves comprehensive session state to disk for crash recovery
 */

import { app, BrowserWindow } from 'electron';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createLogger } from '../utils/logger';
import { getTabs, getActiveTabId } from '../tabs';
// We'll import these directly from tabs service
// Using dynamic import to avoid circular dependencies
async function _getChromeOffsets(_winId: number) {
  try {
    await import('../tabs');
    // Access the internal map - we'll need to export getters from tabs.ts
    return undefined; // Will be set via IPC or direct access
  } catch {
    return undefined;
  }
}

async function _getRightDockPx(_winId: number) {
  try {
    await import('../tabs');
    return undefined; // Will be set via IPC or direct access
  } catch {
    return undefined;
  }
}

const log = createLogger('session-snapshot');

export interface EnhancedSessionSnapshot {
  version: number;
  tabs: Array<{
    id: string;
    url: string;
    title: string;
    active: boolean;
    mode?: 'normal' | 'ghost' | 'private';
    containerId?: string;
    createdAt?: number;
    lastActiveAt?: number;
  }>;
  workspaces?: Array<{
    id: string;
    name: string;
    tabs: string[];
  }>;
  mode: 'research' | 'trade' | 'game' | 'normal' | 'Browse' | 'Research' | 'Trade';
  activeTabId: string | null;
  chromeOffsets?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  rightDockPx?: number;
  timestamp: number;
}

export class SessionSnapshotService {
  private snapshotPath: string;
  private snapshotInterval: NodeJS.Timeout | null = null;
  private readonly SNAPSHOT_INTERVAL = 30000; // 30 seconds
  private readonly MAX_SNAPSHOT_AGE = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.snapshotPath = join(app.getPath('userData'), 'session-snapshot.json');
  }

  /**
   * Start periodic snapshotting for a window
   */
  startSnapshotting(win: BrowserWindow): void {
    // Snapshot immediately
    void this.snapshot(win);

    // Then every 30 seconds
    this.snapshotInterval = setInterval(() => {
      void this.snapshot(win);
    }, this.SNAPSHOT_INTERVAL);

    // Also snapshot on window close
    win.on('close', () => {
      void this.snapshot(win);
    });

    log.info('Session snapshotting started', { interval: this.SNAPSHOT_INTERVAL });
  }

  /**
   * Stop snapshotting
   */
  stopSnapshotting(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
      log.info('Session snapshotting stopped');
    }
  }

  /**
   * Create and save a snapshot
   */
  private async snapshot(win: BrowserWindow): Promise<void> {
    try {
      const tabs = getTabs(win);
      const activeTabId = getActiveTabId(win);

      // Get chrome offsets and right dock
      const tabsModule = await import('../tabs');
      const chromeOffsets = tabsModule.getChromeOffsetsForWindow(win.id);
      const rightDockPx = tabsModule.getRightDockPxForWindow(win.id);

      // Get current mode (we'll need to get this from renderer or store)
      // For now, default to 'normal'
      const mode = 'normal';

      const snapshot: EnhancedSessionSnapshot = {
        version: 1,
        tabs: tabs.map(tab => {
          try {
            const wc = tab.view.webContents;
            return {
              id: tab.id,
              url: wc.getURL() || 'about:blank',
              title: wc.getTitle() || 'New Tab',
              active: tab.id === activeTabId,
              mode: tab.mode || 'normal',
              containerId: tab.containerId,
              createdAt: tab.createdAt,
              lastActiveAt: tab.lastActiveAt,
            };
          } catch {
            return {
              id: tab.id,
              url: 'about:blank',
              title: 'New Tab',
              active: tab.id === activeTabId,
              mode: tab.mode || 'normal',
              containerId: tab.containerId,
              createdAt: tab.createdAt,
              lastActiveAt: tab.lastActiveAt,
            };
          }
        }),
        mode,
        activeTabId,
        chromeOffsets,
        rightDockPx,
        timestamp: Date.now(),
      };

      // Write atomically (write to temp, then rename)
      const tempPath = this.snapshotPath + '.tmp';
      writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf8');

      // Atomic rename
      if (process.platform === 'win32') {
        // Windows: delete old, then rename
        if (existsSync(this.snapshotPath)) {
          const fs = require('fs');
          fs.unlinkSync(this.snapshotPath);
        }
        const fs = require('fs');
        fs.renameSync(tempPath, this.snapshotPath);
      } else {
        const fs = require('fs');
        fs.renameSync(tempPath, this.snapshotPath);
      }

      log.info('Session snapshot saved', { tabCount: snapshot.tabs.length });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('Failed to save snapshot', { error: err.message, stack: err.stack });
    }
  }

  /**
   * Restore snapshot from disk
   */
  static restore(): EnhancedSessionSnapshot | null {
    const snapshotPath = join(app.getPath('userData'), 'session-snapshot.json');

    if (!existsSync(snapshotPath)) {
      return null;
    }

    try {
      const content = readFileSync(snapshotPath, 'utf8');
      const snapshot = JSON.parse(content) as EnhancedSessionSnapshot;

      // Validate snapshot age (don't restore if > 24 hours old)
      const age = Date.now() - snapshot.timestamp;
      if (age > 24 * 60 * 60 * 1000) {
        log.warn('Snapshot too old, skipping restore', { age });
        return null;
      }

      // Validate version
      if (snapshot.version !== 1) {
        log.warn('Snapshot version mismatch', { version: snapshot.version });
        return null;
      }

      return snapshot;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('Failed to restore snapshot', { error: err.message, stack: err.stack });
      return null;
    }
  }

  /**
   * Clear snapshot
   */
  clear(): void {
    try {
      if (existsSync(this.snapshotPath)) {
        const fs = require('fs');
        fs.unlinkSync(this.snapshotPath);
        log.info('Session snapshot cleared');
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('Failed to clear snapshot', { error: err.message });
    }
  }
}

export const sessionSnapshotService = new SessionSnapshotService();
