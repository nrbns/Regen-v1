/**
 * Typed IPC Client for Renderer
 * Provides type-safe IPC calls with automatic error handling
 */

// @ts-nocheck

import { z } from 'zod';
import type { PrivacyAuditSummary } from './ipc-events';
import { isDevEnv, isElectronRuntime } from './env';
import type { EcoImpactForecast } from '../types/ecoImpact';
import type { TrustSummary } from '../types/trustWeaver';
import type { NexusListResponse, NexusPluginEntry } from '../types/extensionNexus';
import type { IdentityCredential, IdentityRevealPayload, IdentityVaultSummary } from '../types/identity';
import type { ConsentAction, ConsentRecord } from '../types/consent';
import { useTabsStore } from '../state/tabsStore';
import { useContainerStore } from '../state/containerStore';

const IS_DEV = isDevEnv();

const DEFAULT_PROFILE_POLICY = Object.freeze({
  allowDownloads: true,
  allowPrivateWindows: true,
  allowGhostTabs: true,
  allowScreenshots: true,
  allowClipping: true,
});

const createDefaultProfile = () => ({
  id: 'default',
  name: 'Default',
  createdAt: Date.now(),
  proxy: undefined,
  kind: 'default' as const,
  color: '#3b82f6',
  system: true,
  policy: { ...DEFAULT_PROFILE_POLICY },
  description: 'Fallback profile (IPC unavailable)',
});

const FALLBACK_CHANNELS: Record<string, () => unknown> = {
  'profiles:list': () => [createDefaultProfile()],
  'profiles:get': () => createDefaultProfile(),
  'profiles:getActive': () => createDefaultProfile(),
  'profiles:getPolicy': () => ({ ...DEFAULT_PROFILE_POLICY }),
  'profiles:updateProxy': () => ({ success: false }),
  'profiles:delete': () => ({ success: false }),
  'sessions:list': () => [],
  'sessions:getActive': () => null,
  'workspace-v2:list': () => ({ workspaces: [] }),
  'trust:list': () => ({ records: [] }),
  'trust:getStatus': () => ({ status: 'unknown', totalRecords: 0, lastUpdatedAt: null }),
  'privacy:sentinel:audit': () => ({
    score: 0,
    grade: 'low',
    trackers: [],
    thirdPartyHosts: [],
    message: 'Privacy Sentinel unavailable outside Electron runtime.',
    suggestions: ['Launch the desktop build to enable Privacy Sentinel audits.'],
    timestamp: Date.now(),
    ai: null,
  }),
  'tor:status': () => ({
    running: false,
    bootstrapped: false,
    progress: 0,
    circuitEstablished: false,
    stub: true,
    error: 'Tor runtime not available in this environment.',
  }),
  'tor:start': () => ({ success: false, stub: true, warning: 'Tor runtime not available in this environment.' }),
  'tor:stop': () => ({ success: true, stub: true }),
  'tor:newIdentity': () => ({ success: false, stub: true }),
  'vpn:status': () => ({ connected: false, stub: true }),
  'vpn:check': () => ({ connected: false, stub: true }),
  'vpn:listProfiles': () => ([]),
  'vpn:connect': () => ({ connected: false, stub: true }),
  'vpn:disconnect': () => ({ connected: false, stub: true }),
  'dns:status': () => ({ enabled: false, provider: 'system', stub: true }),
  'tabs:predictiveGroups': () => ({ groups: [], prefetch: [], summary: undefined }),
  'tabs:create': () => {
    // Return a temporary tab ID for fallback
    return { id: `temp-${Date.now()}`, title: 'New Tab', url: 'about:blank', active: true };
  },
  'tabs:list': () => {
    try {
      const state = useTabsStore.getState?.();
      if (state) {
        return [...state.tabs];
      }
    } catch {
      // ignore
    }
    return [];
  },
  'tabs:getActive': () => {
    try {
      const state = useTabsStore.getState?.();
      if (state) {
        return state.tabs.find((tab) => tab.id === state.activeId) ?? null;
      }
    } catch {
      // ignore
    }
    return null;
  },
  'containers:list': () => {
    try {
      const state = useContainerStore.getState?.();
      if (state) {
        return [...state.containers];
      }
    } catch {
      // ignore
    }
    return [];
  },
  'containers:getActive': () => {
    try {
      const state = useContainerStore.getState?.();
      if (state) {
        return state.containers.find((c) => c.id === state.activeContainerId) ?? null;
      }
    } catch {
      // ignore
    }
    return null;
  },
  'identity:status': () => ({ status: 'locked', totalCredentials: 0, lastUpdatedAt: null } satisfies IdentityVaultSummary),
  'identity:unlock': () => ({ status: 'locked', totalCredentials: 0, lastUpdatedAt: null } satisfies IdentityVaultSummary),
  'identity:lock': () => ({ status: 'locked', totalCredentials: 0, lastUpdatedAt: null } satisfies IdentityVaultSummary),
  'identity:list': () => [] as IdentityCredential[],
  'identity:add': () => ({ id: 'demo', domain: 'example.com', username: 'demo', createdAt: Date.now(), updatedAt: Date.now() } satisfies IdentityCredential),
  'identity:remove': () => ({ success: false }),
  'identity:reveal': () => ({ id: 'demo', secret: 'demo' } satisfies IdentityRevealPayload),
  'consent:list': () => [],
  'shields:getStatus': () => ({ adsBlocked: 0, trackersBlocked: 0, httpsUpgrades: 0, cookies3p: 'allow', webrtcBlocked: false, fingerprinting: false }),
  'history:search': () => [],
  'performance:battery:update': () => ({ success: true }),
  'session:lastSnapshotSummary': () => null,
};

const reportedMissingChannels = new Set<string>();

function getFallback<T>(channel: string): T | undefined {
  const factory = FALLBACK_CHANNELS[channel];
  if (!factory) return undefined;
  return factory() as T;
}

function noteFallback(channel: string, reason: string) {
  if (!IS_DEV) return;
  if (reportedMissingChannels.has(channel)) return;
  reportedMissingChannels.add(channel);
  console.warn(`[IPC] Channel ${channel} unavailable (${reason}); using renderer fallback.`);
}

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
    // Double-check that window.ipc actually exists before marking as ready
    if (window.ipc && typeof window.ipc.invoke === 'function') {
      ipcReady = true;
      // Resolve all pending promises
      const resolvers = [...ipcReadyResolvers];
      ipcReadyResolvers = [];
      resolvers.forEach(resolve => resolve());
      if (IS_DEV) {
        console.log('[IPC] Ready signal received and window.ipc is available');
      }
    } else {
      if (IS_DEV) {
        console.warn('[IPC] Ready event received but window.ipc is not available');
        console.warn('[IPC] window.ipc:', window.ipc);
        console.warn('[IPC] window keys:', Object.keys(window).filter(k => k.includes('ipc') || k.includes('api')));
      }
    }
  };
  
  window.addEventListener('ipc:ready', handleIpcReady);
  
  // Also check if IPC is already available (in case event fired before listener was added)
  // Poll for window.ipc to appear (preload script might load after this code)
  let pollCount = 0;
  const maxPolls = 50; // Poll for up to 5 seconds (50 * 100ms)
  const pollInterval = setInterval(() => {
    pollCount++;
    if (window.ipc && typeof window.ipc.invoke === 'function') {
      clearInterval(pollInterval);
      if (!ipcReady) {
        handleIpcReady();
      }
    } else if (pollCount >= maxPolls) {
      clearInterval(pollInterval);
      if (IS_DEV) {
        console.warn('[IPC] window.ipc never appeared after polling');
        console.warn('[IPC] Available window properties:', Object.keys(window).filter(k => 
          k.includes('ipc') || k.includes('api') || k.includes('electron')
        ));
      }
    }
  }, 100);
  
  // Also check immediately
  if (window.ipc && typeof window.ipc.invoke === 'function') {
    setTimeout(() => {
      if (!ipcReady) {
        handleIpcReady();
      }
    }, 100);
  }
}

// Wait for IPC to be ready (with timeout)
async function waitForIPC(timeout = 10000): Promise<boolean> {
  // If already ready, return immediately
  if (ipcReady && typeof window !== 'undefined' && window.ipc && typeof window.ipc.invoke === 'function') {
    return true;
  }
  
  // Check if window.ipc exists (even if not marked as ready)
  if (typeof window !== 'undefined' && window.ipc && typeof window.ipc.invoke === 'function') {
    // Mark as ready if IPC bridge exists
    if (!ipcReady) {
      ipcReady = true;
      const resolvers = [...ipcReadyResolvers];
      ipcReadyResolvers = [];
      resolvers.forEach(resolve => resolve());
      if (IS_DEV) {
        console.log('[IPC] Bridge detected and marked as ready');
      }
    }
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
    
    // Also poll as fallback - check both ipcReady flag AND window.ipc existence
    const checkInterval = setInterval(() => {
      const hasIpc = typeof window !== 'undefined' && window.ipc && typeof window.ipc.invoke === 'function';
      if (ipcReady && hasIpc) {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        ipcReadyResolvers = ipcReadyResolvers.filter(r => r !== resolver);
        resolve(true);
      } else if (hasIpc && !ipcReady) {
        // IPC bridge exists but not marked ready - mark it now
        ipcReady = true;
        const allResolvers = [...ipcReadyResolvers];
        ipcReadyResolvers = [];
        allResolvers.forEach(r => r());
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        if (IS_DEV) {
          console.log('[IPC] Bridge detected during polling and marked as ready');
        }
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        ipcReadyResolvers = ipcReadyResolvers.filter(r => r !== resolver);
        if (IS_DEV) {
          console.warn(`[IPC] Timeout waiting for IPC bridge (${timeout}ms)`);
        }
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
 
  // Check if we're in Electron - be lenient, check multiple indicators
  const hasUserAgent = typeof navigator !== 'undefined' && navigator.userAgent;
  const userAgent = hasUserAgent ? navigator.userAgent : '';
  const userAgentHasElectron = userAgent.includes('Electron');
  const hasElectronRuntime = isElectronRuntime();
  // Check for window.ipc OR window.api (legacy API) - both indicate Electron
  const hasWindowIpc = typeof window !== 'undefined' && (
    (window.ipc && typeof window.ipc.invoke === 'function') ||
    (window.api && typeof window.api.ping === 'function')
  );
  
  // Check if we're in a regular web browser (Chrome, Firefox, Safari, Edge)
  // But exclude Electron's Chrome user agent
  const isRegularBrowser = userAgent.includes('Chrome') && !userAgent.includes('Electron') ||
                          userAgent.includes('Firefox') ||
                          (userAgent.includes('Safari') && !userAgent.includes('Chrome')) ||
                          userAgent.includes('Edg');
  
  // If we have window.ipc or window.api, we're definitely in Electron (even if other checks fail)
  // Also, if we're NOT in a regular browser, assume Electron (more aggressive detection)
  const isElectron = hasElectronRuntime || userAgentHasElectron || hasWindowIpc || !isRegularBrowser;

  // Wait for IPC to be ready (with longer timeout for first call)
  const isReady = await waitForIPC(8000);

  // Check if IPC bridge is actually available
  // Try to use window.ipc first, but also check if we can access ipcRenderer directly
  let ipcBridge = window.ipc;
  
  // If window.ipc is not available, try to create a bridge from window.api or direct access
  if (!ipcBridge || typeof ipcBridge.invoke !== 'function') {
    // Check if we can access Electron APIs directly (shouldn't work with context isolation, but worth trying)
    if (typeof window !== 'undefined' && (window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        if (ipcRenderer && typeof ipcRenderer.invoke === 'function') {
          // Create a temporary bridge
          ipcBridge = {
            invoke: async (ch: string, req: unknown) => {
              const response = await ipcRenderer.invoke(ch, req);
              if (response && typeof response === 'object' && 'ok' in response) {
                if (!response.ok) {
                  throw new Error(response.error || 'IPC call failed');
                }
                return response.data;
              }
              return response;
            },
            on: () => {},
            removeListener: () => {},
          };
        }
      } catch {
        // context isolation prevents direct access, that's expected
      }
    }
  }
  
  if (!isReady || !ipcBridge || typeof ipcBridge.invoke !== 'function') {
    // Always try fallback first if available, regardless of Electron detection
    const fallback = getFallback<TResponse>(channel);
    if (fallback !== undefined) {
      const reason = !isElectron && !hasWindowIpc ? 'non-Electron runtime' : 'IPC bridge not ready';
      noteFallback(channel, reason);
      return fallback;
    }
    
    // If no fallback and we're in Electron, this is an error
    if (IS_DEV) {
      console.warn(`[IPC] Channel ${channel} unavailable (IPC bridge not ready after 8s, no fallback available)`);
      console.warn(`[IPC] Debug: isElectron=${isElectron}, hasWindowIpc=${hasWindowIpc}, userAgentHasElectron=${userAgentHasElectron}, isReady=${isReady}`);
      console.warn(`[IPC] window.ipc:`, window.ipc);
      console.warn(`[IPC] window.api:`, window.api);
      console.warn(`[IPC] typeof window:`, typeof window);
    }
    throw new Error('IPC unavailable');
  }

  try {
      const response = await ipcBridge.invoke(fullChannel, request);

    if (schema && response !== undefined && response !== null) {
      const parsed = schema.safeParse(response);
      if (!parsed.success) {
        throw new Error(`Invalid response: ${parsed.error.message}`);
      }
      return parsed.data;
    }

    return response as TResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('No handler registered')) {
      const fallback = getFallback<TResponse>(channel);
      if (fallback !== undefined) {
        noteFallback(channel, 'handler not registered');
        return fallback;
      }
    }

    if (IS_DEV && !reportedMissingChannels.has(channel)) {
      reportedMissingChannels.add(channel);
      console.warn(`IPC call failed for ${channel}:`, message);
    }

    if (error instanceof Error) {
      throw error;
    }
    throw new Error(message);
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
  tor: {
    async status() {
      try {
        await waitForIPC(3000);
        return await ipcCall('tor:status', {});
      } catch (error) {
        if (IS_DEV) {
          console.warn('[IPC] tor.status falling back to stub', error);
        }
        return {
          running: false,
          bootstrapped: false,
          circuitEstablished: false,
          progress: 0,
          stub: true,
          error: 'Tor bridge unavailable',
        };
      }
    },
    async start() {
      try {
        await waitForIPC(3000);
        return await ipcCall('tor:start', {});
      } catch (error) {
        if (IS_DEV) {
          console.warn('[IPC] tor.start falling back to stub', error);
        }
        return { stub: true, warning: 'Tor bridge unavailable (stub mode)' };
      }
    },
    async stop() {
      try {
        await waitForIPC(3000);
        return await ipcCall('tor:stop', {});
      } catch (error) {
        if (IS_DEV) {
          console.warn('[IPC] tor.stop failed in stub mode', error);
        }
        return { stub: true };
      }
    },
    async newIdentity() {
      try {
        await waitForIPC(3000);
        return await ipcCall('tor:newIdentity', {});
      } catch (error) {
        if (IS_DEV) {
          console.warn('[IPC] tor.newIdentity failed in stub mode', error);
        }
        return { stub: true };
      }
    },
  },
  vpn: {
    async status() {
      try {
        await waitForIPC(3000);
        return await ipcCall('vpn:status', {});
      } catch (error) {
        if (IS_DEV) {
          console.warn('[IPC] vpn.status falling back to stub', error);
        }
        return {
          connected: false,
          type: 'stub',
          name: 'Not connected',
          stub: true,
        };
      }
    },
    async check() {
      try {
        await waitForIPC(3000);
        return await ipcCall('vpn:check', {});
      } catch (error) {
        if (IS_DEV) {
          console.warn('[IPC] vpn.check falling back to stub', error);
        }
        return {
          connected: false,
          type: 'stub',
          name: 'Not connected',
          stub: true,
        };
      }
    },
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
    allowSitePermission: (containerId: string, permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen', origin: string) =>
      ipcCall<{ containerId: string; permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen'; origin: string }, Array<{ permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen'; origins: string[] }>>('containers:allowSitePermission', { containerId, permission, origin }),
    revokeSitePermission: (containerId: string, permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen', origin: string) =>
      ipcCall<{ containerId: string; permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen'; origin: string }, Array<{ permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen'; origins: string[] }>>('containers:revokeSitePermission', { containerId, permission, origin }),
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
  telemetry: {
    setOptIn: (optIn: boolean) => {
      // Always return success, even if IPC fails (non-blocking for onboarding)
      return ipcCall<{ optIn: boolean }, { success: boolean }>('telemetry:setOptIn', { optIn })
        .catch(() => ({ success: true })); // Fallback to success if IPC fails
    },
    trackPerf: (metric: string, value: number, unit?: 'ms' | 'MB' | '%') => ipcCall<{ metric: string; value: number; unit?: 'ms' | 'MB' | '%' }, { success: boolean }>('telemetry:trackPerf', { metric, value, unit }),
    trackFeature: (feature: string, action?: string) => ipcCall<{ feature: string; action?: string }, { success: boolean }>('telemetry:trackFeature', { feature, action }),
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
    requestConsent: (url: string, filename: string, size?: number) =>
      ipcCall('downloads:requestConsent', { url, filename, size }),
    pause: (id: string) => ipcCall('downloads:pause', { id }),
    resume: (id: string) => ipcCall('downloads:resume', { id }),
    cancel: (id: string) => ipcCall('downloads:cancel', { id }),
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
    search: async (query: string) => {
      try {
        return await ipcCall<{ query: string }, any[]>('history:search', { query });
      } catch (error) {
        // Return empty array on error instead of throwing
        if (IS_DEV) {
          console.warn('History search failed:', error);
        }
        return [];
      }
    },
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
    status: () => ipcCall<unknown, { connected: boolean; type?: string; name?: string; interface?: string; server?: string; stub?: boolean }>('vpn:status', {}),
    check: () => ipcCall<unknown, { connected: boolean; type?: string; name?: string; interface?: string; server?: string; stub?: boolean }>('vpn:check', {}),
    listProfiles: () =>
      ipcCall<unknown, Array<{ id: string; name: string; type: string; server?: string }>>('vpn:listProfiles', {}),
    connect: (id: string) =>
      ipcCall<{ id: string }, { connected: boolean; type?: string; name?: string; interface?: string; server?: string }>(
        'vpn:connect',
        { id },
      ),
    disconnect: () =>
      ipcCall<unknown, { connected: boolean; type?: string; name?: string; interface?: string; server?: string }>(
        'vpn:disconnect',
        {},
      ),
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
    battery: {
      update: (payload: {
        level?: number | null;
        charging?: boolean | null;
        chargingTime?: number | null;
        dischargingTime?: number | null;
        carbonIntensity?: number | null;
        regionCode?: string | null;
      }) => ipcCall('performance:battery:update', payload),
    },
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
  identity: {
    status: () => ipcCall<unknown, IdentityVaultSummary>('identity:status', {}),
    unlock: (passphrase: string) =>
      ipcCall<{ passphrase: string }, IdentityVaultSummary>('identity:unlock', { passphrase }),
    lock: () => ipcCall<unknown, IdentityVaultSummary>('identity:lock', {}),
    list: () => ipcCall<unknown, IdentityCredential[]>('identity:list', {}),
    add: (payload: { domain: string; username: string; secret: string; secretHint?: string | null; tags?: string[] }) =>
      ipcCall<typeof payload, IdentityCredential>('identity:add', payload),
    remove: (id: string) => ipcCall<{ id: string }, { success: boolean }>('identity:remove', { id }),
    reveal: (id: string) => ipcCall<{ id: string }, IdentityRevealPayload>('identity:reveal', { id }),
  },
  consent: {
    createRequest: (action: ConsentAction) =>
      ipcCall<ConsentAction, { consentId: string }>('consent:createRequest', action),
    approve: (consentId: string) =>
      ipcCall<{ consentId: string }, { success: boolean; consent?: ConsentRecord | null; receipt?: { receiptId: string; proof: string } }>(
        'consent:approve',
        { consentId },
      ),
    revoke: (consentId: string) => ipcCall<{ consentId: string }, { success: boolean }>('consent:revoke', { consentId }),
    check: (action: ConsentAction) =>
      ipcCall<ConsentAction, { hasConsent: boolean }>('consent:check', action),
    get: (consentId: string) => ipcCall<{ consentId: string }, ConsentRecord | undefined>('consent:get', { consentId }),
    list: (filter?: { type?: ConsentAction['type']; approved?: boolean }) =>
      ipcCall<typeof filter, ConsentRecord[]>('consent:list', filter ?? {}),
    export: () => ipcCall<unknown, string>('consent:export', {}),
    vault: {
      export: () =>
        ipcCall<unknown, ConsentVaultSnapshot>('consent:vault:export', {}),
    },
  },
  research: {
    extractContent: (tabId?: string) =>
      ipcCall<{ tabId?: string }, { content: string; title: string; html: string }>('research:extractContent', tabId ? { tabId } : {}),
    saveNotes: (url: string, notes: string, highlights?: unknown[]) =>
      ipcCall<{ url: string; notes: string; highlights?: unknown[] }, { success: boolean }>('research:saveNotes', {
        url,
        notes,
        highlights,
      }),
    getNotes: (url: string) =>
      ipcCall<{ url: string }, { notes: string; highlights: unknown[] }>('research:getNotes', { url }),
    export: (payload: { format: 'markdown' | 'obsidian' | 'notion'; sources: string[]; includeNotes?: boolean }) =>
      ipcCall<typeof payload, any>('research:export', payload),
    saveSnapshot: (tabId: string) =>
      ipcCall<{ tabId: string }, { snapshotId: string; url: string }>('research:saveSnapshot', { tabId }),
    uploadFile: (file: File) => {
      // Convert File to base64 for IPC
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          const result = await ipcCall<{ 
            filename: string; 
            content: string; 
            mimeType: string;
            size: number;
          }, { fileId: string }>('research:uploadFile', {
            filename: file.name,
            content: base64.split(',')[1], // Remove data URL prefix
            mimeType: file.type,
            size: file.size,
          });
          resolve(result.fileId);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    listDocuments: () =>
      ipcCall<unknown, { documents: Array<{ id: string; type: string; title: string; uploadedAt: number; chunkCount: number }> }>('research:listDocuments', {}),
    getDocumentChunks: (documentId: string) =>
      ipcCall<{ documentId: string }, { chunks: Array<{ id: string; content: string; metadata: any }> }>('research:getDocumentChunks', { documentId }),
    capturePage: (tabId?: string) =>
      ipcCall<{ tabId?: string }, { snapshotId: string; url: string; title: string; dimensions: { width: number; height: number } }>('research:capturePage', tabId ? { tabId } : {}),
    captureSelection: (text?: string, tabId?: string) =>
      ipcCall<{ tabId?: string; text?: string }, { clipId: string; url: string; text: string }>('research:captureSelection', { tabId, text }),
  },
  reader: {
    summarize: (payload: { url?: string; title?: string; content: string; html?: string }) =>
      ipcCall<typeof payload, any>('reader:summarize', payload),
    export: (payload: { url?: string; title?: string; html: string }) =>
      ipcCall<typeof payload, { success: boolean; path: string }>('reader:export', payload),
  },
  trade: {
    placeOrder: (order: {
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
      orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
      limitPrice?: number;
      stopPrice?: number;
      timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
      bracket?: { stopLoss: number; takeProfit: number; stopLossType?: 'price' | 'percent' | 'atr'; takeProfitType?: 'price' | 'percent' | 'atr' };
      trailingStop?: { distance: number; distanceType: 'price' | 'percent' | 'atr'; activationPrice?: number };
      paper?: boolean;
      aiSignalId?: string;
    }) => ipcCall<typeof order, { orderId: string }>('trade:placeOrder', order),
    cancelOrder: (orderId: string) =>
      ipcCall<{ orderId: string }, { success: boolean }>('trade:cancelOrder', { orderId }),
    getOrders: (status?: string) =>
      ipcCall<{ status?: string }, { orders: Array<{
        id: string;
        symbol: string;
        side: 'buy' | 'sell';
        quantity: number;
        filledQuantity: number;
        orderType: string;
        status: string;
        limitPrice?: number;
        stopPrice?: number;
        averageFillPrice?: number;
        createdAt: number;
        filledAt?: number;
        paper: boolean;
      }> }>('trade:getOrders', status ? { status } : {}),
    getPositions: () =>
      ipcCall<unknown, { positions: Array<{
        id: string;
        symbol: string;
        quantity: number;
        averageEntryPrice: number;
        currentPrice: number;
        unrealizedPnL: number;
        realizedPnL: number;
        entryOrderId: string;
        paper: boolean;
      }> }>('trade:getPositions', {}),
    closePosition: (symbol: string, quantity?: number) =>
      ipcCall<{ symbol: string; quantity?: number }, { success: boolean; orderId?: string; error?: string }>('trade:closePosition', { symbol, quantity }),
    getBalance: () =>
      ipcCall<unknown, { cash: number; buyingPower: number; portfolioValue: number }>('trade:getBalance', {}),
    connectBroker: (config: { brokerId: string; apiKey: string; apiSecret: string; paper: boolean }) =>
      ipcCall<typeof config, { success: boolean }>('trade:connectBroker', config),
    getQuote: (symbol: string) =>
      ipcCall<{ symbol: string }, { symbol: string; bid: number; ask: number; last: number; volume: number; timestamp: number }>('trade:getQuote', { symbol }),
    getCandles: (params: { symbol: string; timeframe: string; from: number; to: number }) =>
      ipcCall<typeof params, { candles: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }> }>('trade:getCandles', params),
  },
  dns: {
    status: () => ipcCall<unknown, { enabled: boolean; provider: 'cloudflare' | 'quad9' }>('dns:status', {}),
    enableDoH: (provider: 'cloudflare' | 'quad9' = 'cloudflare') =>
      ipcCall<{ provider: 'cloudflare' | 'quad9' }>('dns:enableDoH', { provider }),
    disableDoH: () => ipcCall('dns:disableDoH', {}),
  },
  privacy: {
    sentinel: {
      audit: (tabId?: string | null) =>
        ipcCall<{ tabId?: string | null } | undefined, PrivacyAuditSummary>('privacy:sentinel:audit', tabId ? { tabId } : {}),
    },
  },
};

type ConsentVaultEntry = {
  consentId: string;
  actionType: ConsentAction['type'];
  approved: boolean;
  timestamp: number;
  signature: string;
  chainHash: string;
  metadata: Record<string, unknown>;
};

type ConsentVaultSnapshot = {
  entries: ConsentVaultEntry[];
  anchor: string;
  updatedAt: number;
};

