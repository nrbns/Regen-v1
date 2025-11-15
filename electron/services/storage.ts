// @ts-nocheck

import { BrowserWindow, dialog, ipcMain, app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { GetSettingRequest, SetSettingRequest, ListWorkspacesResponse, SaveWorkspaceRequest } from '../shared/ipc/schema';
import { SettingsSchema, defaultSettings, mergeSettings, Settings } from '../shared/settings/schema';

const settings = new Map<string, unknown>();
// Initialize with defaults
const currentSettings = mergeSettings({});
settings.set('root', currentSettings);

// Settings file path
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

// Load settings from disk on startup
async function loadSettingsFromDisk(): Promise<void> {
  try {
    const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    const validated = SettingsSchema.parse(parsed);
    settings.set('root', validated);
  } catch (error) {
    // File doesn't exist or invalid - use defaults
    if ((error as any).code !== 'ENOENT') {
      console.warn('[Storage] Failed to load settings from disk:', error);
    }
    // Save defaults to disk
    await saveSettingsToDisk();
  }
}

// Save settings to disk
async function saveSettingsToDisk(): Promise<void> {
  try {
    const current = settings.get('root') || defaultSettings;
    const validated = SettingsSchema.parse(current);
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(validated, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Storage] Failed to save settings to disk:', error);
  }
}

// Load settings on module initialization
loadSettingsFromDisk().catch(console.error);

type Workspace = { id: string; name: string; partition: string; proxyProfileId?: string };
const workspaces = new Map<string, Workspace>();
type Account = { id: string; name: string };
const accounts = new Map<string, Account>();

export type DownloadSafety = {
  status: 'pending' | 'clean' | 'warning' | 'blocked' | 'unknown';
  threatLevel?: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
  recommendations?: string[];
  scannedAt?: number;
  quarantinePath?: string;
};

export type Download = { 
  id: string; 
  url: string; 
  filename?: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'blocked' | 'verifying'; 
  path?: string; 
  createdAt: number;
  progress?: number;
  receivedBytes?: number;
  totalBytes?: number;
  checksum?: string; // SHA-256 checksum for verification
  safety?: DownloadSafety;
  speedBytesPerSec?: number;
  etaSeconds?: number;
};

const downloads: Download[] = [];

export function addDownloadRecord(d: Download) {
  // Update existing download if it exists, otherwise add new
  const existingIndex = downloads.findIndex(dl => dl.id === d.id);
  if (existingIndex >= 0) {
    downloads[existingIndex] = { 
      ...downloads[existingIndex], 
      ...d, 
      safety: { ...(downloads[existingIndex].safety ?? {}), ...(d.safety ?? {}) },
      speedBytesPerSec: d.speedBytesPerSec ?? downloads[existingIndex].speedBytesPerSec,
      etaSeconds: d.etaSeconds ?? downloads[existingIndex].etaSeconds,
    };
  } else {
    downloads.unshift(d);
  }
  if (downloads.length > 1000) downloads.pop();
}

export function listDownloads(): Download[] {
  return [...downloads];
}

export function getCurrentSettings(): Settings {
  const root = settings.get('root');
  if (!root) {
    return defaultSettings;
  }
  return SettingsSchema.parse(root);
}

export function registerStorageIpc() {
  // Typed IPC handlers
  registerHandler('settings:get', z.object({}), async () => {
    const root = settings.get('root');
    if (!root) {
      return defaultSettings;
    }
    return SettingsSchema.parse(root);
  });

  registerHandler('settings:set', z.object({
    path: z.array(z.string()),
    value: z.unknown(),
  }), async (_event, request) => {
    const current = settings.get('root') || defaultSettings;
    // Deep set using path array
    let target: any = current;
    for (let i = 0; i < request.path.length - 1; i++) {
      if (!target[request.path[i]]) target[request.path[i]] = {};
      target = target[request.path[i]];
    }
    target[request.path[request.path.length - 1]] = request.value;
    settings.set('root', SettingsSchema.parse(current));
    // Persist to disk
    await saveSettingsToDisk();
    return { success: true };
  });

  registerHandler('storage:getSetting', GetSettingRequest, async (_event, request) => {
    return settings.get(request.key);
  });

  registerHandler('storage:setSetting', SetSettingRequest, async (_event, request) => {
    settings.set(request.key, request.value);
    // If setting root settings, persist to disk
    if (request.key === 'root') {
      await saveSettingsToDisk();
    }
    return { success: true };
  });

  registerHandler('settings:exportAll', z.object({}), async (event) => {
    const current = SettingsSchema.parse(settings.get('root') || defaultSettings);
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow();
    const { canceled, filePath } = await dialog.showSaveDialog(win ?? undefined, {
      title: 'Export Settings',
      defaultPath: path.join(app.getPath('desktop'), 'omnibrowser-settings.json'),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }
    await fs.writeFile(filePath, JSON.stringify(current, null, 2), 'utf-8');
    return { success: true, path: filePath };
  });

  registerHandler('settings:importAll', z.object({}), async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(win ?? undefined, {
      title: 'Import Settings',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths || filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    const content = await fs.readFile(filePaths[0], 'utf-8');
    const parsed = SettingsSchema.parse(JSON.parse(content));
    settings.set('root', parsed);
    // Persist imported settings to disk
    await saveSettingsToDisk();
    return { success: true, path: filePaths[0], settings: parsed };
  });

  registerHandler('storage:listWorkspaces', z.object({}), async () => {
    return Array.from(workspaces.values()) as z.infer<typeof ListWorkspacesResponse>;
  });

  registerHandler('storage:saveWorkspace', SaveWorkspaceRequest, async (_event, request) => {
    const workspace = {
      id: request.id,
      name: request.name,
      partition: request.partition,
      proxyProfileId: request.proxyProfileId,
    };
    workspaces.set(request.id, workspace);
    return workspace;
  });

  // Legacy handlers for backwards compatibility
  ipcMain.handle('storage:getSetting', (_e, k: string) => settings.get(k));
  ipcMain.handle('storage:setSetting', (_e, { k, v }: { k: string; v: unknown }) => {
    settings.set(k, v);
    return true;
  });
  ipcMain.handle('storage:listWorkspaces', () => Array.from(workspaces.values()));
  ipcMain.handle('storage:saveWorkspace', (_e, w: Workspace) => {
    workspaces.set(w.id, w);
    return w;
  });
  ipcMain.handle('storage:listDownloads', () => downloads);
  ipcMain.handle('storage:addDownload', (_e, d: Download) => {
    addDownloadRecord(d);
    return true;
  });
  ipcMain.handle('storage:listAccounts', () => Array.from(accounts.values()));
  ipcMain.handle('storage:saveAccount', (_e, a: Account) => {
    accounts.set(a.id, a);
    return a;
  });
}


