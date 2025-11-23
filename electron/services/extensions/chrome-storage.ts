/**
 * Chrome Storage API Implementation
 * Provides chrome.storage.* APIs to extensions
 */

import { app } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { EventEmitter } from 'events';

interface StorageArea {
  get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
  getBytesInUse(keys?: string | string[] | null): Promise<number>;
}

class ChromeStorageLocal implements StorageArea {
  private extensionId: string;
  private storagePath: string;
  private data: Record<string, unknown> = {};
  private emitter: EventEmitter = new EventEmitter();

  constructor(extensionId: string) {
    this.extensionId = extensionId;
    this.storagePath = path.join(
      app.getPath('userData'),
      'extensions',
      extensionId,
      'storage.json'
    );
    this.load();
  }

  /**
   * Load storage from disk
   */
  private async load(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      const content = await fs.readFile(this.storagePath, 'utf-8');
      this.data = JSON.parse(content);
    } catch {
      // File doesn't exist yet, start with empty data
      this.data = {};
    }
  }

  /**
   * Save storage to disk
   */
  private async save(): Promise<void> {
    try {
      await fs.writeFile(this.storagePath, JSON.stringify(this.data, null, 2), 'utf-8');
      this.emitter.emit('change', this.data);
    } catch (error) {
      console.error(`[ChromeStorage] Failed to save storage for ${this.extensionId}:`, error);
    }
  }

  async get(
    keys?: string | string[] | Record<string, unknown> | null
  ): Promise<Record<string, unknown>> {
    if (keys === null || keys === undefined) {
      return { ...this.data };
    }

    if (typeof keys === 'string') {
      return { [keys]: this.data[keys] };
    }

    if (Array.isArray(keys)) {
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        result[key] = this.data[key];
      }
      return result;
    }

    // Object with default values
    const result: Record<string, unknown> = {};
    for (const key in keys) {
      result[key] = this.data[key] ?? keys[key];
    }
    return result;
  }

  async set(items: Record<string, unknown>): Promise<void> {
    Object.assign(this.data, items);
    await this.save();
  }

  async remove(keys: string | string[]): Promise<void> {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    for (const key of keysArray) {
      delete this.data[key];
    }
    await this.save();
  }

  async clear(): Promise<void> {
    this.data = {};
    await this.save();
  }

  async getBytesInUse(keys?: string | string[] | null): Promise<number> {
    const data = await this.get(keys);
    return JSON.stringify(data).length;
  }

  /**
   * Listen for storage changes
   */
  onChanged(
    callback: (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
      areaName: string
    ) => void
  ): void {
    this.emitter.on('change', (newData: Record<string, unknown>) => {
      // Calculate changes (simplified)
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
      for (const key in newData) {
        changes[key] = { newValue: newData[key] };
      }
      callback(changes, 'local');
    });
  }
}

class ChromeStorageSync implements StorageArea {
  // Similar to local but with quota limits
  private extensionId: string;
  private storagePath: string;
  private data: Record<string, unknown> = {};
  private QUOTA_BYTES = 102400; // 100KB

  constructor(extensionId: string) {
    this.extensionId = extensionId;
    this.storagePath = path.join(
      app.getPath('userData'),
      'extensions',
      extensionId,
      'sync-storage.json'
    );
    this.load();
  }

  private async load(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      const content = await fs.readFile(this.storagePath, 'utf-8');
      this.data = JSON.parse(content);
    } catch {
      this.data = {};
    }
  }

  private async save(): Promise<void> {
    try {
      const size = JSON.stringify(this.data).length;
      if (size > this.QUOTA_BYTES) {
        throw new Error(`Storage quota exceeded: ${size} > ${this.QUOTA_BYTES}`);
      }
      await fs.writeFile(this.storagePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`[ChromeStorage] Failed to save sync storage:`, error);
      throw error;
    }
  }

  async get(
    keys?: string | string[] | Record<string, unknown> | null
  ): Promise<Record<string, unknown>> {
    if (keys === null || keys === undefined) {
      return { ...this.data };
    }
    if (typeof keys === 'string') {
      return { [keys]: this.data[keys] };
    }
    if (Array.isArray(keys)) {
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        result[key] = this.data[key];
      }
      return result;
    }
    const result: Record<string, unknown> = {};
    for (const key in keys) {
      result[key] = this.data[key] ?? keys[key];
    }
    return result;
  }

  async set(items: Record<string, unknown>): Promise<void> {
    Object.assign(this.data, items);
    await this.save();
  }

  async remove(keys: string | string[]): Promise<void> {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    for (const key of keysArray) {
      delete this.data[key];
    }
    await this.save();
  }

  async clear(): Promise<void> {
    this.data = {};
    await this.save();
  }

  async getBytesInUse(keys?: string | string[] | null): Promise<number> {
    const data = await this.get(keys);
    return JSON.stringify(data).length;
  }
}

/**
 * Create storage API for extension
 */
export function createChromeStorage(extensionId: string): {
  local: ChromeStorageLocal;
  sync: ChromeStorageSync;
} {
  return {
    local: new ChromeStorageLocal(extensionId),
    sync: new ChromeStorageSync(extensionId),
  };
}
