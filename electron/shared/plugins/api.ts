/**
 * Plugin API Surface (OBHost)
 * Defines the interface available to plugins in their sandboxed runtime
 */

import { z } from 'zod';

export interface OBHost {
  /**
   * Make a robots-aware HTTP request
   * Requires 'network' permission
   */
  request(input: Request | string, init?: RequestInit): Promise<Response>;
  
  /**
   * Scoped storage (per-plugin isolation)
   * Requires 'storage:scoped' permission
   */
  storage: {
    get<T = unknown>(key: string): Promise<T | undefined>;
    set<T = unknown>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
  };
  
  /**
   * Export data
   * Requires 'export:csv' or 'export:json' permission
   */
  export: {
    csv(name: string, rows: Record<string, unknown>[]): Promise<string>; // Returns file path
    json(name: string, data: unknown): Promise<string>; // Returns file path
  };
  
  /**
   * Mount UI panel
   * Requires 'ui:panel' permission
   */
  ui: {
    mountPanel(component: unknown): void; // React component or string identifier
    unmountPanel(): void;
  };
  
  /**
   * Event subscription
   * Requires 'events' permission
   */
  events: {
    on(event: string, callback: (...args: unknown[]) => void): void;
    off(event: string, callback: (...args: unknown[]) => void): void;
    emit(event: string, ...args: unknown[]): void;
  };
  
  /**
   * Read clipboard
   * Requires 'clipboard:r' permission
   */
  clipboard: {
    read(): Promise<string>;
    write(text: string): Promise<void>; // Requires 'clipboard:w' permission
  };
  
  /**
   * Select proxy for next request
   * Requires 'proxy:select' permission
   */
  proxy: {
    select(profileId: string): Promise<void>;
    reset(): Promise<void>;
  };
  
  /**
   * Access local AI model
   * Requires 'model:local' permission
   */
  model: {
    prompt(messages: Array<{ role: string; content: string }>): Promise<string>;
  };
  
  /**
   * Read tab information
   * Requires 'tabs:read' permission
   */
  tabs: {
    list(): Promise<Array<{ id: string; title: string; url?: string }>>;
    getActive(): Promise<{ id: string; title: string; url?: string } | null>;
  };
}

export interface OBPlugin {
  /**
   * Initialize plugin (called when loaded)
   */
  init(host: OBHost): Promise<void>;
  
  /**
   * Cleanup (called when unloaded)
   */
  dispose?(): Promise<void>;
}

