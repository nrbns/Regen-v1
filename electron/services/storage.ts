import { ipcMain } from 'electron';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { GetSettingRequest, SetSettingRequest, ListWorkspacesResponse, SaveWorkspaceRequest } from '../shared/ipc/schema';
import { SettingsSchema, defaultSettings, mergeSettings } from '../shared/settings/schema';

const settings = new Map<string, unknown>();
// Initialize with defaults
const currentSettings = mergeSettings({});
settings.set('root', currentSettings);

type Workspace = { id: string; name: string; partition: string; proxyProfileId?: string };
const workspaces = new Map<string, Workspace>();
type Account = { id: string; name: string };
const accounts = new Map<string, Account>();
export type Download = { 
  id: string; 
  url: string; 
  filename?: string;
  status: 'downloading' | 'completed' | 'failed' | 'cancelled' | 'in-progress'; 
  path?: string; 
  createdAt: number;
  progress?: number;
  receivedBytes?: number;
  totalBytes?: number;
};

const downloads: Download[] = [];

export function addDownloadRecord(d: Download) {
  // Update existing download if it exists, otherwise add new
  const existingIndex = downloads.findIndex(dl => dl.id === d.id);
  if (existingIndex >= 0) {
    downloads[existingIndex] = { ...downloads[existingIndex], ...d };
  } else {
    downloads.unshift(d);
  }
  if (downloads.length > 1000) downloads.pop();
}

export function listDownloads(): Download[] {
  return [...downloads];
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
    return { success: true };
  });

  registerHandler('storage:getSetting', GetSettingRequest, async (_event, request) => {
    return settings.get(request.key);
  });

  registerHandler('storage:setSetting', SetSettingRequest, async (_event, request) => {
    settings.set(request.key, request.value);
    return { success: true };
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


