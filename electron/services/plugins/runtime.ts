/**
 * Plugin Runtime
 * Sandboxed execution environment for plugins
 */

import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PluginManifest, OBPermission } from '../../shared/plugins/manifest';
import { OBHost, OBPlugin } from '../../shared/plugins/api';
import * as PluginStorage from './storage';
import { robotsAwareFetch } from './fetch';
import { exportCSV, exportJSON } from './export';

export class PluginRuntime {
  private worker: Worker | null = null;
  private host: OBHost | null = null;
  private pluginInstance: OBPlugin | null = null;
  
  constructor(
    private id: string,
    private manifest: PluginManifest,
    private pluginPath: string
  ) {}
  
  async initialize(): Promise<void> {
    // Create sandboxed host API
    this.host = this.createHost();
    
    // Load plugin worker script
    const entryPath = join(this.pluginPath, this.manifest.entry);
    const entryUrl = pathToFileURL(entryPath).href;
    
    // Create Web Worker-like environment
    // For now, we'll use a simple RPC bridge
    // TODO: Implement full sandboxed worker with message passing
    
    // For MVP, we'll use a simplified approach
    // In production, this would be a proper Web Worker or isolated context
    
    console.log(`[PluginRuntime] Initialized plugin: ${this.id}`);
  }
  
  private createHost(): OBHost {
    const permissions = new Set(this.manifest.permissions);
    
    return {
      request: async (input: Request | string, init?: RequestInit) => {
        if (!permissions.has('network')) {
          throw new Error('Permission denied: network');
        }
        return robotsAwareFetch(input, init);
      },
      
      storage: {
        get: async <T>(key: string): Promise<T | undefined> => {
          if (!permissions.has('storage:scoped')) {
            throw new Error('Permission denied: storage:scoped');
          }
          return PluginStorage.getPluginStorage<T>(this.id, key);
        },
        set: async <T>(key: string, value: T): Promise<void> => {
          if (!permissions.has('storage:scoped')) {
            throw new Error('Permission denied: storage:scoped');
          }
          return PluginStorage.setPluginStorage(this.id, key, value);
        },
        delete: async (key: string): Promise<void> => {
          if (!permissions.has('storage:scoped')) {
            throw new Error('Permission denied: storage:scoped');
          }
          return PluginStorage.deletePluginStorage(this.id, key);
        },
        clear: async (): Promise<void> => {
          if (!permissions.has('storage:scoped')) {
            throw new Error('Permission denied: storage:scoped');
          }
          return PluginStorage.clearPluginStorage(this.id);
        },
        keys: async (): Promise<string[]> => {
          if (!permissions.has('storage:scoped')) {
            throw new Error('Permission denied: storage:scoped');
          }
          return PluginStorage.listPluginStorageKeys(this.id);
        },
      },
      
      export: {
        csv: async (name: string, rows: Record<string, unknown>[]): Promise<string> => {
          if (!permissions.has('export:csv')) {
            throw new Error('Permission denied: export:csv');
          }
          return exportCSV(name, rows);
        },
        json: async (name: string, data: unknown): Promise<string> => {
          if (!permissions.has('export:json')) {
            throw new Error('Permission denied: export:json');
          }
          return exportJSON(name, data);
        },
      },
      
      ui: {
        mountPanel: (component: React.ComponentType | string): void => {
          if (!permissions.has('ui:panel')) {
            throw new Error('Permission denied: ui:panel');
          }
          // TODO: Implement panel mounting
        },
        unmountPanel: (): void => {
          if (!permissions.has('ui:panel')) {
            throw new Error('Permission denied: ui:panel');
          }
        },
      },
      
      events: {
        on: (event: string, callback: (...args: unknown[]) => void): void => {
          if (!permissions.has('events')) {
            throw new Error('Permission denied: events');
          }
          // TODO: Implement event subscription
        },
        off: (event: string, callback: (...args: unknown[]) => void): void => {
          if (!permissions.has('events')) {
            throw new Error('Permission denied: events');
          }
        },
        emit: (event: string, ...args: unknown[]): void => {
          if (!permissions.has('events')) {
            throw new Error('Permission denied: events');
          }
        },
      },
      
      clipboard: {
        read: async (): Promise<string> => {
          if (!permissions.has('clipboard:r')) {
            throw new Error('Permission denied: clipboard:r');
          }
          // TODO: Implement clipboard read
          return '';
        },
        write: async (text: string): Promise<void> => {
          if (!permissions.has('clipboard:w')) {
            throw new Error('Permission denied: clipboard:w');
          }
          // TODO: Implement clipboard write
        },
      },
      
      proxy: {
        select: async (profileId: string): Promise<void> => {
          if (!permissions.has('proxy:select')) {
            throw new Error('Permission denied: proxy:select');
          }
          // TODO: Implement proxy selection
        },
        reset: async (): Promise<void> => {
          if (!permissions.has('proxy:select')) {
            throw new Error('Permission denied: proxy:select');
          }
        },
      },
      
      model: {
        prompt: async (messages: Array<{ role: string; content: string }>): Promise<string> => {
          if (!permissions.has('model:local')) {
            throw new Error('Permission denied: model:local');
          }
          // TODO: Implement local model access
          return '';
        },
      },
      
      tabs: {
        list: async (): Promise<Array<{ id: string; title: string; url?: string }>> => {
          if (!permissions.has('tabs:read')) {
            throw new Error('Permission denied: tabs:read');
          }
          // TODO: Implement tab listing
          return [];
        },
        getActive: async (): Promise<{ id: string; title: string; url?: string } | null> => {
          if (!permissions.has('tabs:read')) {
            throw new Error('Permission denied: tabs:read');
          }
          // TODO: Implement active tab getter
          return null;
        },
      },
    };
  }
  
  async dispose(): Promise<void> {
    if (this.pluginInstance?.dispose) {
      await this.pluginInstance.dispose();
    }
    
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    
    this.host = null;
    this.pluginInstance = null;
  }
  
  getHost(): OBHost | null {
    return this.host;
  }
}

