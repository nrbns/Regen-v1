/**
 * Typed IPC Client for Renderer
 * Provides type-safe IPC calls with automatic error handling
 */

// @ts-nocheck

import { z } from 'zod';
import { ResearchResult } from '../types/research';
import type { PrivacyAuditSummary } from './ipc-events';
import { getEnvVar, isDevEnv } from './env';
import type { EcoImpactForecast } from '../types/ecoImpact';
import type { TrustSummary } from '../types/trustWeaver';
import type { NexusListResponse, NexusPluginEntry } from '../types/extensionNexus';

const IS_DEV = isDevEnv();

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

// Track IPC readiness
let ipcReady = false;
let ipcReadyResolvers: Array<() => void> = [];

// Set up IPC ready listener immediately when module loads
if (typeof window !== 'undefined') {
  // Listen for custom event from preload script
  const handleIpcReady = () => {
    ipcReady = true;
    // Resolve all pending promises
    const resolvers = [...ipcReadyResolvers];
    ipcReadyResolvers = [];
    resolvers.forEach(resolve => resolve());
    if (IS_DEV) {
      console.log('[IPC] Ready signal received');
    }
  };
  
  window.addEventListener('ipc:ready', handleIpcReady);
  
  // Also check if IPC is already available (in case event fired before listener was added)
  if (window.ipc && typeof window.ipc.invoke === 'function') {
    // Check if we can make a test call
    setTimeout(() => {
      if (!ipcReady) {
        // If IPC is available but we haven't received the ready event yet,
        // mark as ready after a short delay
        handleIpcReady();
      }
    }, 100);
  }
}

// Wait for IPC to be ready (with timeout)
async function waitForIPC(timeout = 10000): Promise<boolean> {
  // If already ready, return immediately
  if (ipcReady && window.ipc && typeof window.ipc.invoke === 'function') {
    return true;
  }
  
  // Wait for ready signal
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // If already ready, resolve immediately
    if (ipcReady && window.ipc && typeof window.ipc.invoke === 'function') {
      resolve(true);
      return;
    }
    
    // Add resolver to list
    const timeoutId = setTimeout(() => {
      // Remove from list if timeout
      ipcReadyResolvers = ipcReadyResolvers.filter(r => r !== resolver);
      resolve(false);
    }, timeout);
    
    const resolver = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };
    
    ipcReadyResolvers.push(resolver);
    
    // Also poll as fallback
    const checkInterval = setInterval(() => {
      if (ipcReady && window.ipc && typeof window.ipc.invoke === 'function') {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        ipcReadyResolvers = ipcReadyResolvers.filter(r => r !== resolver);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        ipcReadyResolvers = ipcReadyResolvers.filter(r => r !== resolver);
        resolve(false);
      }
    }, 100);
  });
}

export async function ipcCall<TRequest, TResponse = unknown>(
  channel: string,
  request: TRequest,
  schema?: z.ZodSchema<TResponse>
): Promise<TResponse> {
  const fullChannel = `ob://ipc/v1/${channel}`;
  
  // Wait for IPC to be ready (with longer timeout for initial load)
  const isReady = await waitForIPC(10000);
  
  if (!isReady || !window.ipc || typeof window.ipc.invoke !== 'function') {
    if (IS_DEV) {
      console.warn(`[IPC] Channel ${channel} unavailable (renderer not attached to Electron)`);
    }
    throw new Error('IPC unavailable');
  }
  
  try {
    // typedApi.invoke already unwraps {ok, data} responses and returns just the data
    // If there's an error, it throws, so if we get here, the response is valid
    const response = await window.ipc.invoke(fullChannel, request);
    
    // Validate with schema if provided
    if (schema && response !== undefined && response !== null) {
      const parsed = schema.safeParse(response);
      if (!parsed.success) {
        throw new Error(`Invalid response: ${parsed.error.message}`);
      }
      return parsed.data;
    }
    
    return response as TResponse;
  } catch (error) {
    if (IS_DEV) {
      console.warn(`IPC call failed for ${channel}:`, error);
    }
    throw error;
  }
}

/**
 * Typed IPC client with pre-configured channels
 */
export const ipc = {
  tabs: {
    create: async (
      input?:
        | string
        | {
            url?: string;
            profileId?: string;
            mode?: 'normal' | 'ghost' | 'private';
            containerId?: string;
            tabId?: string;
            activate?: boolean;
            createdAt?: number;
            lastActiveAt?: number;
            sessionId?: string;
            fromSessionRestore?: boolean;
          },
    ) => {
      try {
        // Wait for IPC to be ready
        await waitForIPC(5000);
        const payload = typeof input === 'string' ? { url: input } : (input || {});
        const result = await ipcCall('tabs:create', {
          url: payload.url || 'about:blank',
          profileId: payload.profileId,
          mode: payload.mode,
          containerId: payload.containerId,
          tabId: payload.tabId,
          activate: payload.activate,
          createdAt: payload.createdAt,
          lastActiveAt: payload.lastActiveAt,
          sessionId: payload.sessionId,
          fromSessionRestore: payload.fromSessionRestore,
        });
        if (IS_DEV) {
          console.log('[IPC] Tab created:', result);
        }
        return result;
      } catch (error) {
        if (IS_DEV) {
          console.error('Failed to create tab:', error);
        }
        // Return a mock result to prevent UI from breaking
        return { id: `temp-${Date.now()}`, success: false };
      }
    },
    close: async (request: { id: string }) => {
      try {
        const response = await ipcCall('tabs:close', request);
        if (IS_DEV) {
          console.log('[IPC] tabs.close response:', response);
        }
        return response;
      } catch (err) {
        if (IS_DEV) {
          console.warn('Failed to close tab:', err);
        }
        throw err;
      }
    },
    activate: async (request: { id: string }) => {
      try {
        const response = await ipcCall('tabs:activate', request);
        if (IS_DEV) {
          console.log('[IPC] tabs.activate response:', response);
        }
        return response;
      } catch (err) {
        if (IS_DEV) {
          console.warn('Failed to activate tab:', err);
        }
        throw err;
      }
    },
    navigate: (id: string, url: string) => ipcCall('tabs:navigate', { id, url }).catch(err => console.warn('Failed to navigate:', err)),
    goBack: (id: string) => ipcCall('tabs:goBack', { id }).catch(err => console.warn('Failed to go back:', err)),
    goForward: (id: string) => ipcCall('tabs:goForward', { id }).catch(err => console.warn('Failed to go forward:', err)),
    devtools: (id: string) => ipcCall('tabs:devtools', { id }),
    zoomIn: (id: string) => ipcCall<{ id: string }, { success: boolean; error?: string }>('tabs:zoomIn', { id }),
    zoomOut: (id: string) => ipcCall<{ id: string }, { success: boolean; error?: string }>('tabs:zoomOut', { id }),
    zoomReset: (id: string) => ipcCall<{ id: string }, { success: boolean; error?: string }>('tabs:zoomReset', { id }),
    screenshot: (id?: string) => ipcCall<{ id?: string }, { success: boolean; path?: string; error?: string }>('tabs:screenshot', { id }),
    pip: (id?: string, enabled?: boolean) => ipcCall<{ id?: string; enabled?: boolean }, { success: boolean; error?: string }>('tabs:pip', { id, enabled }),
    find: (id?: string) => ipcCall<{ id?: string }, { success: boolean; error?: string }>('tabs:find', { id }),
    reload: (id: string) => ipcCall('tabs:reload', { id }).catch(err => console.warn('Failed to reload:', err)),
    list: async () => {
      try {
        const result = await ipcCall<
          unknown,
          Array<{
            id: string;
            title: string;
            active: boolean;
            url?: string;
            mode?: 'normal' | 'ghost' | 'private';
            containerId?: string;
            containerName?: string;
            containerColor?: string;
            createdAt?: number;
            lastActiveAt?: number;
            sessionId?: string;
            profileId?: string;
            sleeping?: boolean;
          }>
        >('tabs:list', {});
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.warn('Failed to list tabs:', error);
        return [];
      }
    },
    predictiveGroups: async (options?: { windowId?: number; force?: boolean }) => {
      try {
        const response = await ipcCall<
          { windowId?: number; force?: boolean },
          {
            groups?: Array<{ id: string; label: string; tabIds: string[]; confidence?: number }>;
            prefetch?: Array<{ tabId: string; url: string; reason?: string; confidence?: number }>;
            summary?: { generatedAt?: string; explanation?: string };
          }
        >('tabs:predictiveGroups', options ?? {});

        return {
          groups: Array.isArray(response?.groups) ? response.groups : [],
          prefetch: Array.isArray(response?.prefetch) ? response.prefetch : [],
          summary: response?.summary,
        };
      } catch (error) {
        if (IS_DEV) {
          console.warn('Failed to fetch predictive tab groups:', error);
        }
        return { groups: [], prefetch: [], summary: undefined } as const;
      }
    },
    moveToWorkspace: (request: { tabId: string; workspaceId: string; label?: string }) =>
      ipcCall('tabs:moveToWorkspace', request),
    hibernate: (id: string) => ipcCall('tabs:hibernate', { id }),
    wake: (id: string) => ipcCall<{ id: string }, { success: boolean; error?: string }>('tabs:wake', { id }),
    burn: (id: string) => ipcCall('tabs:burn', { id }),
    onUpdated: (callback: (tabs: Array<{ id: string; title: string; active: boolean; url?: string; mode?: 'normal' | 'ghost' | 'private'; containerId?: string; containerName?: string; containerColor?: string; createdAt?: number; lastActiveAt?: number; sessionId?: string; profileId?: string; sleeping?: boolean }>) => void) => {
      if ((window.ipc as any)?.on) {
        (window.ipc as any).on('tabs:updated', (_event: any, tabs: any[]) => callback(tabs));
      }
    },
    setContainer: (id: string, containerId: string) =>
      ipcCall<{ id: string; containerId: string }, { success: boolean; error?: string }>('tabs:setContainer', {
        id,
        containerId,
      }),
  },
  containers: {
    list: () =>
      ipcCall<unknown, Array<{ id: string; name: string; color: string; icon?: string; description?: string; scope: string; persistent: boolean; system?: boolean }>>('containers:list', {}),
    getActive: () =>
      ipcCall<unknown, { id: string; name: string; color: string; icon?: string; description?: string; scope?: string; persistent?: boolean; system?: boolean }>('containers:getActive', {}),
    setActive: (containerId: string) =>
      ipcCall<{ containerId: string }, { id: string; name: string; color: string; icon?: string; description?: string; scope?: string; persistent?: boolean; system?: boolean }>('containers:setActive', { containerId }),
    create: (payload: { name: string; color?: string; icon?: string }) =>
      ipcCall<{ name: string; color?: string; icon?: string }, { id: string; name: string; color: string; icon?: string; description?: string; scope?: string; persistent?: boolean; system?: boolean }>('containers:create', payload),
    getPermissions: (containerId: string) =>
      ipcCall<{ containerId: string }, { containerId: string; permissions: string[] }>('containers:getPermissions', { containerId }),
    setPermission: (containerId: string, permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen', enabled: boolean) =>
      ipcCall<{ containerId: string; permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen'; enabled: boolean }, { containerId: string; permissions: string[] }>('containers:setPermission', { containerId, permission, enabled }),
    getSitePermissions: (containerId: string) =>
      ipcCall<{ containerId: string }, Array<{ permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen'; origins: string[] }>>('containers:getSitePermissions', { containerId }),
    revokeSitePermission: (containerId: string, permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen', origin: string) =>
      ipcCall<{ containerId: string; permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen'; origin: string }, Array<{ permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen'; origins: string[] }>>('containers:revokeSitePermission', { containerId, permission, origin }),
  },
  performance: {
    updateBattery: (payload: { level?: number | null; charging?: boolean | null; chargingTime?: number | null; dischargingTime?: number | null }) =>
      ipcCall('performance:battery:update', payload),
  },
  proxy: {
    set: (config: { type: 'socks5' | 'http'; host: string; port: number; username?: string; password?: string; tabId?: string; profileId?: string }) =>
      ipcCall('proxy:set', config),
    status: () => ipcCall<unknown, { healthy: boolean; killSwitchEnabled: boolean }>('proxy:status', {}),
    getForTab: (tabId: string) => ipcCall<unknown, { proxy: { type: string; host: string; port: number } | null }>('proxy:getForTab', { tabId }),
  },
  profiles: {
    create: (
      input: string | { name: string; proxy?: unknown; color?: string },
      proxy?: unknown,
    ) => {
      if (typeof input === 'string') {
        return ipcCall('profiles:create', { name: input, proxy });
      }
      return ipcCall('profiles:create', input);
    },
    list: () =>
      ipcCall<
        unknown,
        Array<{
          id: string;
          name: string;
          createdAt: number;
          proxy?: unknown;
          kind?: 'default' | 'work' | 'personal' | 'custom';
          color?: string;
          system?: boolean;
          policy?: {
            allowDownloads: boolean;
            allowPrivateWindows: boolean;
            allowGhostTabs: boolean;
            allowScreenshots: boolean;
            allowClipping: boolean;
          };
          description?: string;
        }>
      >('profiles:list', {}),
    get: (id: string) =>
      ipcCall<
        { id: string },
        {
          id: string;
          name: string;
          createdAt: number;
          proxy?: unknown;
          kind?: 'default' | 'work' | 'personal' | 'custom';
          color?: string;
          system?: boolean;
          policy?: {
            allowDownloads: boolean;
            allowPrivateWindows: boolean;
            allowGhostTabs: boolean;
            allowScreenshots: boolean;
            allowClipping: boolean;
          };
          description?: string;
        }
      >('profiles:get', { id }),
    delete: (id: string) => ipcCall('profiles:delete', { id }),
    updateProxy: (profileId: string, proxy?: unknown) => ipcCall('profiles:updateProxy', { profileId, proxy }),
    setActive: (profileId: string) =>
      ipcCall<
        { profileId: string },
        {
          id: string;
          name: string;
          color?: string;
          kind?: 'default' | 'work' | 'personal' | 'custom';
          system?: boolean;
          policy?: {
            allowDownloads: boolean;
            allowPrivateWindows: boolean;
            allowGhostTabs: boolean;
            allowScreenshots: boolean;
            allowClipping: boolean;
          };
          description?: string;
        }
      >('profiles:setActive', { profileId }),
    getActive: () =>
      ipcCall<
        unknown,
        {
          id: string;
          name: string;
          color?: string;
          kind?: 'default' | 'work' | 'personal' | 'custom';
          system?: boolean;
          policy?: {
            allowDownloads: boolean;
            allowPrivateWindows: boolean;
            allowGhostTabs: boolean;
            allowScreenshots: boolean;
            allowClipping: boolean;
          };
          description?: string;
        }
      >('profiles:getActive', {}),
    getPolicy: (profileId?: string) =>
      ipcCall<
        { profileId?: string },
        {
          allowDownloads: boolean;
          allowPrivateWindows: boolean;
          allowGhostTabs: boolean;
          allowScreenshots: boolean;
          allowClipping: boolean;
        }
      >('profiles:getPolicy', profileId ? { profileId } : {}),
  },
  settings: {
    get: () => ipcCall<unknown, unknown>('settings:get', {}),
    set: (path: string[], value: unknown) => ipcCall('settings:set', { path, value }),
    exportFile: () =>
      ipcCall<unknown, { success: boolean; path?: string; canceled?: boolean }>('settings:exportAll', {}),
    importFile: () =>
      ipcCall<
        unknown,
        { success: boolean; path?: string; settings?: unknown; canceled?: boolean }
      >('settings:importAll', {}),
  },
  diagnostics: {
    openLogs: () =>
      ipcCall<unknown, { success: boolean }>('diagnostics:openLogs', {}),
    copyDiagnostics: () =>
      ipcCall<unknown, { diagnostics: string }>('diagnostics:copy', {}),
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
  researchStream: {
    start: async (question: string, mode?: 'default' | 'threat' | 'trade') => {
      const payload = { question, ...(mode ? { mode } : {}) };
      const response = await ipcCall<{ question: string; mode?: string }, { jobId: string; channel: string }>(
        'research:start',
        payload,
      );
      return response;
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
  liveSearch: {
    start: (query: string, options?: { mode?: 'default' | 'threat' | 'trade'; region?: string; maxResults?: number }) =>
      ipcCall<
        { query: string; mode?: 'default' | 'threat' | 'trade'; region?: string; maxResults?: number },
        { jobId: string; channel: string }
      >('search:live:start', { query, ...options }),
  },
  graph: {
    tabs: () =>
      ipcCall<unknown, {
        nodes: Array<{
          id: string;
          title: string;
          url: string;
          domain: string;
          containerId?: string;
          containerName?: string;
          containerColor?: string;
          mode?: 'normal' | 'ghost' | 'private';
          active: boolean;
          createdAt?: number;
          lastActiveAt?: number;
        }>;
        edges: Array<{ id: string; source: string; target: string; weight: number; reasons: string[] }>;
        summary: { totalTabs: number; activeTabs: number; domains: number; containers: number };
        updatedAt: number;
      }>('graph:tabs', {}),
    workflow: (options?: { maxSteps?: number }) =>
      ipcCall<{ maxSteps?: number }, {
        planId: string;
        goal: string;
        summary: string;
        generatedAt: number;
        confidence: number;
        steps: Array<{
          id: string;
          title: string;
          description: string;
          tabIds: string[];
          recommendedActions: string[];
          primaryDomain?: string;
          confidence?: number;
        }>;
        sources: Array<{ domain: string; tabIds: string[] }>;
      }>('graph:workflowWeaver', options ?? {}),
  },
  efficiency: {
    applyMode: (mode: 'normal' | 'battery-saver' | 'extreme') =>
      ipcCall<{ mode: 'normal' | 'battery-saver' | 'extreme' }, { success: boolean }>('efficiency:applyMode', { mode }),
    clearOverride: () => ipcCall<unknown, { success: boolean }>('efficiency:clearOverride', {}),
    hibernateInactiveTabs: () => ipcCall<unknown, { success: boolean; count: number }>('efficiency:hibernate', {}),
    ecoImpact: (options?: { horizonMinutes?: number }) =>
      ipcCall<{ horizonMinutes?: number }, EcoImpactForecast>('efficiency:ecoImpact', options ?? {}),
  },
  trust: {
    list: () => ipcCall<unknown, { records: TrustSummary[] }>('trust:list', {}),
    get: (domain: string) =>
      ipcCall<{ domain: string }, { found: boolean; summary?: TrustSummary }>('trust:get', { domain }),
    submit: (signal: {
      domain: string;
      url?: string;
      title?: string;
      score: number;
      confidence?: number;
      tags?: string[];
      comment?: string;
      sourcePeer?: string;
    }) => ipcCall<typeof signal, { summary: TrustSummary | null }>('trust:submit', signal),
  },
  downloads: {
    list: () =>
      ipcCall<
        unknown,
        Array<{
          id: string;
          url: string;
          filename?: string;
          status: string;
          progress?: number;
          receivedBytes?: number;
          totalBytes?: number;
          path?: string;
          checksum?: string;
          createdAt: number;
          speedBytesPerSec?: number;
          etaSeconds?: number;
          safety?: {
            status: string;
            threatLevel?: string;
            details?: string;
            recommendations?: string[];
            scannedAt?: number;
            quarantinePath?: string;
          };
        }>
      >('downloads:list', {}),
    openFile: (path: string) => ipcCall('downloads:openFile', { path }),
    showInFolder: (path: string) => ipcCall('downloads:showInFolder', { path }),
    pause: (id: string) => ipcCall('downloads:pause', { id }),
    resume: (id: string) => ipcCall('downloads:resume', { id }),
    cancel: (id: string) => ipcCall('downloads:cancel', { id }),
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
    list: (filter?: { type?: string; approved?: boolean }) =>
      ipcCall<{ type?: string; approved?: boolean }, import('../types/consent').ConsentRecord[]>('consent:list', filter ?? {}),
    export: () => ipcCall<unknown, string>('consent:export', {}),
    vault: {
      export: () => ipcCall<unknown, {
        entries: Array<{ consentId: string; actionType: string; approved: boolean; timestamp: number; signature: string; chainHash: string; metadata: Record<string, unknown> }>;
        anchor: string;
        updatedAt: number;
      }>('consent:vault:export', {}),
    },
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
    sentinel: {
      audit: (tabId: string | null) =>
        ipcCall<{ tabId?: string }, PrivacyAuditSummary>('privacy:sentinel:audit', tabId ? { tabId } : {}),
    },
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
    export: (
      format: 'markdown' | 'obsidian' | 'notion',
      sources: string[],
      includeNotes?: boolean,
    ) =>
      ipcCall<
        { format: 'markdown' | 'obsidian' | 'notion'; sources: string[]; includeNotes?: boolean },
        {
          success: boolean;
          format: 'markdown' | 'obsidian' | 'notion';
          path?: string;
          folder?: string;
          paths?: string[];
          notionPages?: Array<{ id: string; url: string; title: string }>;
        }
      >('research:export', { format, sources, includeNotes: includeNotes ?? true }),
    queryEnhanced: (query: string, options?: {
      maxSources?: number;
      includeCounterpoints?: boolean;
      region?: string;
      recencyWeight?: number;
      authorityWeight?: number;
    }) => ipcCall<
      {
        query: string;
        maxSources?: number;
        includeCounterpoints?: boolean;
        region?: string;
        recencyWeight?: number;
        authorityWeight?: number;
      },
      ResearchResult
    >('research:queryEnhanced', { query, ...options }),
    clearCache: () => ipcCall('research:clearCache', {}),
  },
  reader: {
    summarize: (request: { url?: string; title?: string; content: string; html?: string }) =>
      ipcCall<
        { url?: string; title?: string; content: string; html?: string },
        {
          mode: 'local' | 'cloud' | 'extractive';
          bullets: Array<{ summary: string; citation?: { text: string; url?: string } }>;
        }
      >('reader:summarize', request),
    export: (request: { url?: string; title?: string; html: string }) =>
      ipcCall<
        { url?: string; title?: string; html: string },
        { success: boolean; path?: string }
      >('reader:export', request),
  },
  document: {
    ingest: (source: string, type: 'pdf' | 'docx' | 'web', title?: string) =>
      ipcCall<{ source: string; type: 'pdf' | 'docx' | 'web'; title?: string }, DocumentReview>('document:ingest', { source, type, title }),
    get: (id: string) =>
      ipcCall<{ id: string }, DocumentReview>('document:get', { id }),
    list: () =>
      ipcCall<unknown, DocumentReview[]>('document:list', {}),
    delete: (id: string) =>
      ipcCall<{ id: string }, { success: boolean }>('document:delete', { id }),
    reverify: (id: string) =>
      ipcCall<{ id: string }, DocumentReview>('document:reverify', { id }),
    export: (id: string, format: 'markdown' | 'html', outputPath: string, citationStyle?: 'apa' | 'mla' | 'chicago' | 'ieee' | 'harvard') =>
      ipcCall<
        { id: string; format: 'markdown' | 'html'; outputPath: string; citationStyle?: string },
        { success: boolean; path: string }
      >('document:export', { id, format, outputPath, citationStyle }),
    exportToString: (id: string, format: 'markdown' | 'html', citationStyle?: 'apa' | 'mla' | 'chicago' | 'ieee' | 'harvard') =>
      ipcCall<{ id: string; format: 'markdown' | 'html'; citationStyle?: string }, { content: string }>('document:exportToString', { id, format, citationStyle }),
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
  watchers: {
    list: () => ipcCall<unknown, Array<{ id: string; url: string; createdAt: number; intervalMinutes: number; lastCheckedAt?: number; lastHash?: string; lastChangeAt?: number; status: string; error?: string }>>('watchers:list', {}),
    add: (request: { url: string; intervalMinutes?: number }) =>
      ipcCall<{ url: string; intervalMinutes?: number }, { id: string; url: string; createdAt: number; intervalMinutes: number; status: string }>('watchers:add', request),
    remove: (id: string) =>
      ipcCall<{ id: string }, { success: boolean }>('watchers:remove', { id }),
    trigger: (id: string) =>
      ipcCall<{ id: string }, { success: boolean; error?: string }>('watchers:trigger', { id }),
    updateInterval: (id: string, intervalMinutes: number) =>
      ipcCall<{ id: string; intervalMinutes: number }, { success: boolean; error?: string }>('watchers:updateInterval', { id, intervalMinutes }),
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
      ipcCall<typeof config, { success: boolean; stub?: boolean; warning?: string }>('tor:start', config || {}),
    stop: () => ipcCall<unknown, { success: boolean; stub?: boolean }>('tor:stop', {}),
    status: () =>
      ipcCall<
        unknown,
        { running: boolean; bootstrapped: boolean; progress: number; error?: string; circuitEstablished: boolean; stub?: boolean }
      >('tor:status', {}),
    newIdentity: () => ipcCall('tor:newIdentity', {}),
    getProxy: () => ipcCall<unknown, { proxy: string | null; stub?: boolean }>('tor:getProxy', {}),
  },
  shields: {
    get: (url: string) => ipcCall('shields:get', { url }),
    set: (hostname: string, config: unknown) => ipcCall('shields:set', { hostname, config }),
    updateDefault: (config: unknown) => ipcCall('shields:updateDefault', config),
    list: () => ipcCall<unknown, unknown[]>('shields:list', {}),
    getStatus: () => ipcCall<unknown, { adsBlocked: number; trackersBlocked: number; httpsUpgrades: number; cookies3p: 'block' | 'allow'; webrtcBlocked: boolean; fingerprinting: boolean }>('shields:getStatus', {}),
  },
  vpn: {
    status: () => ipcCall<unknown, { connected: boolean; type?: string; name?: string; stub?: boolean }>('vpn:status', {}),
    check: () => ipcCall<unknown, { connected: boolean; type?: string; name?: string; stub?: boolean }>('vpn:check', {}),
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
  sessionState: {
    summary: () =>
      ipcCall<unknown, { summary: { updatedAt: number; windowCount: number; tabCount: number } | null }>(
        'session:lastSnapshotSummary',
        {},
      ),
    restore: () => ipcCall<unknown, { restored: boolean; tabCount?: number; error?: string }>('session:restoreLast', {}),
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
  extensionNexus: {
    list: () => ipcCall<unknown, NexusListResponse>('plugins:nexus:list', {}),
    publish: (metadata: {
      pluginId: string;
      name: string;
      version: string;
      description: string;
      author: string;
      sourcePeer: string;
      carbonScore?: number;
      tags?: string[];
    }) => ipcCall<typeof metadata, NexusPluginEntry>('plugins:nexus:publish', metadata),
    trust: (pluginId: string, trusted: boolean) =>
      ipcCall<{ pluginId: string; trusted: boolean }, { plugin: NexusPluginEntry | null }>('plugins:nexus:trust', {
        pluginId,
        trusted,
      }),
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
    createShadowSession: (options?: { url?: string; persona?: string; summary?: boolean }) =>
      ipcCall<{ url?: string; persona?: string; summary?: boolean }, { sessionId: string }>('private:shadow:start', options || {}),
    endShadowSession: (sessionId: string, options?: { forensic?: boolean }) =>
      ipcCall<{ sessionId: string; forensic?: boolean }, { success: boolean }>('private:shadow:end', { sessionId, forensic: options?.forensic ?? false }),
    closeAll: () =>
      ipcCall<unknown, { count: number }>('private:closeAll', {}),
    panicWipe: (options?: { forensic?: boolean }) =>
      ipcCall<{ forensic?: boolean }, { success: boolean }>('private:panicWipe', options || {}),
  },
  crossReality: {
    handoff: (tabId: string, target: 'mobile' | 'xr') =>
      ipcCall<{ tabId: string; target: 'mobile' | 'xr' }, { success: boolean; handoff: any }>('cross-reality:handoff', {
        tabId,
        target,
      }),
    queue: () => ipcCall<unknown, { handoffs: any[] }>('cross-reality:queue', {}),
  },
};

