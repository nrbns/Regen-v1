import { contextBridge, ipcRenderer } from 'electron';

const api = {
  ping: async (): Promise<string> => ipcRenderer.invoke('app:ping'),
  tabs: {
    create: (url: string) => ipcRenderer.invoke('tabs:create', url),
    close: (id: string) => ipcRenderer.invoke('tabs:close', id),
    activate: (id: string) => ipcRenderer.invoke('tabs:activate', id),
    navigate: (id: string, url: string) => ipcRenderer.invoke('tabs:navigate', { id, url }),
    goBack: (id: string) => ipcRenderer.invoke('tabs:goBack', { id }),
    goForward: (id: string) => ipcRenderer.invoke('tabs:goForward', { id }),
    reload: (id: string) => ipcRenderer.invoke('tabs:reload', { id }),
    devtools: (id: string) => ipcRenderer.invoke('tabs:devtools', id),
    list: () => ipcRenderer.invoke('tabs:list'),
    onUpdated: (cb: (tabs: any[]) => void) => ipcRenderer.on('tabs:updated', (_e, t) => cb(t)),
    onNavigationState: (cb: (state: any) => void) => ipcRenderer.on('tabs:navigation-state', (_e, state) => cb(state)),
    overlayStart: () => ipcRenderer.invoke('tabs:overlay:start'),
    overlayGetPick: () => ipcRenderer.invoke('tabs:overlay:getPick'),
    overlayClear: () => ipcRenderer.invoke('tabs:overlay:clear'),
    createWithProfile: (accountId: string, url: string) => ipcRenderer.invoke('tabs:createWithProfile', { accountId, url }),
  },
  ui: {
    setRightDock: (px: number) => ipcRenderer.invoke('ui:setRightDock', px),
  },
  proxy: {
    set: (rules: unknown) => ipcRenderer.invoke('proxy:set', rules),
    status: () => ipcRenderer.invoke('proxy:status'),
    killSwitch: (enabled: boolean) => ipcRenderer.invoke('proxy:kill', enabled),
  },
  scrape: {
    enqueue: (task: unknown) => ipcRenderer.invoke('scrape:enqueue', task),
    get: (id: string) => ipcRenderer.invoke('scrape:get', id),
  },
  actions: {
    navigate: (url: string) => ipcRenderer.invoke('actions:navigate', url),
    findAndClick: (url: string, args: any) => ipcRenderer.invoke('actions:findAndClick', { url, args }),
    typeInto: (url: string, args: any) => ipcRenderer.invoke('actions:typeInto', { url, args }),
    waitFor: (url: string, args: any) => ipcRenderer.invoke('actions:waitFor', { url, args }),
    scroll: (url: string, args: any) => ipcRenderer.invoke('actions:scroll', { url, args }),
  },
  video: {
    start: (args: unknown) => ipcRenderer.invoke('video:start', args),
    cancel: (id: string) => ipcRenderer.invoke('video:cancel', id),
    onProgress: (cb: (e: unknown, d: unknown) => void) => ipcRenderer.on('video:progress', cb),
    consent: {
      get: () => ipcRenderer.invoke('video:consent:get'),
      set: (v: boolean) => ipcRenderer.invoke('video:consent:set', v),
    },
  },
  threats: {
    scanUrl: (u: string) => ipcRenderer.invoke('threats:scanUrl', u),
    scanFile: (p: string) => ipcRenderer.invoke('threats:scanFile', p),
  },
  storage: {
    getSetting: (k: string) => ipcRenderer.invoke('storage:getSetting', k),
    setSetting: (k: string, v: unknown) => ipcRenderer.invoke('storage:setSetting', { k, v }),
    listWorkspaces: () => ipcRenderer.invoke('storage:listWorkspaces'),
    saveWorkspace: (w: unknown) => ipcRenderer.invoke('storage:saveWorkspace', w),
    listDownloads: () => ipcRenderer.invoke('storage:listDownloads'),
    addDownload: (d: unknown) => ipcRenderer.invoke('storage:addDownload', d),
    listAccounts: () => ipcRenderer.invoke('storage:listAccounts'),
    saveAccount: (a: unknown) => ipcRenderer.invoke('storage:saveAccount', a),
  },
};

const agentApi = {
  start: (dsl: any) => ipcRenderer.invoke('agent:start', dsl),
  stop: (id: string) => ipcRenderer.invoke('agent:stop', id),
  status: (id: string) => ipcRenderer.invoke('agent:status', id),
  onToken: (cb: (t: any) => void) => ipcRenderer.on('agent:token', (_e, t) => cb(t)),
  onStep: (cb: (s: any) => void) => ipcRenderer.on('agent:step', (_e, s) => cb(s)),
  runs: () => ipcRenderer.invoke('agent:runs'),
  getRun: (id: string) => ipcRenderer.invoke('agent:run:get', id),
  executeSkill: (skill: string, args: any) => ipcRenderer.invoke('agent:executeSkill', { skill, args }),
};

const recorderApi = {
  start: () => ipcRenderer.invoke('recorder:start'),
  stop: () => ipcRenderer.invoke('recorder:stop'),
  getDsl: () => ipcRenderer.invoke('recorder:getDsl'),
};

const graphApi = {
  add: (n: any, edges: any) => ipcRenderer.invoke('graph:add', n, edges),
  get: (key: string) => ipcRenderer.invoke('graph:get', key),
  all: () => ipcRenderer.invoke('graph:all'),
  onAuto: (cb: (payload: any) => void) => ipcRenderer.on('graph:auto', (_e, payload) => cb(payload)),
};

const ledgerApi = {
  add: (url: string, passage: string) => ipcRenderer.invoke('ledger:add', { url, passage }),
  list: () => ipcRenderer.invoke('ledger:list'),
  verify: () => ipcRenderer.invoke('ledger:verify'),
};

const uiApi = {
  setRightDock: (px: number) => ipcRenderer.invoke('ui:setRightDock', px),
};

const historyApi = {
  list: () => ipcRenderer.invoke('history:list'),
  clear: () => ipcRenderer.invoke('history:clear'),
  onUpdated: (cb: () => void) => ipcRenderer.on('history:updated', (_e) => cb()),
};

const downloadsApi = {
  onUpdated: (cb: () => void) => ipcRenderer.on('downloads:updated', (_e) => cb()),
};

const researchApi = {
  query: (q: string) => ipcRenderer.invoke('research:query', q),
};

// Typed IPC bridge (for ob://ipc/v1/* channels)
const typedApi = {
  invoke: async (channel: string, request: unknown) => {
    try {
      const response = await ipcRenderer.invoke(channel, request);
      // Handle both wrapped ({ok, data}) and direct responses
      if (response && typeof response === 'object' && 'ok' in response) {
        if (!response.ok) {
          const errorMsg = (response as any).error || 'IPC call failed';
          if (process.env.NODE_ENV === 'development') {
            console.error(`[IPC] Error in ${channel}:`, errorMsg);
          }
          throw new Error(errorMsg);
        }
        // Return unwrapped data for typed IPC channels
        return (response as any).data;
      }
      // Direct response (legacy channels)
      return response;
    } catch (error) {
      // Only log actual IPC errors, not validation errors (which are expected)
      if (process.env.NODE_ENV === 'development' && error instanceof Error) {
        // Don't log if it's a validation/expected error
        if (!error.message.includes('IPC call failed') && !error.message.includes('Invalid')) {
          console.error(`[IPC] Error invoking ${channel}:`, error);
        }
      }
      throw error;
    }
  },
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => {
    const wrappedCallback = (_event: any, ...args: any[]) => {
      // IPC events come as (event, data), extract data
      const data = args.length > 0 ? args[0] : args;
      callback(_event, data);
    };
    ipcRenderer.on(channel, wrappedCallback);
    // Also listen to legacy channel if it's tabs:updated
    if (channel === 'tabs:updated' || channel === 'ob://ipc/v1/tabs:updated') {
      ipcRenderer.on('tabs:updated', wrappedCallback);
    }
  },
  removeListener: (channel: string, _callback: (event: any, ...args: any[]) => void) => {
    ipcRenderer.removeAllListeners(channel);
    if (channel === 'tabs:updated' || channel === 'ob://ipc/v1/tabs:updated') {
      ipcRenderer.removeAllListeners('tabs:updated');
    }
  },
};

declare global {
  interface Window {
    api: typeof api;
    agent: typeof agentApi;
    searchapi: any;
    recorder: typeof recorderApi;
    ipc: typeof typedApi;
    graph: typeof graphApi;
    ledger: typeof ledgerApi;
    ui: typeof uiApi;
    obHistory: typeof historyApi;
    downloads: typeof downloadsApi;
    research: typeof researchApi;
  }
}

// Expose all APIs to window
contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('agent', agentApi);
contextBridge.exposeInMainWorld('recorder', recorderApi);
contextBridge.exposeInMainWorld('graph', graphApi);
contextBridge.exposeInMainWorld('ledger', ledgerApi);
contextBridge.exposeInMainWorld('ui', uiApi);
contextBridge.exposeInMainWorld('obHistory', historyApi);
contextBridge.exposeInMainWorld('downloads', downloadsApi);
contextBridge.exposeInMainWorld('research', researchApi);
contextBridge.exposeInMainWorld('ipc', typedApi);

// Listen for fullscreen changes
ipcRenderer.on('app:fullscreen-changed', (_e, data) => {
  window.dispatchEvent(new CustomEvent('app:fullscreen-changed', { detail: data }));
});

// Listen for IPC ready signal from main process
ipcRenderer.on('ipc:ready', () => {
  window.dispatchEvent(new CustomEvent('ipc:ready'));
});

// Ensure window.ipc is available for legacy code
if (!window.ipc) {
  (window as any).ipc = typedApi;
}

// Immediately dispatch ready event if IPC is already set up
// This handles cases where the preload script loads after the ready signal
if (window.ipc && typeof window.ipc.invoke === 'function') {
  // Use setTimeout to ensure event listeners are registered
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('ipc:ready'));
  }, 0);
}


