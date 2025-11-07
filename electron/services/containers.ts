import { app, BrowserWindow } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import {
  ContainerSchema,
  ContainerListResponse,
  ContainerCreateRequest,
  ContainerSetActiveRequest,
} from '../shared/ipc/schema';

export interface Container {
  id: string;
  name: string;
  color: string;
  icon?: string;
  partition: string;
  createdAt: number;
}

const CONTAINERS_FILE = path.join(app.getPath('userData'), 'containers.json');
const containers = new Map<string, Container>();
const activeContainerByWindow = new Map<number, string>();
let initialized = false;

function broadcastContainers() {
  const payload = { containers: listContainers() };
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      try {
        win.webContents.send('containers:list', payload);
      } catch {}
    }
  });
}

function ensureDefaults() {
  if (containers.size === 0) {
    const defaults: Container[] = [
      {
        id: 'default',
        name: 'Default',
        color: '#6366f1',
        partition: 'persist:default-container',
        createdAt: Date.now(),
      },
      {
        id: 'work',
        name: 'Work',
        color: '#0ea5e9',
        partition: 'persist:container-work',
        createdAt: Date.now(),
      },
      {
        id: 'personal',
        name: 'Personal',
        color: '#f97316',
        partition: 'persist:container-personal',
        createdAt: Date.now(),
      },
      {
        id: 'private',
        name: 'Private',
        color: '#22c55e',
        partition: 'persist:container-private',
        createdAt: Date.now(),
      },
    ];

    defaults.forEach((container) => {
      if (!containers.has(container.id)) {
        containers.set(container.id, container);
      }
    });
  }
}

async function loadContainersFromDisk() {
  try {
    const buffer = await fs.readFile(CONTAINERS_FILE, 'utf-8');
    const parsed = JSON.parse(buffer);
    if (Array.isArray(parsed)) {
      parsed.forEach((entry) => {
        const result = ContainerSchema.safeParse(entry);
        if (result.success) {
          containers.set(result.data.id, {
            ...result.data,
          });
        }
      });
    }
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.warn('[Containers] Failed to load containers:', error);
    }
  }
  ensureDefaults();
}

async function saveContainersToDisk() {
  const data = Array.from(containers.values());
  await fs.writeFile(CONTAINERS_FILE, JSON.stringify(data, null, 2), 'utf-8').catch((error) => {
    console.warn('[Containers] Failed to save containers:', error);
  });
  broadcastContainers();
}

export async function initializeContainers(): Promise<void> {
  if (initialized) return;
  await loadContainersFromDisk();
  initialized = true;
}

export function listContainers(): Container[] {
  ensureDefaults();
  return Array.from(containers.values());
}

export function getContainer(containerId?: string | null): Container | null {
  if (!containerId) return containers.get('default') || null;
  return containers.get(containerId) || containers.get('default') || null;
}

export function getActiveContainer(winId: number): Container | null {
  const containerId = activeContainerByWindow.get(winId) || 'default';
  return getContainer(containerId);
}

export function setActiveContainer(win: BrowserWindow, containerId: string): Container | null {
  const container = getContainer(containerId);
  if (!container) {
    return null;
  }
  activeContainerByWindow.set(win.id, container.id);
  try {
    win.webContents.send('containers:active', {
      containerId: container.id,
      container,
    });
  } catch {}
  return container;
}

export function ensureActiveContainer(win: BrowserWindow): Container | null {
  if (!activeContainerByWindow.has(win.id)) {
    const fallback = getContainer('default');
    if (fallback) {
      return setActiveContainer(win, fallback.id);
    }
  }
  return getActiveContainer(win.id);
}

export function registerContainersIpc() {
  registerHandler('containers:list', z.object({}), async () => {
    const result = listContainers();
    return ContainerListResponse.parse(result);
  });

  registerHandler('containers:create', ContainerCreateRequest, async (_event, request) => {
    const id = randomUUID();
    const container: Container = {
      id,
      name: request.name,
      color: request.color || '#22d3ee',
      icon: request.icon,
      partition: `persist:container:${id}`,
      createdAt: Date.now(),
    };
    containers.set(id, container);
    await saveContainersToDisk();
    return ContainerSchema.parse(container);
  });

  registerHandler('containers:delete', z.object({ containerId: z.string() }), async (_event, request) => {
    if (request.containerId === 'default') {
      throw new Error('Cannot delete default container');
    }
    containers.delete(request.containerId);
    await saveContainersToDisk();
    return { success: true };
  });

  registerHandler('containers:setActive', ContainerSetActiveRequest, async (event, request) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return { success: false };
    }
    const container = setActiveContainer(win, request.containerId);
    if (!container) {
      throw new Error('Container not found');
    }
    return ContainerSchema.parse(container);
  });

  registerHandler('containers:getActive', z.object({}), async (event) => {
    const win = event.sender ? BrowserWindow.fromWebContents(event.sender) : null;
    if (!win) {
      return ContainerSchema.parse(getContainer('default'));
    }
    const container = getActiveContainer(win.id) || getContainer('default');
    return ContainerSchema.parse(container);
  });
}

export function removeActiveContainer(winId: number) {
  activeContainerByWindow.delete(winId);
}

/**
 * Container Management
 * Per-tab ephemeral containers and "Burn Tab" functionality
 */

import { session, BrowserView } from 'electron';
import { randomUUID } from 'node:crypto';

interface TabContainer {
  tabId: string;
  partition: string;
  ephemeral: boolean;
  createdAt: number;
}

const tabContainers = new Map<string, TabContainer>();

/**
 * Create an ephemeral container for a tab
 */
export function createEphemeralContainer(tabId: string): string {
  const partition = `ephemeral:${randomUUID()}`;
  
  tabContainers.set(tabId, {
    tabId,
    partition,
    ephemeral: true,
    createdAt: Date.now(),
  });

  return partition;
}

/**
 * Get container for a tab
 */
export function getTabContainer(tabId: string): TabContainer | undefined {
  return tabContainers.get(tabId);
}

/**
 * Burn a tab (clear storage, cache, history)
 */
export async function burnTab(tabId: string, view: BrowserView): Promise<void> {
  const container = tabContainers.get(tabId);
  if (!container) return;

  const sess = session.fromPartition(container.partition);

  // Clear all storage
  await sess.clearStorageData({
    storages: [
      'cookies',
      'filesystem',
      'indexdb',
      'localstorage',
      'shadercache',
      'websql',
      'serviceworkers',
      'cachestorage',
    ],
  });

  // Clear cache
  await sess.clearCache();

  // Clear cookies
  await sess.cookies.flushStore();

  // Remove from container registry
  tabContainers.delete(tabId);

  console.log(`[Containers] Burned tab ${tabId}`);
}

/**
 * Check if tab is ephemeral
 */
export function isEphemeralTab(tabId: string): boolean {
  const container = tabContainers.get(tabId);
  return container?.ephemeral || false;
}

