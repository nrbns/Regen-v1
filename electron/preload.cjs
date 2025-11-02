const { contextBridge, ipcRenderer } = require('electron');

const api = {
  ping: async () => ipcRenderer.invoke('app:ping'),
  tabs: {
    create: (url) => ipcRenderer.invoke('tabs:create', url),
    close: (id) => ipcRenderer.invoke('tabs:close', id),
    activate: (id) => ipcRenderer.invoke('tabs:activate', id),
    navigate: (id, url) => ipcRenderer.invoke('tabs:navigate', { id, url }),
    goBack: (id) => ipcRenderer.invoke('tabs:goBack', { id }),
    goForward: (id) => ipcRenderer.invoke('tabs:goForward', { id }),
    reload: (id) => ipcRenderer.invoke('tabs:reload', { id }),
    devtools: (id) => ipcRenderer.invoke('tabs:devtools', id),
    list: () => ipcRenderer.invoke('tabs:list'),
    onUpdated: (cb) => ipcRenderer.on('tabs:updated', (_e, t)=>cb(t)),
    onNavigationState: (cb) => ipcRenderer.on('tabs:navigation-state', (_e, state)=>cb(state)),
    overlayStart: () => ipcRenderer.invoke('tabs:overlay:start'),
    overlayGetPick: () => ipcRenderer.invoke('tabs:overlay:getPick'),
    overlayClear: () => ipcRenderer.invoke('tabs:overlay:clear'),
    createWithProfile: (accountId, url) => ipcRenderer.invoke('tabs:createWithProfile', { accountId, url }),
  },
  ui: {
    setRightDock: (px)=> ipcRenderer.invoke('ui:setRightDock', px)
  },
  proxy: {
    set: (rules) => ipcRenderer.invoke('proxy:set', rules),
    status: () => ipcRenderer.invoke('proxy:status'),
    killSwitch: (enabled) => ipcRenderer.invoke('proxy:kill', enabled),
  },
  scrape: {
    enqueue: (task) => ipcRenderer.invoke('scrape:enqueue', task),
    get: (id) => ipcRenderer.invoke('scrape:get', id),
  },
  video: {
    start: (args) => ipcRenderer.invoke('video:start', args),
    cancel: (id) => ipcRenderer.invoke('video:cancel', id),
    onProgress: (cb) => ipcRenderer.on('video:progress', cb),
    consent: {
      get: () => ipcRenderer.invoke('video:consent:get'),
      set: (v) => ipcRenderer.invoke('video:consent:set', v),
    },
  },
  threats: {
    scanUrl: (u) => ipcRenderer.invoke('threats:scanUrl', u),
    scanFile: (p) => ipcRenderer.invoke('threats:scanFile', p),
  },
  storage: {
    getSetting: (k) => ipcRenderer.invoke('storage:getSetting', k),
    setSetting: (k, v) => ipcRenderer.invoke('storage:setSetting', { k, v }),
    listWorkspaces: () => ipcRenderer.invoke('storage:listWorkspaces'),
    saveWorkspace: (w) => ipcRenderer.invoke('storage:saveWorkspace', w),
    listDownloads: () => ipcRenderer.invoke('storage:listDownloads'),
    addDownload: (d) => ipcRenderer.invoke('storage:addDownload', d),
    listAccounts: () => ipcRenderer.invoke('storage:listAccounts'),
    saveAccount: (a) => ipcRenderer.invoke('storage:saveAccount', a),
  },
  actions: {
    navigate: (url) => ipcRenderer.invoke('actions:navigate', url),
    findAndClick: (url, args) => ipcRenderer.invoke('actions:findAndClick', { url, args }),
    typeInto: (url, args) => ipcRenderer.invoke('actions:typeInto', { url, args }),
    waitFor: (url, args) => ipcRenderer.invoke('actions:waitFor', { url, args }),
    scroll: (url, args) => ipcRenderer.invoke('actions:scroll', { url, args }),
  },
};

const agentApi = {
  start: (dsl) => ipcRenderer.invoke('agent:start', dsl),
  stop: (id) => ipcRenderer.invoke('agent:stop', id),
  status: (id) => ipcRenderer.invoke('agent:status', id),
  onToken: (cb) => ipcRenderer.on('agent:token', (_e, t)=>cb(t)),
  onStep: (cb) => ipcRenderer.on('agent:step', (_e, s)=>cb(s)),
  runs: () => ipcRenderer.invoke('agent:runs'),
  getRun: (id) => ipcRenderer.invoke('agent:run:get', id),
};

const recorderApi = {
  start: () => ipcRenderer.invoke('recorder:start'),
  stop: () => ipcRenderer.invoke('recorder:stop'),
  getDsl: () => ipcRenderer.invoke('recorder:getDsl'),
};

const graphApi = {
  add: (n, edges)=> ipcRenderer.invoke('graph:add', n, edges),
  get: (key)=> ipcRenderer.invoke('graph:get', key),
  all: ()=> ipcRenderer.invoke('graph:all'),
  onAuto: (cb)=> ipcRenderer.on('graph:auto', (_e, payload)=> cb(payload)),
};

const ledgerApi = {
  add: (url, passage)=> ipcRenderer.invoke('ledger:add', { url, passage }),
  list: ()=> ipcRenderer.invoke('ledger:list'),
  verify: ()=> ipcRenderer.invoke('ledger:verify'),
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('agent', agentApi);
contextBridge.exposeInMainWorld('recorder', recorderApi);
contextBridge.exposeInMainWorld('graph', graphApi);
contextBridge.exposeInMainWorld('ledger', ledgerApi);

const uiApi = {
  setRightDock: (px)=> ipcRenderer.invoke('ui:setRightDock', px)
};

contextBridge.exposeInMainWorld('ui', uiApi);

const historyApi = {
  list: ()=> ipcRenderer.invoke('history:list'),
  clear: ()=> ipcRenderer.invoke('history:clear'),
  onUpdated: (cb)=> ipcRenderer.on('history:updated', (_e)=> cb()),
};

contextBridge.exposeInMainWorld('obHistory', historyApi);

const downloadsApi = {
  onUpdated: (cb)=> ipcRenderer.on('downloads:updated', (_e)=> cb()),
};

// Listen for fullscreen changes
ipcRenderer.on('app:fullscreen-changed', (_e, data)=> {
  window.dispatchEvent(new CustomEvent('app:fullscreen-changed', { detail: data }));
});

contextBridge.exposeInMainWorld('downloads', downloadsApi);

const researchApi = {
  query: (q)=> ipcRenderer.invoke('research:query', q),
};

contextBridge.exposeInMainWorld('research', researchApi);

// Typed IPC bridge (for ob://ipc/v1/* channels)
const typedApi = {
  invoke: async (channel, request) => {
    return ipcRenderer.invoke(channel, request);
  },
  on: (channel, callback) => {
    ipcRenderer.on(channel, callback);
    // Also listen to legacy channel if it's tabs:updated
    if (channel === 'tabs:updated') {
      ipcRenderer.on('tabs:updated', callback);
    }
  },
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
    if (channel === 'tabs:updated') {
      ipcRenderer.removeListener('tabs:updated', callback);
    }
  },
};

contextBridge.exposeInMainWorld('ipc', typedApi);


