/**
 * Workspace v2 - Full tab layout save/restore
 * Enhanced workspace system with notes, proxies, layout
 */

import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

export interface TabLayout {
  id: string;
  url: string;
  title?: string;
  position: number;
}

export interface WorkspaceManifest {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  tabs: TabLayout[];
  notes?: Record<string, string>; // tabId -> note content
  proxyProfileId?: string;
  mode?: string;
  layout?: {
    sidebarWidth?: number;
    rightPanelWidth?: number;
    splitPaneRatio?: number;
  };
}

export class WorkspaceV2Service {
  private workspaces: Map<string, WorkspaceManifest> = new Map();
  private storagePath: string;

  constructor() {
    this.storagePath = path.join(app.getPath('userData'), 'workspaces-v2');
    this.ensureStorageDir();
  }

  /**
   * Save workspace with full state
   */
  async save(manifest: WorkspaceManifest): Promise<void> {
    const updated = {
      ...manifest,
      updatedAt: Date.now(),
    };
    
    this.workspaces.set(manifest.id, updated);
    
    // Persist to disk
    const filePath = path.join(this.storagePath, `${manifest.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
  }

  /**
   * Load workspace
   */
  async load(workspaceId: string): Promise<WorkspaceManifest | null> {
    // Check cache
    if (this.workspaces.has(workspaceId)) {
      return this.workspaces.get(workspaceId)!;
    }

    // Load from disk
    const filePath = path.join(this.storagePath, `${workspaceId}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const manifest = JSON.parse(content) as WorkspaceManifest;
      this.workspaces.set(workspaceId, manifest);
      return manifest;
    } catch {
      return null;
    }
  }

  /**
   * List all workspaces
   */
  async list(): Promise<WorkspaceManifest[]> {
    try {
      const files = await fs.readdir(this.storagePath);
      const workspaces: WorkspaceManifest[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const workspaceId = file.replace('.json', '');
          const workspace = await this.load(workspaceId);
          if (workspace) {
            workspaces.push(workspace);
          }
        }
      }

      return workspaces.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }

  /**
   * Delete workspace
   */
  async delete(workspaceId: string): Promise<void> {
    this.workspaces.delete(workspaceId);
    const filePath = path.join(this.storagePath, `${workspaceId}.json`);
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Update workspace notes
   */
  async updateNotes(workspaceId: string, tabId: string, note: string): Promise<void> {
    const workspace = await this.load(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (!workspace.notes) {
      workspace.notes = {};
    }

    workspace.notes[tabId] = note;
    await this.save(workspace);
  }

  /**
   * Get workspace notes
   */
  async getNotes(workspaceId: string): Promise<Record<string, string>> {
    const workspace = await this.load(workspaceId);
    return workspace?.notes || {};
  }

  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
    } catch (error) {
      console.error('[WorkspaceV2] Failed to create storage directory:', error);
    }
  }
}

// Singleton instance
let workspaceV2Instance: WorkspaceV2Service | null = null;

export function getWorkspaceV2Service(): WorkspaceV2Service {
  if (!workspaceV2Instance) {
    workspaceV2Instance = new WorkspaceV2Service();
  }
  return workspaceV2Instance;
}

