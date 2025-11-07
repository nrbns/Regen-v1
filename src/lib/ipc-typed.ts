/**
 * Typed IPC Client for Renderer
 * Provides type-safe IPC calls with automatic error handling
 */

import { z } from 'zod';

type IPCResponse<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Make a typed IPC call
 * @param channel Channel name (without ob://ipc/v1/ prefix)
 * @param request Request payload
 * @param schema Optional response schema for validation
 */
// Plan type for agent
export interface Plan {
  id: string;
  goal: string;
  steps: Array<{
    id: string;
    action: string;
    args: Record<string, unknown>;
    dependsOn?: string[];
    expectedOutput?: string;
  }>;
  estimatedDuration?: number;
}

export async function ipcCall<TRequest, TResponse = unknown>(
  channel: string,
  request: TRequest,
  schema?: z.ZodSchema<TResponse>
): Promise<TResponse> {
  const fullChannel = `ob://ipc/v1/${channel}`;
  
  if (!window.ipc || typeof window.ipc.invoke !== 'function') {
    console.warn('IPC not available, returning default response');
    // Return empty array for array types, null for objects, empty string for strings
    return Promise.resolve((Array.isArray({} as TResponse) ? [] : null) as TResponse);
  }
  
  const response = await window.ipc.invoke(fullChannel, request) as IPCResponse<TResponse>;
  
  if (!response.ok) {
    throw new Error(response.error || 'IPC call failed');
  }
  
  if (schema && response.data !== undefined) {
    const parsed = schema.safeParse(response.data);
    if (!parsed.success) {
      throw new Error(`Invalid response: ${parsed.error.message}`);
    }
    return parsed.data;
  }
  
  return response.data as TResponse;
}

/**
 * Typed IPC client with pre-configured channels
 */
export const ipc = {
  tabs: {
    create: async (url?: string) => {
      try {
        return await ipcCall('tabs:create', { url: url || 'about:blank' });
      } catch (error) {
        console.warn('Failed to create tab:', error);
        return null;
      }
    },
    close: (request: { id: string }) => ipcCall('tabs:close', request).catch(err => console.warn('Failed to close tab:', err)),
    activate: (request: { id: string }) => ipcCall('tabs:activate', request).catch(err => console.warn('Failed to activate tab:', err)),
    navigate: (id: string, url: string) => ipcCall('tabs:navigate', { id, url }).catch(err => console.warn('Failed to navigate:', err)),
    goBack: (id: string) => ipcCall('tabs:goBack', { id }).catch(err => console.warn('Failed to go back:', err)),
    goForward: (id: string) => ipcCall('tabs:goForward', { id }).catch(err => console.warn('Failed to go forward:', err)),
    devtools: (id: string) => ipcCall('tabs:devtools', { id }),
    screenshot: (id?: string) => ipcCall<{ id?: string }, { success: boolean; path?: string; error?: string }>('tabs:screenshot', { id }),
    pip: (id?: string, enabled?: boolean) => ipcCall<{ id?: string; enabled?: boolean }, { success: boolean; error?: string }>('tabs:pip', { id, enabled }),
    find: (id?: string) => ipcCall<{ id?: string }, { success: boolean; error?: string }>('tabs:find', { id }),
    reload: (id: string) => ipcCall('tabs:reload', { id }).catch(err => console.warn('Failed to reload:', err)),
    list: async () => {
      try {
        const result = await ipcCall<unknown, Array<{ id: string; title: string; active: boolean; url?: string }>>('tabs:list', {});
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.warn('Failed to list tabs:', error);
        return [];
      }
    },
    hibernate: (id: string) => ipcCall('tabs:hibernate', { id }),
    burn: (id: string) => ipcCall('tabs:burn', { id }),
    onUpdated: (callback: (tabs: Array<{ id: string; title: string; active: boolean; url?: string }>) => void) => {
      if ((window.ipc as any)?.on) {
        (window.ipc as any).on('tabs:updated', (_event: any, tabs: any[]) => callback(tabs));
      }
    },
  },
  proxy: {
    set: (config: { type: 'socks5' | 'http'; host: string; port: number; username?: string; password?: string; tabId?: string; profileId?: string }) =>
      ipcCall('proxy:set', config),
    status: () => ipcCall<unknown, { healthy: boolean; killSwitchEnabled: boolean }>('proxy:status', {}),
    getForTab: (tabId: string) => ipcCall<unknown, { proxy: { type: string; host: string; port: number } | null }>('proxy:getForTab', { tabId }),
  },
  profiles: {
    create: (name: string, proxy?: unknown) =>
      ipcCall('profiles:create', { name, proxy }),
    list: () => ipcCall<unknown, Array<{ id: string; name: string; createdAt: number; proxy?: unknown }>>('profiles:list', {}),
    get: (id: string) => ipcCall('profiles:get', { id }),
    delete: (id: string) => ipcCall('profiles:delete', { id }),
    updateProxy: (profileId: string, proxy?: unknown) => ipcCall('profiles:updateProxy', { profileId, proxy }),
  },
  settings: {
    get: () => ipcCall<unknown, unknown>('settings:get', {}),
    set: (path: string[], value: unknown) => ipcCall('settings:set', { path, value }),
  },
  agent: {
    createTask: (task: unknown) => ipcCall('agent:createTask', task),
    generatePlan: (taskId: string, observations?: unknown[]) => ipcCall('agent:generatePlan', { taskId, observations }),
    executeTask: (taskId: string, confirmSteps?: string[]) => ipcCall('agent:executeTask', { taskId, confirmSteps }),
    cancelTask: (taskId: string) => ipcCall('agent:cancelTask', { taskId }),
    getStatus: (taskId: string) => ipcCall('agent:getStatus', { taskId }),
    ask: (query: string, context?: { url?: string; text?: string }) => 
      ipcCall<{ query: string; context?: { url?: string; text?: string } }, { answer: string; sources?: string[] }>('agent:ask', { query, context }),
    deepResearch: (request: { query: string; maxSources?: number; outputFormat?: 'json' | 'csv' | 'markdown'; includeCitations?: boolean }) =>
      ipcCall('agent:deepResearch', request),
    stream: {
      start: (query: string, options?: { model?: string; temperature?: number; maxTokens?: number }) =>
        ipcCall('agent:stream:start', { query, ...options }),
      stop: (streamId: string) => ipcCall('agent:stream:stop', { streamId }),
    },
    generatePlanFromGoal: (request: { goal: string; mode?: string; constraints?: string[] }) =>
      ipcCall<{ goal: string; mode?: string; constraints?: string[] }, Plan>('agent:generatePlanFromGoal', request),
    executePlan: (request: { planId: string; plan: Plan }) =>
      ipcCall('agent:executePlan', request),
    guardrails: {
      config: (config: any) => ipcCall('agent:guardrails:config', config),
      check: (type: 'prompt' | 'domain' | 'ratelimit' | 'step', data: any) =>
        ipcCall('agent:guardrails:check', { type, data }),
    },
  },
  cloudVector: {
    config: (config: { provider: 'qdrant' | 'pinecone' | 'none'; endpoint?: string; apiKey?: string; collection?: string; enabled: boolean }) =>
      ipcCall('cloud-vector:config', config),
    sync: (documentIds?: string[]) => ipcCall('cloud-vector:sync', { documentIds }),
    search: (query: string, topK?: number) => ipcCall('cloud-vector:search', { query, topK }),
    available: () => ipcCall<unknown, { available: boolean }>('cloud-vector:available', {}),
  },
  hybridSearch: {
    search: (query: string, maxResults?: number) => ipcCall('search:hybrid', { query, maxResults }),
    config: (config: { sources?: { brave?: { enabled: boolean; apiKey?: string }; bing?: { enabled: boolean; apiKey?: string; endpoint?: string }; custom?: { enabled: boolean } }; maxResults?: number; rerank?: boolean }) =>
      ipcCall('search:config', config),
  },
  e2eeSync: {
    config: (config: { enabled: boolean; syncEndpoint?: string; encryptionKey?: string; chainId?: string }) =>
      ipcCall('sync:config', config),
    init: (request: { password: string }) => ipcCall('sync:init', request),
    sync: () => ipcCall('sync:sync', {}),
    status: () => ipcCall<unknown, { synced: boolean; chainId?: string; enabled: boolean }>('sync:status', {}),
    pull: () => ipcCall<unknown, { data: unknown[] }>('sync:pull', {}),
  },
  consent: {
    createRequest: (action: unknown) => ipcCall('consent:createRequest', action),
    approve: (consentId: string) => ipcCall('consent:approve', { consentId }),
    revoke: (consentId: string) => ipcCall('consent:revoke', { consentId }),
    check: (action: unknown) => ipcCall('consent:check', action),
    get: (consentId: string) => ipcCall('consent:get', { consentId }),
    list: (filter?: unknown) => ipcCall('consent:list', filter || {}),
    export: () => ipcCall('consent:export', {}),
  },
  permissions: {
    request: (type: string, origin: string, description?: string) => ipcCall('permissions:request', { type, origin, description }),
    grant: (type: string, origin: string) => ipcCall('permissions:grant', { type, origin }),
    revoke: (type: string, origin: string) => ipcCall('permissions:revoke', { type, origin }),
    check: (type: string, origin: string) => ipcCall('permissions:check', { type, origin }),
    list: (filter?: unknown) => ipcCall('permissions:list', filter || {}),
    clearOrigin: (origin: string) => ipcCall('permissions:clearOrigin', { origin }),
  },
  privacy: {
    getOrigins: () => ipcCall('privacy:getOrigins', {}),
    purgeOrigin: (origin: string) => ipcCall('privacy:purgeOrigin', { origin }),
    export: () => ipcCall('privacy:export', {}),
  },
  dns: {
    enableDoH: (provider?: 'cloudflare' | 'quad9') => ipcCall('dns:enableDoH', { provider: provider || 'cloudflare' }),
    disableDoH: () => ipcCall('dns:disableDoH', {}),
    status: () => ipcCall('dns:status', {}),
  },
  threats: {
    scanUrl: (url: string) => ipcCall('threats:scanUrl', { url }),
    scanFile: (filePath: string) => ipcCall('threats:scanFile', { filePath }),
    scanUrlEnhanced: (url: string) => ipcCall('threats:scanUrlEnhanced', { url }),
    scanFileEnhanced: (filePath: string) => ipcCall('threats:scanFileEnhanced', { filePath }),
    analyzeFile: (filePath: string) => ipcCall('threats:analyzeFile', { filePath }),
    detectFingerprint: (html: string, headers: Record<string, string>) =>
      ipcCall('threats:detectFingerprint', { html, headers }),
    getThreatGraph: () => ipcCall<unknown, { graph: any }>('threats:getThreatGraph', {}),
    clearThreatGraph: () => ipcCall('threats:clearThreatGraph', {}),
  },
  research: {
    extractContent: (tabId?: string) =>
      ipcCall<{ tabId?: string }, { content: string; title: string; html: string }>('research:extractContent', { tabId }),
    saveNotes: (url: string, notes: string, highlights?: any[]) =>
      ipcCall('research:saveNotes', { url, notes, highlights }),
    getNotes: (url: string) =>
      ipcCall<{ url: string }, { notes: string; highlights: any[] }>('research:getNotes', { url }),
    export: (format: 'markdown' | 'csv' | 'json', sources: string[], includeNotes?: boolean) =>
      ipcCall('research:export', { format, sources, includeNotes: includeNotes ?? true }),
    queryEnhanced: (query: string, options?: {
      maxSources?: number;
      includeCounterpoints?: boolean;
      region?: string;
      recencyWeight?: number;
      authorityWeight?: number;
    }) => ipcCall('research:queryEnhanced', { query, ...options }),
    clearCache: () => ipcCall('research:clearCache', {}),
  },
  downloads: {
    list: () => ipcCall<unknown, any[]>('downloads:list', {}),
    requestConsent: (url: string, filename: string, size?: number) =>
      ipcCall('downloads:requestConsent', { url, filename, size }),
    openFile: (path: string) => ipcCall('downloads:openFile', { path }),
    showInFolder: (path: string) => ipcCall('downloads:showInFolder', { path }),
    pause: (id: string) => ipcCall<{ id: string }, { success: boolean; error?: string }>('downloads:pause', { id }),
    resume: (id: string) => ipcCall<{ id: string }, { success: boolean; error?: string }>('downloads:resume', { id }),
    cancel: (id: string) => ipcCall<{ id: string }, { success: boolean; error?: string }>('downloads:cancel', { id }),
  },
  history: {
    list: () => ipcCall<unknown, any[]>('history:list', {}),
    clear: () => ipcCall('history:clear', {}),
    search: (query: string) => ipcCall<{ query: string }, any[]>('history:search', { query }),
    deleteUrl: (url: string) => ipcCall<{ url: string }, { success: boolean }>('history:deleteUrl', { url }),
  },
  storage: {
    saveWorkspace: (workspace: unknown) => ipcCall('storage:saveWorkspace', workspace),
    listWorkspaces: () => ipcCall<unknown, unknown[]>('storage:listWorkspaces', {}),
  },
  tor: {
    start: (config?: { port?: number; controlPort?: number; newnymInterval?: number }) =>
      ipcCall('tor:start', config || {}),
    stop: () => ipcCall('tor:stop', {}),
    status: () => ipcCall<unknown, { running: boolean; bootstrapped: boolean; progress: number; error?: string; circuitEstablished: boolean }>('tor:status', {}),
    newIdentity: () => ipcCall('tor:newIdentity', {}),
    getProxy: () => ipcCall<unknown, { proxy: string | null }>('tor:getProxy', {}),
  },
  shields: {
    get: (url: string) => ipcCall('shields:get', { url }),
    set: (hostname: string, config: unknown) => ipcCall('shields:set', { hostname, config }),
    updateDefault: (config: unknown) => ipcCall('shields:updateDefault', config),
    list: () => ipcCall<unknown, unknown[]>('shields:list', {}),
    getStatus: () => ipcCall<unknown, { adsBlocked: number; trackersBlocked: number; httpsUpgrades: number; cookies3p: 'block' | 'allow'; webrtcBlocked: boolean; fingerprinting: boolean }>('shields:getStatus', {}),
  },
  vpn: {
    status: () => ipcCall<unknown, { connected: boolean; type?: string; name?: string }>('vpn:status', {}),
    check: () => ipcCall<unknown, { connected: boolean; type?: string; name?: string }>('vpn:check', {}),
  },
  network: {
    get: () => ipcCall<unknown, { quicEnabled: boolean; ipv6Enabled: boolean; ipv6LeakProtection: boolean }>('network:get', {}),
    disableQUIC: () => ipcCall('network:disableQUIC', {}),
    enableQUIC: () => ipcCall('network:enableQUIC', {}),
    disableIPv6: () => ipcCall('network:disableIPv6', {}),
    enableIPv6: () => ipcCall('network:enableIPv6', {}),
  },
  ollama: {
    check: () => ipcCall<unknown, { available: boolean; models?: string[] }>('ollama:check', {}),
    listModels: () => ipcCall<unknown, { models: string[] }>('ollama:listModels', {}),
  },
  citation: {
    extract: (text: string, url?: string) => ipcCall('citation:extract', { text, url }),
    get: () => ipcCall<unknown, { nodes: any[]; edges: any[] }>('citation:get', {}),
    export: (format: 'json' | 'graphml') => ipcCall('citation:export', { format }),
    clear: () => ipcCall('citation:clear', {}),
  },
  knowledge: {
    cluster: (sources: Array<{ url: string; title: string; text?: string }>, threshold?: number) =>
      ipcCall('knowledge:cluster', { sources, threshold: threshold ?? 0.7 }),
    parsePDF: (filePath: string) => ipcCall('knowledge:parsePDF', { filePath }),
    clusterCompare: (cluster1Id: string, cluster2Id: string) =>
      ipcCall('knowledge:clusterCompare', { cluster1Id, cluster2Id }),
    clustersList: () => ipcCall<unknown, { clusters: any[] }>('knowledge:clustersList', {}),
  },
  cognitive: {
    recordPattern: (pattern: { url: string; domain: string; timeSpent: number; actions: string[]; topics?: string[] }) =>
      ipcCall('cognitive:recordPattern', pattern),
    getSuggestions: (request?: { currentUrl?: string; recentActions?: string[] }) =>
      ipcCall('cognitive:getSuggestions', request || {}),
    getPersona: () => ipcCall<unknown, { interests: string[]; habits: string[]; patterns: string }>('cognitive:getPersona', {}),
    getGraph: () => ipcCall<unknown, { graph: any }>('cognitive:getGraph', {}),
    clear: () => ipcCall('cognitive:clear', {}),
  },
  workspaceV2: {
    save: (workspace: { id: string; name: string; tabs: any[]; notes?: Record<string, string>; proxyProfileId?: string; mode?: string; layout?: any }) =>
      ipcCall('workspace-v2:save', workspace),
    load: (workspaceId: string) => ipcCall('workspace-v2:load', { workspaceId }),
    list: () => ipcCall<unknown, { workspaces: any[] }>('workspace-v2:list', {}),
    delete: (workspaceId: string) => ipcCall('workspace-v2:delete', { workspaceId }),
    updateNotes: (workspaceId: string, tabId: string, note: string) =>
      ipcCall('workspace-v2:updateNotes', { workspaceId, tabId, note }),
    getNotes: (workspaceId: string) => ipcCall<unknown, { notes: Record<string, string> }>('workspace-v2:getNotes', { workspaceId }),
  },
  sessionBundle: {
    export: (runId: string, options?: { name?: string; description?: string }) =>
      ipcCall('session-bundle:export', { runId, ...options }),
    import: (filePath: string) => ipcCall('session-bundle:import', { filePath }),
    replay: (bundleId: string, options?: { restoreWorkspace?: boolean; replayAgent?: boolean }) =>
      ipcCall('session-bundle:replay', { bundleId, ...options }),
    list: () => ipcCall<unknown, { bundles: any[] }>('session-bundle:list', {}),
  },
  historyGraph: {
    recordNavigation: (fromUrl: string | null, toUrl: string, title?: string) =>
      ipcCall('history-graph:recordNavigation', { fromUrl, toUrl, title }),
    recordCitation: (sourceUrl: string, targetUrl: string) =>
      ipcCall('history-graph:recordCitation', { sourceUrl, targetUrl }),
    recordExport: (sourceUrl: string, exportType: string, filename: string) =>
      ipcCall('history-graph:recordExport', { sourceUrl, exportType, filename }),
    recordNote: (url: string, noteText: string) =>
      ipcCall('history-graph:recordNote', { url, noteText }),
    get: (options?: { startTime?: number; endTime?: number }) =>
      ipcCall<unknown, { graph: any }>('history-graph:get', options || {}),
    export: (format: 'json' | 'graphml') => ipcCall('history-graph:export', { format }),
    clear: () => ipcCall('history-graph:clear', {}),
  },
  omniscript: {
    parse: (command: string) => ipcCall<unknown, { parsed: any }>('omniscript:parse', { command }),
    execute: (commands: string[]) => ipcCall<unknown, { actions: any[] }>('omniscript:execute', { commands }),
  },
  omniBrain: {
    addDocument: (document: { text: string; url?: string; metadata?: Record<string, unknown> }) =>
      ipcCall<unknown, { id: string }>('omni-brain:addDocument', document),
    search: (query: string, limit?: number) =>
      ipcCall<unknown, Array<{ document: any; similarity: number }>>('omni-brain:search', { query, limit: limit || 10 }),
    getDocument: (id: string) => ipcCall<unknown, { document: any }>('omni-brain:getDocument', { id }),
    listDocuments: () => ipcCall<unknown, { documents: any[] }>('omni-brain:listDocuments', {}),
    deleteDocument: (id: string) => ipcCall('omni-brain:deleteDocument', { id }),
    clear: () => ipcCall('omni-brain:clear', {}),
  },
  spiritual: {
    focusMode: {
      enable: (config?: { ambientSound?: 'none' | 'nature' | 'rain' | 'ocean' | 'meditation'; breathingOverlay?: boolean; timer?: number; notifications?: boolean }) =>
        ipcCall('spiritual:focusMode:enable', config || {}),
      disable: () => ipcCall('spiritual:focusMode:disable', {}),
      status: () => ipcCall<unknown, { active: boolean; config: any }>('spiritual:focusMode:status', {}),
    },
    mood: {
      recordTyping: () => ipcCall('spiritual:mood:recordTyping', {}),
      get: () => ipcCall<unknown, { mood: string; confidence: number; detectedAt: number; colors: any }>('spiritual:mood:get', {}),
      reset: () => ipcCall('spiritual:mood:reset', {}),
    },
    balance: {
      start: (intervals?: { rest?: number; stretch?: number; hydrate?: number; eyeBreak?: number }) =>
        ipcCall('spiritual:balance:start', intervals || {}),
      stop: () => ipcCall('spiritual:balance:stop', {}),
    },
  },
  pluginMarketplace: {
    list: () => ipcCall<unknown, { plugins: any[] }>('plugin-marketplace:list', {}),
    install: (pluginId: string, verifySignature?: boolean) =>
      ipcCall('plugin-marketplace:install', { pluginId, verifySignature: verifySignature ?? true }),
    uninstall: (pluginId: string) => ipcCall('plugin-marketplace:uninstall', { pluginId }),
    installed: () => ipcCall<unknown, { plugins: string[] }>('plugin-marketplace:installed', {}),
    isInstalled: (pluginId: string) => ipcCall<unknown, { installed: boolean }>('plugin-marketplace:isInstalled', { pluginId }),
  },
  performance: {
    gpu: {
      enableRaster: () => ipcCall<unknown, { success: boolean; config: any }>('performance:gpu:enableRaster', {}),
      disableRaster: () => ipcCall<unknown, { success: boolean; config: any }>('performance:gpu:disableRaster', {}),
      enableHardwareDecode: () => ipcCall<unknown, { success: boolean; config: any }>('performance:gpu:enableHardwareDecode', {}),
      disableHardwareDecode: () => ipcCall<unknown, { success: boolean; config: any }>('performance:gpu:disableHardwareDecode', {}),
      getConfig: () => ipcCall<unknown, { config: any }>('performance:gpu:getConfig', {}),
    },
    snapshot: {
      create: (snapshot: { windows: any[]; workspace?: string }) =>
        ipcCall<unknown, { snapshotId: string }>('performance:snapshot:create', snapshot),
      restore: (snapshotId: string) => ipcCall<unknown, { snapshot: any }>('performance:snapshot:restore', { snapshotId }),
      latest: () => ipcCall<unknown, { snapshot: any }>('performance:snapshot:latest', {}),
      list: () => ipcCall<unknown, { snapshots: any[] }>('performance:snapshot:list', {}),
    },
  },
  workers: {
    scraping: {
      run: (task: { id: string; urls: string[]; selectors?: string[]; pagination?: any }) =>
        ipcCall<unknown, { taskId: string; results: any[]; completed: number; total: number }>('workers:scraping:run', task),
    },
  },
  videoCall: {
    getConfig: () => ipcCall<unknown, { enabled: boolean; adaptiveQuality: boolean; maxResolution: string; maxFrameRate: number; bandwidthEstimate: number; priorityMode: string }>('videoCall:getConfig', {}),
    updateConfig: (config: { enabled?: boolean; adaptiveQuality?: boolean; maxResolution?: '720p' | '480p' | '360p' | '240p'; maxFrameRate?: number; bandwidthEstimate?: number; priorityMode?: 'performance' | 'balanced' | 'quality' }) =>
      ipcCall('videoCall:updateConfig', config),
    getNetworkQuality: () => ipcCall<unknown, { bandwidth: number; latency: number; packetLoss: number; quality: string }>('videoCall:getNetworkQuality', {}),
    updateNetworkQuality: (quality: { bandwidth: number; latency?: number; packetLoss?: number }) =>
      ipcCall('videoCall:updateNetworkQuality', quality),
  },
  sessions: {
    create: (request: { name: string; profileId?: string; color?: string }) =>
      ipcCall<{ name: string; profileId?: string; color?: string }, { id: string; name: string; profileId: string; createdAt: number; tabCount: number; color?: string }>('sessions:create', request),
    list: () => ipcCall<unknown, Array<{ id: string; name: string; profileId: string; createdAt: number; tabCount: number; color?: string }>>('sessions:list', {}),
    getActive: () => ipcCall<unknown, { id: string; name: string; profileId: string; createdAt: number; tabCount: number; color?: string } | null>('sessions:getActive', {}),
    setActive: (request: { sessionId: string }) => ipcCall('sessions:setActive', request),
    get: (request: { sessionId: string }) => ipcCall<{ sessionId: string }, { id: string; name: string; profileId: string; createdAt: number; tabCount: number; color?: string }>('sessions:get', request),
    delete: (request: { sessionId: string }) => ipcCall('sessions:delete', request),
    update: (request: { sessionId: string; name?: string; color?: string }) => ipcCall('sessions:update', request),
    getPartition: (request: { sessionId: string }) => ipcCall<{ sessionId: string }, { partition: string }>('sessions:getPartition', request),
  },
  private: {
    createWindow: (options?: { url?: string; autoCloseAfter?: number; contentProtection?: boolean; ghostMode?: boolean }) =>
      ipcCall<{ url?: string; autoCloseAfter?: number; contentProtection?: boolean; ghostMode?: boolean }, { windowId: number }>('private:createWindow', options || {}),
    createGhostTab: (options?: { url?: string }) =>
      ipcCall<{ url?: string }, { tabId: string }>('private:createGhostTab', options || {}),
    closeAll: () =>
      ipcCall<unknown, { count: number }>('private:closeAll', {}),
    panicWipe: (options?: { forensic?: boolean }) =>
      ipcCall<{ forensic?: boolean }, { success: boolean }>('private:panicWipe', options || {}),
  },
};

