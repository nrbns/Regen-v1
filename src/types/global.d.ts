/**
 * Global type declarations for Electron renderer process
 */

declare global {
  interface Window {
    // Typed IPC (preload.ts exposes this)
    ipc?: {
      invoke: (channel: string, request: unknown) => Promise<unknown>;
      on?: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
      removeListener?: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
    };

    // Legacy API (preload.cjs exposes this)
    api?: {
      ping: () => Promise<string>;
      tabs: {
        create: (url: string) => Promise<unknown>;
        close: (id: string) => Promise<unknown>;
        activate: (id: string) => Promise<unknown>;
        navigate: (id: string, url: string) => Promise<unknown>;
        devtools: (id: string) => Promise<unknown>;
        list?: () => Promise<unknown>;
        onUpdated?: (cb: (tabs: any[]) => void) => void;
        overlayStart?: () => Promise<unknown>;
        overlayGetPick?: () => Promise<unknown>;
      };
      proxy: {
        set: (rules: unknown) => Promise<unknown>;
        status: () => Promise<unknown>;
        killSwitch: (enabled: boolean) => Promise<unknown>;
      };
      storage: {
        getSetting: (k: string) => Promise<unknown>;
        setSetting: (k: string, v: unknown) => Promise<unknown>;
        listWorkspaces: () => Promise<unknown>;
        saveWorkspace: (w: unknown) => Promise<unknown>;
        listAccounts?: () => Promise<unknown>;
        saveAccount?: (a: unknown) => Promise<unknown>;
      };
      [key: string]: any;
    };

    // Agent API (preload.cjs exposes this)
    agent?: {
      start: (dsl: any) => Promise<unknown>;
      stop: (id: string) => Promise<unknown>;
      status: (id: string) => Promise<unknown>;
      onToken: (cb: (t: any) => void) => void;
      onStep: (cb: (s: any) => void) => void;
      runs: () => Promise<unknown>;
      getRun: (id: string) => Promise<unknown>;
    };

    // Recorder API (preload.cjs exposes this)
    recorder?: {
      start: () => Promise<unknown>;
      stop: () => Promise<unknown>;
      getDsl: () => Promise<unknown>;
    };

    // Other APIs
    searchapi?: any;
    graph?: any;
    ledger?: any;
    ui?: any;
    obHistory?: any;
    downloads?: any;
    research?: any;
    regenExtensions?: {
      register: (extension: {
        id: string;
        name?: string;
        version?: string;
        activate?: () => void | Promise<void>;
        deactivate?: () => void | Promise<void>;
        provide?: Record<string, unknown>;
      }) => void;
      list?: () => Array<{ id: string; name?: string; version?: string }>;
    };
    __OB_API_BASE__?: string;

    // Tauri API
    __TAURI__?: {
      invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      event: {
        listen: <T = unknown>(
          event: string,
          handler: (event: { payload: T }) => void
        ) => Promise<() => void>;
        emit: (event: string, payload?: unknown) => Promise<void>;
      };
    };
  }
}

export {};
