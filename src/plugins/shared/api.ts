/**
 * Plugin API Types (renderer-safe copy)
 * This is a copy of electron/shared/plugins/api.ts for use in renderer plugins
 */

export type OBPermission =
  | 'network'
  | 'storage:scoped'
  | 'export:csv'
  | 'proxy:select'
  | 'model:local'
  | 'clipboard:r';

export interface OBHost {
  request(input: Request): Promise<Response>;
  storage: {
    get<T>(k: string): Promise<T | undefined>;
    set<T>(k: string, v: T): Promise<void>;
  };
  export: {
    csv(name: string, rows: Record<string, unknown>[]): Promise<string>;
  };
  ui: {
    mountPanel(app: unknown): void;
  };
  events: {
    on(event: string, cb: (...args: unknown[]) => void): void;
  };
}

export interface OBPlugin {
  init(host: OBHost): Promise<void>;
  dispose?(): Promise<void>;
}

