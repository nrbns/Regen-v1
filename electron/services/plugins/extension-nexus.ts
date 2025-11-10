import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createLogger } from '../utils/logger';

const logger = createLogger('extension-nexus');

export interface NexusPluginMetadata {
  pluginId: string;
  name: string;
  version: string;
  description: string;
  author: string;
  sourcePeer: string;
  carbonScore?: number;
  tags?: string[];
}

export interface NexusPluginEntry extends NexusPluginMetadata {
  signature: string;
  publishedAt: number;
  downloads: number;
  trusted: boolean;
}

interface NexusSnapshot {
  entries: NexusPluginEntry[];
  updatedAt: number;
}

let entries: NexusPluginEntry[] = [];
let initialized = false;

function getStoragePath(): string {
  const dir = path.join(app.getPath('userData'), 'extension-nexus');
  return path.join(dir, 'network.json');
}

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  try {
    const filePath = getStoragePath();
    const content = await fs.readFile(filePath, 'utf-8');
    const snapshot = JSON.parse(content) as NexusSnapshot;
    entries = snapshot.entries ?? [];
  } catch {
    entries = [];
  }
  initialized = true;
}

function hashEntry(metadata: NexusPluginMetadata, nonce: string): string {
  return createHash('sha256')
    .update(JSON.stringify({ metadata, nonce }))
    .digest('hex');
}

async function persist(): Promise<void> {
  try {
    const filePath = getStoragePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const snapshot: NexusSnapshot = {
      entries,
      updatedAt: Date.now(),
    };
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  } catch (error) {
    logger.warn('Failed to persist extension nexus', error);
  }
}

export async function listNexusPlugins(): Promise<NexusPluginEntry[]> {
  await ensureInitialized();
  return entries.slice().sort((a, b) => b.publishedAt - a.publishedAt);
}

export async function publishNexusPlugin(metadata: NexusPluginMetadata): Promise<NexusPluginEntry> {
  await ensureInitialized();
  const nonce = randomUUID();
  const signature = hashEntry(metadata, nonce);
  const entry: NexusPluginEntry = {
    ...metadata,
    signature,
    publishedAt: Date.now(),
    downloads: 0,
    trusted: false,
    carbonScore: typeof metadata.carbonScore === 'number' ? metadata.carbonScore : Math.round(Math.random() * 30) + 40,
    tags: metadata.tags ?? [],
  };

  entries = entries.filter((existing) => existing.pluginId !== metadata.pluginId);
  entries.push(entry);
  await persist();
  return entry;
}

export async function toggleNexusTrust(pluginId: string, trusted: boolean): Promise<NexusPluginEntry | null> {
  await ensureInitialized();
  const entry = entries.find((item) => item.pluginId === pluginId);
  if (!entry) return null;
  entry.trusted = trusted;
  await persist();
  return entry;
}

export async function recordNexusDownload(pluginId: string): Promise<void> {
  await ensureInitialized();
  const entry = entries.find((item) => item.pluginId === pluginId);
  if (entry) {
    entry.downloads += 1;
    await persist();
  }
}

export async function listNexusPeers(): Promise<string[]> {
  await ensureInitialized();
  const peers = new Set<string>();
  for (const entry of entries) {
    peers.add(entry.sourcePeer);
  }
  return Array.from(peers.values());
}
