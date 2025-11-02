/**
 * Crash Recovery - State snapshot and restore
 */

import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

export interface Snapshot {
  id: string;
  timestamp: number;
  windows: Array<{
    bounds: { x: number; y: number; width: number; height: number };
    tabs: Array<{ id: string; url: string; title?: string }>;
    activeTabId?: string;
  }>;
  workspace?: string;
}

export class CrashRecovery {
  private storagePath: string;
  private readonly MAX_SNAPSHOTS = 10;

  constructor() {
    this.storagePath = path.join(app.getPath('userData'), 'snapshots');
    this.ensureStorageDir();
  }

  /**
   * Create a snapshot of current state
   */
  async createSnapshot(windows: Snapshot['windows'], workspace?: string): Promise<string> {
    const snapshot: Snapshot = {
      id: `snapshot_${Date.now()}`,
      timestamp: Date.now(),
      windows,
      workspace,
    };

    const filePath = path.join(this.storagePath, `${snapshot.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');

    // Clean up old snapshots
    await this.cleanupOldSnapshots();

    return snapshot.id;
  }

  /**
   * Restore from snapshot
   */
  async restoreSnapshot(snapshotId: string): Promise<Snapshot | null> {
    const filePath = path.join(this.storagePath, `${snapshotId}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const snapshot = JSON.parse(content) as Snapshot;
      return snapshot;
    } catch {
      return null;
    }
  }

  /**
   * Get latest snapshot
   */
  async getLatestSnapshot(): Promise<Snapshot | null> {
    try {
      const files = await fs.readdir(this.storagePath);
      const snapshots = files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
        .sort()
        .reverse();

      if (snapshots.length === 0) return null;

      return await this.restoreSnapshot(snapshots[0]);
    } catch {
      return null;
    }
  }

  /**
   * List all snapshots
   */
  async listSnapshots(): Promise<Array<{ id: string; timestamp: number }>> {
    try {
      const files = await fs.readdir(this.storagePath);
      const snapshots: Array<{ id: string; timestamp: number }> = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const snapshotId = file.replace('.json', '');
          const snapshot = await this.restoreSnapshot(snapshotId);
          if (snapshot) {
            snapshots.push({
              id: snapshot.id,
              timestamp: snapshot.timestamp,
            });
          }
        }
      }

      return snapshots.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    const filePath = path.join(this.storagePath, `${snapshotId}.json`);
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Clean up old snapshots
   */
  private async cleanupOldSnapshots(): Promise<void> {
    const snapshots = await this.listSnapshots();
    
    if (snapshots.length > this.MAX_SNAPSHOTS) {
      const toDelete = snapshots.slice(this.MAX_SNAPSHOTS);
      for (const snapshot of toDelete) {
        await this.deleteSnapshot(snapshot.id);
      }
    }
  }

  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
    } catch (error) {
      console.error('[CrashRecovery] Failed to create storage directory:', error);
    }
  }
}

// Singleton instance
let crashRecoveryInstance: CrashRecovery | null = null;

export function getCrashRecovery(): CrashRecovery {
  if (!crashRecoveryInstance) {
    crashRecoveryInstance = new CrashRecovery();
  }
  return crashRecoveryInstance;
}

