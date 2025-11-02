import { contextBridge, ipcRenderer } from 'electron';

const api = {
  ping: async (): Promise<string> => ipcRenderer.invoke('app:ping'),
  tabs: {
    create: (url: string) => ipcRenderer.invoke('tabs:create', url),
    close: (id: string) => ipcRenderer.invoke('tabs:close', id),
    activate: (id: string) => ipcRenderer.invoke('tabs:activate', id),
    navigate: (id: string, url: string) => ipcRenderer.invoke('tabs:navigate', { id, url }),
    devtools: (id: string) => ipcRenderer.invoke('tabs:devtools', id),
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
  },
};

declare global {
  interface Window {
    api: typeof api;
    agent: typeof agentApi;
    searchapi: any;
    recorder: typeof recorderApi;
    ipc: typeof typedApi;
  }
}

contextBridge.exposeInMainWorld('api', api);

// Typed IPC bridge (for ob://ipc/v1/* channels)
const typedApi = {
  invoke: async (channel: string, request: unknown) => {
    return ipcRenderer.invoke(channel, request);
  },
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, callback);
  },
  removeListener: (channel: string, callback: (event: any, ...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
};

contextBridge.exposeInMainWorld('ipc', typedApi);

const agentApi = {
  start: (dsl: any) => ipcRenderer.invoke('agent:start', dsl),
  stop: (id: string) => ipcRenderer.invoke('agent:stop', id),
  status: (id: string) => ipcRenderer.invoke('agent:status', id),
  onToken: (cb: (t: any)=>void) => ipcRenderer.on('agent:token', (_e, t)=>cb(t)),
  onStep: (cb: (s: any)=>void) => ipcRenderer.on('agent:step', (_e, s)=>cb(s)),
  runs: () => ipcRenderer.invoke('agent:runs'),
  getRun: (id: string) => ipcRenderer.invoke('agent:run:get', id),
};

contextBridge.exposeInMainWorld('agent', agentApi);

const recorderApi = {
  start: () => ipcRenderer.invoke('recorder:start'),
  stop: () => ipcRenderer.invoke('recorder:stop'),
  getDsl: () => ipcRenderer.invoke('recorder:getDsl'),
};

contextBridge.exposeInMainWorld('recorder', recorderApi);


