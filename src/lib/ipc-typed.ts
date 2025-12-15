/**
 * Typed IPC Client for Renderer
 * Provides type-safe IPC calls with automatic error handling
 */

// @ts-nocheck

import { z } from 'zod';
import type { PrivacyAuditSummary } from './ipc-events';
import { ipcEvents } from './ipc-events';
import { isDevEnv, isElectronRuntime, isTauriRuntime } from './env';
import apiClient from './api-client';
import type { EcoImpactForecast } from '../types/ecoImpact';
import type { TrustSummary } from '../types/trustWeaver';
import type { NexusListResponse, NexusPluginEntry } from '../types/extensionNexus';
import type {
  IdentityCredential,
  IdentityRevealPayload,
  IdentityVaultSummary,
} from '../types/identity';
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

const FALLBACK_CHANNELS: Record<string, (req?: any) => unknown> = {
  'tabs:setMemoryCap': () => ({ success: true }),
  'telemetry:trackPerf': () => ({ success: false, stub: true }),
  'system:getStatus': () => ({
    redisConnected: false,
    redixAvailable: false,
    workerState: 'stopped',
    vpn: { connected: false },
    tor: { running: false, bootstrapped: false },
    mode: 'Research',
    uptime: 0,
    memoryUsage: {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
    },
  }),
  'session:checkRestore': () => ({ available: false }),
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
  'tor:start': () => ({
    success: false,
    stub: true,
    warning: 'Tor runtime not available in this environment.',
  }),
  'tor:stop': () => ({ success: true, stub: true }),
  'tor:newIdentity': () => ({ success: false, stub: true }),
  'vpn:status': () => ({ connected: false, stub: true }),
  'vpn:check': () => ({ connected: false, stub: true }),
  'vpn:listProfiles': () => [],
  'vpn:connect': () => ({ connected: false, stub: true }),
  'vpn:disconnect': () => ({ connected: false, stub: true }),
  'dns:status': () => ({ enabled: false, provider: 'system', stub: true }),
  'tabs:predictiveGroups': () => ({ groups: [], prefetch: [], summary: undefined }),
  'tabs:create': (req?: any) => {
    const payload = typeof req === 'object' && req ? req : {};
    const tabsState = getTabsStore();
    const previousActiveId = tabsState?.activeId;
    const tabId =
      (typeof payload.tabId === 'string' && payload.tabId.trim().length > 0
        ? payload.tabId
        : undefined) ?? `tab-${Date.now()}`;
    const url =
      typeof payload.url === 'string' && payload.url.trim().length > 0
        ? payload.url
        : 'about:blank';
    const title =
      typeof payload.title === 'string' && payload.title.trim().length > 0
        ? payload.title
        : deriveTitleFromUrl(url);

    tabsState?.add?.({
      id: tabId,
      title,
      url,
      mode: payload.mode,
      appMode: payload.appMode,
      containerId: payload.containerId,
      createdAt: payload.createdAt ?? Date.now(),
      lastActiveAt: payload.lastActiveAt ?? Date.now(),
      profileId: payload.profileId,
      sessionId: payload.sessionId,
    });

    if (payload.activate === false && previousActiveId && tabsState?.setActive) {
      tabsState.setActive(previousActiveId);
    }

    return { id: tabId, title, url, success: true };
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
        return state.tabs.find(tab => tab.id === state.activeId) ?? null;
      }
    } catch {
      // ignore
    }
    return null;
  },
  'tabs:close': (req?: { id?: string }) => {
    try {
      if (req?.id) {
        const state = useTabsStore.getState?.();
        state?.remove?.(req.id);
      }
    } catch {
      // ignore
    }
    return { success: true };
  },
  'tabs:activate': (req?: { id?: string }) => {
    try {
      if (req?.id) {
        const state = useTabsStore.getState?.();
        state?.setActive?.(req.id);
      }
    } catch {
      // ignore
    }
    return { success: true };
  },
  'tabs:navigate': (req?: { id?: string; url?: string }) => {
    try {
      if (req?.id && req?.url) {
        const state = useTabsStore.getState?.();
        if (state?.navigateTab) {
          state.navigateTab(req.id, req.url);
        } else {
          state?.updateTab?.(req.id, { url: req.url, title: deriveTitleFromUrl(req.url) });
        }
      }
    } catch {
      // ignore
    }
    return { success: true };
  },
  'tabs:goBack': (req?: { id?: string }) => {
    try {
      if (req?.id) {
        const state = useTabsStore.getState?.();
        state?.goBack?.(req.id);
      }
    } catch {
      // ignore
    }
    return { success: true };
  },
  'tabs:goForward': (req?: { id?: string }) => {
    try {
      if (req?.id) {
        const state = useTabsStore.getState?.();
        state?.goForward?.(req.id);
      }
    } catch {
      // ignore
    }
    return { success: true };
  },
  'tabs:reload': () => ({ success: true }),
  'tabs:stop': () => ({ success: true }),
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
        return state.containers.find(c => c.id === state.activeContainerId) ?? null;
      }
    } catch {
      // ignore
    }
    return null;
  },
  'identity:status': () =>
    ({ status: 'locked', totalCredentials: 0, lastUpdatedAt: null }) satisfies IdentityVaultSummary,
  'identity:unlock': () =>
    ({ status: 'locked', totalCredentials: 0, lastUpdatedAt: null }) satisfies IdentityVaultSummary,
  'identity:lock': () =>
    ({ status: 'locked', totalCredentials: 0, lastUpdatedAt: null }) satisfies IdentityVaultSummary,
  'identity:list': () => [] as IdentityCredential[],
  'identity:add': () =>
    ({
      id: 'demo',
      domain: 'example.com',
      username: 'demo',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }) satisfies IdentityCredential,
  'identity:remove': () => ({ success: false }),
  'identity:reveal': () => ({ id: 'demo', secret: 'demo' }) satisfies IdentityRevealPayload,
  'consent:list': () => [],
  'shields:getStatus': () => ({
    adsBlocked: 0,
    trackersBlocked: 0,
    httpsUpgrades: 0,
    cookies3p: 'allow',
    webrtcBlocked: false,
    fingerprinting: false,
  }),
  'history:search': () => [],
  'performance:battery:update': () => ({ success: true }),
  'session:lastSnapshotSummary': () => null,
  'telemetry:getStatus': () => ({ optIn: false, enabled: false }),
  'telemetry:getSummary': () => ({
    optIn: false,
    enabled: false,
    crashCount: 0,
    lastCrashAt: null,
    uptimeSeconds: 0,
    perfMetrics: [],
  }),
  'analytics:getStatus': () => ({ optIn: false, enabled: false }),
  'cross-reality:handoff': () => ({ success: false, handoff: null }),
  'cross-reality:queue': () => ({ handoffs: [] }),
  'cross-reality:handoffStatus': () => ({ success: true }),
  'research:queryEnhanced': (payload?: any) => {
    if (!payload?.query) {
      return {
        query: '',
        summary: 'Enter a question to start research.',
        sources: [],
        citations: [],
        confidence: 0,
        language: 'en',
        languageLabel: 'English',
        languageConfidence: 0,
        verification: {
          verified: false,
          claimDensity: 0,
          citationCoverage: 0,
          ungroundedClaims: [],
          hallucinationRisk: 1,
          suggestions: ['Add a research query to continue.'],
        },
        contradictions: [],
      };
    }
    return apiClient.research.queryEnhanced(payload);
  },
};

const reportedMissingChannels = new Set<string>();

function getTabsStore() {
  try {
    return typeof useTabsStore.getState === 'function' ? useTabsStore.getState() : undefined;
  } catch {
    return undefined;
  }
}

export function deriveTitleFromUrl(url?: string) {
  if (!url || url === 'about:blank') {
    return 'New Tab';
  }
  try {
    const parsed = new URL(url);
    return parsed.hostname || url;
  } catch {
    return url;
  }
}

function getFallback<T>(channel: string, request?: unknown): T | undefined {
  const factory = FALLBACK_CHANNELS[channel];
  if (!factory) return undefined;
  return factory(request) as T;
}

function noteFallback(channel: string, reason: string) {
  if (!IS_DEV) return;
  if (reportedMissingChannels.has(channel)) return;

  // Don't warn about missing channels in web mode - they're expected
  // Only warn if we're in a runtime that should have IPC (Electron/Tauri)
  const expectsIPC = isElectronRuntime() || isTauriRuntime();

  if (!expectsIPC) return; // Silent in web mode

  reportedMissingChannels.add(channel);
  console.warn(`[IPC] Channel ${channel} unavailable (${reason}); using renderer fallback.`);
}

async function mapIpcToHttp<TRequest, TResponse = unknown>(
  channel: string,
  request: TRequest,
  schema?: z.ZodSchema<TResponse>
): Promise<TResponse> {
  const normalized = channel.replace('ob://ipc/v1/', '');

  const handlers: Record<string, (req: any) => Promise<unknown>> = {
    'tabs:list': () => apiClient.tabs.list(),
    'tabs:create': async (req: any) => {
      if (typeof req === 'string') {
        return apiClient.tabs.create({ url: req });
      }
      if (req && typeof req === 'object') {
        const payload = 'url' in req ? req : { url: 'about:blank' };
        return apiClient.tabs.create(payload);
      }
      return apiClient.tabs.create({ url: 'about:blank' });
    },
    'tabs:close': (req: any) => apiClient.tabs.close(req.id),
    'tabs:activate': (req: any) => apiClient.tabs.activate(req.id),
    'tabs:navigate': (req: any) => apiClient.tabs.navigate(req),
    'tabs:goBack': (req: any) => apiClient.tabs.goBack(req.id),
    'tabs:goForward': (req: any) => apiClient.tabs.goForward(req.id),
    'tabs:reload': (req: any) => apiClient.tabs.reload(req.id, req),
    'tabs:stop': (req: any) => apiClient.tabs.stop(req.id),
    'tabs:overlay/start': () => apiClient.tabs.overlayStart(),
    'tabs:overlay/pick': () => apiClient.tabs.overlayGetPick(),
    'tabs:overlay/clear': () => apiClient.tabs.overlayClear(),
    'sessions:list': () => apiClient.sessions.list(),
    'sessions:create': (req: any) => apiClient.sessions.create(req),
    'sessions:getActive': () => apiClient.sessions.getActive(),
    'session:checkRestore': () => apiClient.session.checkRestore(),
    'session:getSnapshot': () => apiClient.session.getSnapshot(),
    'session:dismissRestore': () => apiClient.session.dismissRestore(),
    'system:getStatus': () => apiClient.system.getStatus(),
    'agent:ask': (req: any) => apiClient.agent.ask(req),
    'telemetry:getStatus': () => apiClient.system.getStatus(),
    'research:queryEnhanced': (req: any) => apiClient.research.queryEnhanced(req),
    'search:hybrid': async (req: any) => {
      const response = await fetch(
        `${apiClient.API_BASE_URL || 'http://localhost:3000'}/api/search/hybrid`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: req.query,
            lang: req.language || 'auto',
            maxResults: req.maxResults || 6,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      return response.json();
    },
  };

  const handler = handlers[normalized];
  if (!handler) {
    // In web mode, suppress errors for missing mappings - they're expected
    const isWeb =
      typeof window !== 'undefined' && !(window as any).__ELECTRON__ && !(window as any).__TAURI__;
    if (isWeb) {
      // Return a rejected promise that won't be logged
      return Promise.reject(new Error(`No HTTP endpoint mapping for channel: ${normalized}`));
    }
    throw new Error(`No HTTP endpoint mapping for channel: ${normalized}`);
  }

  const response = await handler(request);
  if (schema && response !== undefined && response !== null) {
    const parsed = schema.safeParse(response);
    if (!parsed.success) {
      throw new Error(`Invalid response: ${parsed.error.message}`);
    }
    return parsed.data;
  }
  return response as TResponse;
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
        console.warn(
          '[IPC] window keys:',
          Object.keys(window).filter(k => k.includes('ipc') || k.includes('api'))
        );
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
      // Only warn in Electron/Tauri mode - silent in web mode
      const expectsIPC = isElectronRuntime() || isTauriRuntime();
      if (IS_DEV && expectsIPC) {
        console.warn('[IPC] window.ipc never appeared after polling');
        console.warn(
          '[IPC] Available window properties:',
          Object.keys(window).filter(
            k => k.includes('ipc') || k.includes('api') || k.includes('electron')
          )
        );
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
  // In web mode, skip IPC wait entirely - resolve immediately with false
  // This prevents timeout warnings in web mode where IPC is not available
  if (!isElectronRuntime() && !isTauriRuntime()) {
    return Promise.resolve(false);
  }

  // If already ready, return immediately
  if (
    ipcReady &&
    typeof window !== 'undefined' &&
    window.ipc &&
    typeof window.ipc.invoke === 'function'
  ) {
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
  return new Promise(resolve => {
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
      const hasIpc =
        typeof window !== 'undefined' && window.ipc && typeof window.ipc.invoke === 'function';
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
        // Don't log IPC timeout warnings in web mode - they're expected
        // Only log if we're actually expecting IPC (Electron/Tauri runtime)
        const expectsIPC = isElectronRuntime() || isTauriRuntime();
        if (IS_DEV && expectsIPC) {
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
  const hasWindowIpc =
    typeof window !== 'undefined' &&
    ((window.ipc && typeof window.ipc.invoke === 'function') ||
      (window.api && typeof window.api.ping === 'function'));

  // Check if we're in a regular web browser (Chrome, Firefox, Safari, Edge)
  // But exclude Electron's Chrome user agent
  const isRegularBrowser =
    (userAgent.includes('Chrome') && !userAgent.includes('Electron')) ||
    userAgent.includes('Firefox') ||
    (userAgent.includes('Safari') && !userAgent.includes('Chrome')) ||
    userAgent.includes('Edg');

  // Explicitly detect Tauri runtime and ensure we DO NOT treat it like Electron here.
  // In Tauri, there is no Electron-style window.ipc bridge; we should use HTTP mappings
  // or renderer fallbacks instead of waiting for a non-existent Electron IPC.
  const isTauri = isTauriRuntime();

  // If we have window.ipc or window.api, we're definitely in Electron (even if other checks fail)
  // Also, if we're NOT in a regular browser, assume Electron (more aggressive detection).
  // However, force Electron=false when running in Tauri to avoid misclassification.
  const isElectron = !isTauri &&
    (hasElectronRuntime || userAgentHasElectron || hasWindowIpc || !isRegularBrowser);

  // Wait for IPC to be ready (with longer timeout for first call)
  const isReady = await waitForIPC(8000);

  // Check if IPC bridge is actually available
  // Migration: Use HTTP API client if not in Electron runtime
  if (!isElectron) {
    // Map IPC channels to HTTP API calls
    try {
      return await mapIpcToHttp<TRequest, TResponse>(fullChannel, request, schema);
    } catch (error) {
      // Fallback to default fallback if HTTP call fails
      const normalized = fullChannel.replace('ob://ipc/v1/', '');
      const fallback = getFallback<TResponse>(normalized, request);
      if (fallback !== undefined) {
        noteFallback(normalized, 'HTTP API unavailable, using fallback');
        return fallback;
      }
      throw error;
    }
  }

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
    const fallback = getFallback<TResponse>(channel, request);
    if (fallback !== undefined) {
      const reason = !isElectron && !hasWindowIpc ? 'non-Electron runtime' : 'IPC bridge not ready';
      noteFallback(channel, reason);
      return fallback;
    }

    // If no fallback and we're in Electron, this is an error
    if (IS_DEV) {
      console.warn(
        `[IPC] Channel ${channel} unavailable (IPC bridge not ready after 8s, no fallback available)`
      );
      console.warn(
        `[IPC] Debug: isElectron=${isElectron}, hasWindowIpc=${hasWindowIpc}, userAgentHasElectron=${userAgentHasElectron}, isReady=${isReady}`
      );
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
      const fallback = getFallback<TResponse>(channel, request);
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
export const ipc: any = {
  windowControl: {
    toggleFullscreen: (force?: boolean) =>
      ipcCall<{ fullscreen?: boolean }, { success: boolean; fullscreen: boolean }>(
        'app:toggleFullscreen',
        {
          fullscreen: force,
        }
      ).catch(error => {
        if (IS_DEV) {
          console.warn('[IPC] Failed to toggle fullscreen:', error);
        }
        return { success: false, fullscreen: false };
      }),
    setFullscreen: (fullscreen: boolean) =>
      ipcCall<{ fullscreen: boolean }, { success: boolean; fullscreen: boolean }>(
        'app:setFullscreen',
        { fullscreen }
      ).catch(error => {
        if (IS_DEV) {
          console.warn('[IPC] Failed to set fullscreen:', error);
        }
        return { success: false, fullscreen };
      }),
    getState: () =>
      ipcCall<unknown, { fullscreen: boolean }>('app:getWindowState', {}).catch(() => ({
        fullscreen: !!document.fullscreenElement,
      })),
  },
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
          }
    ) => {
      try {
        // Wait for IPC to be ready
        await waitForIPC(5000);
        const payload = typeof input === 'string' ? { url: input } : input || {};
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
    navigate: (id: string, url: string) =>
      ipcCall('tabs:navigate', { id, url }).catch(err => console.warn('Failed to navigate:', err)),
    goBack: (id: string) =>
      ipcCall('tabs:goBack', { id }).catch(err => console.warn('Failed to go back:', err)),
    goForward: (id: string) =>
      ipcCall('tabs:goForward', { id }).catch(err => console.warn('Failed to go forward:', err)),
    setMemoryCap: async (tabId: string, capMB: number) => {
      try {
        return await ipcCall('tabs:setMemoryCap', { tabId, capMB });
      } catch (err) {
        if (IS_DEV) {
          console.warn('Failed to set memory cap:', err);
        }
        throw err;
      }
    },
    devtools: (id: string) => ipcCall('tabs:devtools', { id }),
    zoomIn: (id: string) =>
      ipcCall<{ id: string }, { success: boolean; error?: string }>('tabs:zoomIn', { id }),
    zoomOut: (id: string) =>
      ipcCall<{ id: string }, { success: boolean; error?: string }>('tabs:zoomOut', { id }),
    zoomReset: (id: string) =>
      ipcCall<{ id: string }, { success: boolean; error?: string }>('tabs:zoomReset', { id }),
    screenshot: (id?: string) =>
      ipcCall<{ id?: string }, { success: boolean; path?: string; error?: string }>(
        'tabs:screenshot',
        { id }
      ),
    capturePreview: (request: { id: string; maxWidth?: number; quality?: number }) =>
      ipcCall<
        { id: string; maxWidth?: number; quality?: number },
        { success: boolean; dataUrl?: string; width?: number; height?: number; error?: string }
      >('tabs:capturePreview', request),
    pip: (id?: string, enabled?: boolean) =>
      ipcCall<{ id?: string; enabled?: boolean }, { success: boolean; error?: string }>(
        'tabs:pip',
        { id, enabled }
      ),
    find: (id?: string) =>
      ipcCall<{ id?: string }, { success: boolean; error?: string }>('tabs:find', { id }),
    reload: (id: string, options?: { hard?: boolean }) =>
      ipcCall('tabs:reload', { id, ...(options ?? {}) }).catch(err =>
        console.warn('Failed to reload:', err)
      ),
    stop: (id: string) =>
      ipcCall('tabs:stop', { id }).catch(err => console.warn('Failed to stop loading:', err)),
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
    wake: (id: string) =>
      ipcCall<{ id: string }, { success: boolean; error?: string }>('tabs:wake', { id }),
    burn: (id: string) => ipcCall('tabs:burn', { id }),
    onUpdated: (
      callback: (
        tabs: Array<{
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
      ) => void
    ) => {
      if ((window.ipc as any)?.on) {
        (window.ipc as any).on('tabs:updated', (_event: any, tabs: any[]) => callback(tabs));
      }
    },
    setContainer: (id: string, containerId: string) =>
      ipcCall<{ id: string; containerId: string }, { success: boolean; error?: string }>(
        'tabs:setContainer',
        {
          id,
          containerId,
        }
      ),
    reorder: (tabId: string, newIndex: number) =>
      ipcCall<{ tabId: string; newIndex: number }, { success: boolean; error?: string }>(
        'tabs:reorder',
        {
          tabId,
          newIndex,
        }
      ),
    reopenClosed: (index?: number) =>
      ipcCall<{ index?: number }, { success: boolean; tabId?: string; error?: string }>(
        'tabs:reopenClosed',
        {
          index,
        }
      ),
    setPinned: (request: { id: string; pinned: boolean }) =>
      ipcCall<
        { id: string; pinned: boolean },
        { success: boolean; error?: string; unchanged?: boolean }
      >('tabs:setPinned', request),
    listClosed: () =>
      ipcCall<
        unknown,
        Array<{
          id: string;
          url: string;
          title: string;
          containerId?: string;
          containerName?: string;
          containerColor?: string;
          mode?: 'normal' | 'ghost' | 'private';
          closedAt: number;
        }>
      >('tabs:listClosed', {}),
    getContext: (tabId?: string) =>
      ipcCall<
        { tabId?: string },
        {
          success: boolean;
          context?: { tabId: string; url: string; title: string; pageText: string; domain: string };
          error?: string;
        }
      >('tabs:getContext', { tabId }),
  },
  workflow: {
    launch: (query: string) =>
      ipcCall<
        { query: string },
        {
          success: boolean;
          workflowId?: string;
          workflowName?: string;
          results?: any[];
          error?: string;
        }
      >('workflow:launch', { query }),
    list: () =>
      ipcCall<
        unknown,
        { success: boolean; workflows?: Array<{ id: string; name: string; description: string }> }
      >('workflow:list', {}),
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
    async getProxy() {
      try {
        await waitForIPC(3000);
        return await ipcCall<unknown, { proxy: string | null; stub?: boolean }>('tor:getProxy', {});
      } catch (error) {
        if (IS_DEV) {
          console.warn('[IPC] tor.getProxy falling back to stub', error);
        }
        return { proxy: null, stub: true };
      }
    },
  },
  vpn: {
    async status() {
      try {
        await waitForIPC(3000);
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('VPN status timeout')), 4000);
        });
        return await Promise.race([ipcCall('vpn:status', {}), timeoutPromise]);
      } catch (error) {
        // Silently fall back to stub - VPN status is non-critical
        // Only log in dev mode if it's not a timeout
        if (IS_DEV && !(error instanceof Error && error.message.includes('timeout'))) {
          console.debug('[IPC] vpn.status falling back to stub', error);
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
    listProfiles: () =>
      ipcCall<unknown, Array<{ id: string; name: string; type: string; server?: string }>>(
        'vpn:listProfiles',
        {}
      ),
    connect: (id: string) =>
      ipcCall<
        { id: string },
        { connected: boolean; type?: string; name?: string; interface?: string; server?: string }
      >('vpn:connect', { id }),
    disconnect: () =>
      ipcCall<
        unknown,
        { connected: boolean; type?: string; name?: string; interface?: string; server?: string }
      >('vpn:disconnect', {}),
  },
  containers: {
    list: () =>
      ipcCall<
        unknown,
        Array<{
          id: string;
          name: string;
          color: string;
          icon?: string;
          description?: string;
          scope: string;
          persistent: boolean;
          system?: boolean;
        }>
      >('containers:list', {}),
    getActive: () =>
      ipcCall<
        unknown,
        {
          id: string;
          name: string;
          color: string;
          icon?: string;
          description?: string;
          scope?: string;
          persistent?: boolean;
          system?: boolean;
        }
      >('containers:getActive', {}),
    setActive: (containerId: string) =>
      ipcCall<
        { containerId: string },
        {
          id: string;
          name: string;
          color: string;
          icon?: string;
          description?: string;
          scope?: string;
          persistent?: boolean;
          system?: boolean;
        }
      >('containers:setActive', { containerId }),
    create: (payload: { name: string; color?: string; icon?: string }) =>
      ipcCall<
        { name: string; color?: string; icon?: string },
        {
          id: string;
          name: string;
          color: string;
          icon?: string;
          description?: string;
          scope?: string;
          persistent?: boolean;
          system?: boolean;
        }
      >('containers:create', payload),
    getPermissions: (containerId: string) =>
      ipcCall<{ containerId: string }, { containerId: string; permissions: string[] }>(
        'containers:getPermissions',
        { containerId }
      ),
    setPermission: (
      containerId: string,
      permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen',
      enabled: boolean
    ) =>
      ipcCall<
        {
          containerId: string;
          permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen';
          enabled: boolean;
        },
        { containerId: string; permissions: string[] }
      >('containers:setPermission', { containerId, permission, enabled }),
    getSitePermissions: (containerId: string) =>
      ipcCall<
        { containerId: string },
        Array<{
          permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen';
          origins: string[];
        }>
      >('containers:getSitePermissions', { containerId }),
    allowSitePermission: (
      containerId: string,
      permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen',
      origin: string
    ) =>
      ipcCall<
        {
          containerId: string;
          permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen';
          origin: string;
        },
        Array<{
          permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen';
          origins: string[];
        }>
      >('containers:allowSitePermission', { containerId, permission, origin }),
    revokeSitePermission: (
      containerId: string,
      permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen',
      origin: string
    ) =>
      ipcCall<
        {
          containerId: string;
          permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen';
          origin: string;
        },
        Array<{
          permission: 'media' | 'display-capture' | 'notifications' | 'fullscreen';
          origins: string[];
        }>
      >('containers:revokeSitePermission', { containerId, permission, origin }),
  },
  ui: {
    setChromeOffsets: async (
      offsets: Partial<{ top: number; bottom: number; left: number; right: number }>
    ) => {
      try {
        return await ipcCall('ui:setChromeOffsets', offsets);
      } catch (err) {
        if (IS_DEV) {
          console.warn('[IPC] Failed to set chrome offsets:', err);
        }
        return { success: false };
      }
    },
  },
  proxy: {
    set: (config: {
      type?: 'socks5' | 'http';
      host?: string;
      port?: number;
      username?: string;
      password?: string;
      tabId?: string;
      profileId?: string;
      proxyRules?: string;
      mode?: string;
    }) => ipcCall('proxy:set', config),
    status: () =>
      ipcCall<unknown, { healthy: boolean; killSwitchEnabled: boolean }>('proxy:status', {}),
    getForTab: (tabId: string) =>
      ipcCall<unknown, { proxy: { type: string; host: string; port: number } | null }>(
        'proxy:getForTab',
        { tabId }
      ),
  },
  profiles: {
    create: (
      input: string | { name: string; proxy?: unknown; color?: string },
      proxy?: unknown
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
    updateProxy: (profileId: string, proxy?: unknown) =>
      ipcCall('profiles:updateProxy', { profileId, proxy }),
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
      >('profiles:getPolicy', profileId ? { profileId } : ({} as Record<string, never>)),
  },
  games: {
    createSandbox: (payload: { gameId: string; url: string; title?: string }) =>
      ipcCall<
        { gameId: string; url: string; title?: string },
        {
          sandboxId: string;
          partition?: string;
          url: string;
          hardened?: boolean;
          createdAt: number;
        }
      >('games:sandbox:create', payload),
    destroySandbox: (payload: { sandboxId: string }) =>
      ipcCall<{ sandboxId: string }, { success: boolean; error?: string }>(
        'games:sandbox:destroy',
        payload
      ),
    reportMetrics: (payload: {
      sandboxId: string;
      metrics: { fps?: number; droppedFrames?: number; memoryMb?: number; cpuPercent?: number };
    }) =>
      ipcCall<
        {
          sandboxId: string;
          metrics: { fps?: number; droppedFrames?: number; memoryMb?: number; cpuPercent?: number };
        },
        { success: boolean; error?: string }
      >('games:sandbox:metrics', payload),
  },
  telemetry: {
    setOptIn: (optIn: boolean) => {
      // Always return success, even if IPC fails (non-blocking for onboarding)
      return ipcCall<{ optIn: boolean }, { success: boolean }>('telemetry:setOptIn', {
        optIn,
      }).catch(() => ({ success: true })); // Fallback to success if IPC fails
    },
    getStatus: () =>
      ipcCall<Record<string, never>, { optIn: boolean; enabled: boolean }>(
        'telemetry:getStatus',
        {} as Record<string, never>
      ).catch(() => ({
        optIn: false,
        enabled: false,
      })),
    getSummary: () =>
      ipcCall<
        Record<string, never>,
        {
          optIn: boolean;
          enabled: boolean;
          crashCount: number;
          lastCrashAt: number | null;
          uptimeSeconds: number;
          perfMetrics: Array<{
            metric: string;
            samples: number;
            avg: number;
            p95: number;
            last: number;
            unit: string;
          }>;
        }
      >('telemetry:getSummary', {} as Record<string, never>).catch(() => ({
        optIn: false,
        enabled: false,
        crashCount: 0,
        lastCrashAt: null,
        uptimeSeconds: 0,
        perfMetrics: [],
      })),
    trackPerf: (metric: string, value: number, unit?: 'ms' | 'MB' | '%') =>
      ipcCall<{ metric: string; value: number; unit?: 'ms' | 'MB' | '%' }, { success: boolean }>(
        'telemetry:trackPerf',
        { metric, value, unit }
      ),
    trackFeature: (feature: string, action?: string) =>
      ipcCall<{ feature: string; action?: string }, { success: boolean }>(
        'telemetry:trackFeature',
        { feature, action }
      ),
  },
  analytics: {
    setOptIn: (optIn: boolean) =>
      ipcCall<{ optIn: boolean }, { success: boolean }>('analytics:setOptIn', { optIn }).catch(
        () => ({ success: true })
      ),
    getStatus: () =>
      ipcCall<Record<string, never>, { optIn: boolean; enabled: boolean }>(
        'analytics:getStatus',
        {}
      ).catch(() => ({
        optIn: false,
        enabled: false,
      })),
    track: (type: string, payload?: Record<string, unknown>) =>
      ipcCall<{ type: string; payload?: Record<string, unknown> }, { success: boolean }>(
        'analytics:track',
        { type, payload }
      ).catch(() => ({
        success: false,
      })),
  },
  settings: {
    get: () => ipcCall<unknown, unknown>('settings:get', {}),
    set: (path: string[], value: unknown) => ipcCall('settings:set', { path, value }),
    reset: () => ipcCall<unknown, { success: boolean; settings?: unknown }>('settings:reset', {}),
    getCategory: (category: string) =>
      ipcCall<{ category: string }, unknown>('settings:getCategory', { category }),
    setCategory: (category: string, values: Record<string, unknown>) =>
      ipcCall<
        { category: string; values: Record<string, unknown> },
        { success: boolean; settings?: unknown }
      >('settings:setCategory', { category, values }),
    exportAll: () =>
      ipcCall<unknown, { success: boolean; path?: string; canceled?: boolean }>(
        'settings:exportAll',
        {}
      ),
    importAll: () =>
      ipcCall<unknown, { success: boolean; path?: string; settings?: unknown; canceled?: boolean }>(
        'settings:importAll',
        {}
      ),
    exportFile: () =>
      ipcCall<unknown, { success: boolean; path?: string; canceled?: boolean }>(
        'settings:exportAll',
        {}
      ),
    importFile: () =>
      ipcCall<unknown, { success: boolean; path?: string; settings?: unknown; canceled?: boolean }>(
        'settings:importAll',
        {}
      ),
  },
  diagnostics: {
    openLogs: () => ipcCall<unknown, { success: boolean }>('diagnostics:openLogs', {}),
    copyDiagnostics: () => ipcCall<unknown, { diagnostics: string }>('diagnostics:copy', {}),
  },
  agent: {
    createTask: (task: unknown) => ipcCall('agent:createTask', task),
    generatePlan: (taskId: string, observations?: unknown[]) =>
      ipcCall('agent:generatePlan', { taskId, observations }),
    executeTask: (taskId: string, confirmSteps?: string[]) =>
      ipcCall('agent:executeTask', { taskId, confirmSteps }),
    cancelTask: (taskId: string) => ipcCall('agent:cancelTask', { taskId }),
    getStatus: (taskId: string) => ipcCall('agent:getStatus', { taskId }),
    ask: (query: string, context?: { url?: string; text?: string }) =>
      ipcCall<
        { query: string; context?: { url?: string; text?: string } },
        { answer: string; sources?: string[] }
      >('agent:ask', { query, context }),
    askWithScrape: (payload: {
      url: string;
      question: string;
      task?: 'summarize' | 'qa' | 'threat';
      waitFor?: number;
    }) =>
      ipcCall<
        { url: string; question: string; task?: 'summarize' | 'qa' | 'threat'; waitFor?: number },
        {
          jobId: string;
          task?: string;
          status?: 'complete' | 'enqueued';
          answer?: string;
          summary?: string;
          highlights?: string[];
          model?: string | { name?: string };
          sources?: string[];
          scrape: { status: number; cached: boolean; fetchedAt?: string };
        }
      >('agent:askWithScrape', payload),
    deepResearch: (request: {
      query: string;
      maxSources?: number;
      outputFormat?: 'json' | 'csv' | 'markdown';
      includeCitations?: boolean;
    }) => ipcCall('agent:deepResearch', request),
    stream: {
      start: (
        query: string,
        options?: { model?: string; temperature?: number; maxTokens?: number }
      ) => ipcCall('agent:stream:start', { query, ...options }),
      stop: (streamId: string) => ipcCall('agent:stream:stop', { streamId }),
    },
    generatePlanFromGoal: (request: { goal: string; mode?: string; constraints?: string[] }) =>
      ipcCall<{ goal: string; mode?: string; constraints?: string[] }, Plan>(
        'agent:generatePlanFromGoal',
        request
      ),
    executePlan: (request: { planId: string; plan: Plan }) => ipcCall('agent:executePlan', request),
    guardrails: {
      config: (config: any) => ipcCall('agent:guardrails:config', config),
      check: (type: 'prompt' | 'domain' | 'ratelimit' | 'step', data: any) =>
        ipcCall('agent:guardrails:check', { type, data }),
    },
  },
  cursor: {
    setApiKey: (payload: { apiKey: string }) =>
      ipcCall<{ apiKey: string }, { success: boolean }>('cursor:setApiKey', payload),
    checkApiKey: () =>
      ipcCall<unknown, { hasKey: boolean; isAvailable: boolean }>('cursor:checkApiKey', {}),
    query: (payload: {
      question: string;
      pageSnapshot?: { url: string; title: string; html?: string; text?: string };
      editorState?: {
        filePath: string;
        content: string;
        language?: string;
        cursorLine?: number;
        cursorCol?: number;
      };
      useWebSocket?: boolean;
      systemInstructions?: string;
    }) =>
      ipcCall<
        typeof payload,
        {
          jobId: string;
          answer?: string;
          status: 'streaming' | 'complete' | 'error';
          error?: string;
        }
      >('cursor:query', payload),
    clearHistory: () => ipcCall<unknown, { success: boolean }>('cursor:clearHistory', {}),
  },
  omnix: {
    browser: {
      getPage: () =>
        ipcCall<unknown, { url: string; title: string; html?: string; text?: string } | null>(
          'omnix:browser:getPage',
          {}
        ),
      getActiveTab: () =>
        ipcCall<unknown, { id: string; url: string; title: string } | null>(
          'omnix:browser:getActiveTab',
          {}
        ),
      captureSnapshot: (payload: { url?: string }) =>
        ipcCall<{ url?: string }, { url: string; title: string; html: string; text: string }>(
          'omnix:browser:captureSnapshot',
          payload
        ),
    },
    scrape: {
      fetch: (payload: { url: string; options?: { timeout?: number; cache?: boolean } }) =>
        ipcCall<typeof payload, { body: string; status: number; headers: Record<string, string> }>(
          'omnix:scrape:fetch',
          payload
        ),
      enqueue: (payload: { url: string }) =>
        ipcCall<{ url: string }, { jobId: string }>('omnix:scrape:enqueue', payload),
    },
    ai: {
      ask: (payload: { question: string; context?: { url?: string; text?: string } }) =>
        ipcCall<typeof payload, { answer: string; sources?: string[] }>('omnix:ai:ask', payload),
      summarize: (payload: { url: string }) =>
        ipcCall<{ url: string }, { summary: string; highlights: string[] }>(
          'omnix:ai:summarize',
          payload
        ),
    },
    trade: {
      getChart: (payload: { symbol: string }) =>
        ipcCall<{ symbol: string }, { data: unknown }>('omnix:trade:getChart', payload),
    },
    file: {
      save: (payload: { path: string; content: string }) =>
        ipcCall<{ path: string; content: string }, { success: boolean }>(
          'omnix:file:save',
          payload
        ),
      read: (payload: { path: string }) =>
        ipcCall<{ path: string }, { content: string }>('omnix:file:read', payload),
    },
    security: {
      scanPage: (payload: { url: string }) =>
        ipcCall<{ url: string }, { threats: string[]; score: number }>(
          'omnix:security:scanPage',
          payload
        ),
    },
  },
  session: {
    saveTabs: () => ipcCall<unknown, { success: boolean; count: number }>('session:saveTabs', {}),
    loadTabs: () =>
      ipcCall<
        unknown,
        {
          tabs: Array<{
            id: string;
            url: string;
            title: string;
            active: boolean;
            position: number;
          }>;
        }
      >('session:loadTabs', {}),
    addHistory: (payload: { url: string; title: string; typed?: boolean }) =>
      ipcCall<typeof payload, { success: boolean }>('session:addHistory', payload),
    getHistory: (payload: { limit?: number }) =>
      ipcCall<
        typeof payload,
        {
          history: Array<{
            id: string;
            url: string;
            title: string;
            visitCount: number;
            lastVisitAt: number;
          }>;
        }
      >('session:getHistory', payload),
    searchHistory: (payload: { query: string; limit?: number }) =>
      ipcCall<typeof payload, { results: Array<{ id: string; url: string; title: string }> }>(
        'session:searchHistory',
        payload
      ),
    saveSetting: (payload: { key: string; value: unknown }) =>
      ipcCall<typeof payload, { success: boolean }>('session:saveSetting', payload),
    getSetting: (payload: { key: string }) =>
      ipcCall<{ key: string }, { value: unknown }>('session:getSetting', payload),
    checkRestore: () =>
      ipcCall<
        unknown,
        {
          available: boolean;
          snapshot?: {
            tabCount: number;
            mode: string;
            timestamp: number;
            activeTabId: string | null;
          };
        }
      >('session:checkRestore', {}),
    getSnapshot: () =>
      ipcCall<
        unknown,
        {
          version: number;
          tabs: Array<{
            id: string;
            url: string;
            title: string;
            active: boolean;
            mode?: string;
            containerId?: string;
          }>;
          mode: string;
          activeTabId: string | null;
          chromeOffsets?: { top: number; bottom: number; left: number; right: number };
          rightDockPx?: number;
          timestamp: number;
        } | null
      >('session:getSnapshot', {}),
    dismissRestore: () => ipcCall<unknown, { success: boolean }>('session:dismissRestore', {}),
  },
  researchStream: {
    start: async (question: string, mode?: 'default' | 'threat' | 'trade') => {
      const payload = { question, ...(mode ? { mode } : {}) };
      const response = await ipcCall<
        { question: string; mode?: string },
        { jobId: string; channel: string }
      >('research:start', payload);
      return response;
    },
  },
  cloudVector: {
    config: (config: {
      provider: 'qdrant' | 'pinecone' | 'none';
      endpoint?: string;
      apiKey?: string;
      collection?: string;
      enabled: boolean;
    }) => ipcCall('cloud-vector:config', config),
    sync: (documentIds?: string[]) => ipcCall('cloud-vector:sync', { documentIds }),
    search: (query: string, topK?: number) => ipcCall('cloud-vector:search', { query, topK }),
    available: () => ipcCall<unknown, { available: boolean }>('cloud-vector:available', {}),
  },
  hybridSearch: {
    search: (query: string, maxResults?: number, language?: string) =>
      ipcCall('search:hybrid', { query, maxResults, language }),
    config: (config: {
      sources?: {
        brave?: { enabled: boolean; apiKey?: string };
        bing?: { enabled: boolean; apiKey?: string; endpoint?: string };
        custom?: { enabled: boolean };
      };
      maxResults?: number;
      rerank?: boolean;
    }) => ipcCall('search:config', config),
  },
  liveSearch: {
    start: (
      query: string,
      options?: { mode?: 'default' | 'threat' | 'trade'; region?: string; maxResults?: number }
    ) =>
      ipcCall<
        {
          query: string;
          mode?: 'default' | 'threat' | 'trade';
          region?: string;
          maxResults?: number;
        },
        { jobId: string; channel: string }
      >('search:live:start', { query, ...options }),
  },
  graph: {
    tabs: () =>
      ipcCall<
        unknown,
        {
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
          edges: Array<{
            id: string;
            source: string;
            target: string;
            weight: number;
            reasons: string[];
          }>;
          summary: { totalTabs: number; activeTabs: number; domains: number; containers: number };
          updatedAt: number;
        }
      >('graph:tabs', {}),
    workflow: (options?: { maxSteps?: number }) =>
      ipcCall<
        { maxSteps?: number },
        {
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
        }
      >('graph:workflowWeaver', options ?? {}),
  },
  efficiency: {
    applyMode: (mode: 'normal' | 'battery-saver' | 'extreme') =>
      ipcCall<{ mode: 'normal' | 'battery-saver' | 'extreme' }, { success: boolean }>(
        'efficiency:applyMode',
        { mode }
      ),
    clearOverride: () => ipcCall<unknown, { success: boolean }>('efficiency:clearOverride', {}),
    hibernateInactiveTabs: () =>
      ipcCall<unknown, { success: boolean; count: number }>('efficiency:hibernate', {}),
    ecoImpact: (options?: { horizonMinutes?: number }) =>
      ipcCall<{ horizonMinutes?: number }, EcoImpactForecast>(
        'efficiency:ecoImpact',
        options ?? {}
      ),
  },
  browser: {
    launch: (url: string, headless?: boolean) =>
      ipcCall<
        { url: string; headless?: boolean },
        { success: boolean; title?: string; url?: string; screenshot?: string; error?: string }
      >('launch_browser', { url, headless }),
    regenLaunch: (url: string, mode: string) =>
      ipcCall<{ url: string; mode: string }, string>('regen_launch', { url, mode }),
    regenSession: (urls: string[]) =>
      ipcCall<
        { urls: string[] },
        Array<{
          success: boolean;
          title?: string;
          url?: string;
          screenshot?: string;
          error?: string;
        }>
      >('regen_session', { urls }),
    captureScreenshot: (url: string) =>
      ipcCall<{ url: string }, { success: boolean; screenshot?: string; error?: string }>(
        'capture_browser_screenshot',
        { url }
      ),
  },
  grammar: {
    correct: (text: string) => ipcCall<{ text: string }, string>('correct_text', { text }),
  },
  vision: {
    captureScreen: () => ipcCall<unknown, string>('capture_screen', {}),
    analyze: (prompt: string, screenshot?: string) =>
      ipcCall<{ prompt: string; screenshot?: string }, string>('ollama_vision', {
        prompt,
        screenshot,
      }),
  },
  trust: {
    list: () => ipcCall<unknown, { records: TrustSummary[] }>('trust:list', {}),
    get: (domain: string) =>
      ipcCall<{ domain: string }, { found: boolean; summary?: TrustSummary }>('trust:get', {
        domain,
      }),
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
    retry: (id: string) =>
      ipcCall<{ id: string }, { success: boolean; queued?: boolean }>('downloads:retry', { id }),
    getQueue: () =>
      ipcCall<unknown, { active: number; queued: number; maxConcurrent: number }>(
        'downloads:getQueue',
        {}
      ),
  },
  watchers: {
    list: () =>
      ipcCall<
        unknown,
        Array<{
          id: string;
          url: string;
          createdAt: number;
          intervalMinutes: number;
          lastCheckedAt?: number;
          lastHash?: string;
          lastChangeAt?: number;
          status: string;
          error?: string;
        }>
      >('watchers:list', {}),
    add: (request: { url: string; intervalMinutes?: number }) =>
      ipcCall<
        { url: string; intervalMinutes?: number },
        { id: string; url: string; createdAt: number; intervalMinutes: number; status: string }
      >('watchers:add', request),
    remove: (id: string) =>
      ipcCall<{ id: string }, { success: boolean }>('watchers:remove', { id }),
    trigger: (id: string) =>
      ipcCall<{ id: string }, { success: boolean; error?: string }>('watchers:trigger', { id }),
    updateInterval: (id: string, intervalMinutes: number) =>
      ipcCall<{ id: string; intervalMinutes: number }, { success: boolean; error?: string }>(
        'watchers:updateInterval',
        { id, intervalMinutes }
      ),
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
    deleteUrl: (url: string) =>
      ipcCall<{ url: string }, { success: boolean }>('history:deleteUrl', { url }),
  },
  storage: {
    saveWorkspace: (workspace: unknown) => ipcCall('storage:saveWorkspace', workspace),
    listWorkspaces: () => ipcCall<unknown, unknown[]>('storage:listWorkspaces', {}),
  },
  shields: {
    get: (url: string) => ipcCall('shields:get', { url }),
    set: (hostname: string, config: unknown) => ipcCall('shields:set', { hostname, config }),
    updateDefault: (config: unknown) => ipcCall('shields:updateDefault', config),
    list: () => ipcCall<unknown, unknown[]>('shields:list', {}),
    getStatus: () =>
      ipcCall<
        unknown,
        {
          adsBlocked: number;
          trackersBlocked: number;
          httpsUpgrades: number;
          cookies3p: 'block' | 'allow';
          webrtcBlocked: boolean;
          fingerprinting: boolean;
        }
      >('shields:getStatus', {}),
  },
  network: {
    get: () =>
      ipcCall<unknown, { quicEnabled: boolean; ipv6Enabled: boolean; ipv6LeakProtection: boolean }>(
        'network:get',
        {}
      ),
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
    recordPattern: (pattern: {
      url: string;
      domain: string;
      timeSpent: number;
      actions: string[];
      topics?: string[];
    }) => ipcCall('cognitive:recordPattern', pattern),
    getSuggestions: (request?: { currentUrl?: string; recentActions?: string[] }) =>
      ipcCall('cognitive:getSuggestions', request || {}),
    getPersona: () =>
      ipcCall<unknown, { interests: string[]; habits: string[]; patterns: string }>(
        'cognitive:getPersona',
        {}
      ),
    getGraph: () => ipcCall<unknown, { graph: any }>('cognitive:getGraph', {}),
    clear: () => ipcCall('cognitive:clear', {}),
  },
  workspaceV2: {
    save: (workspace: {
      id: string;
      name: string;
      tabs: any[];
      notes?: Record<string, string>;
      proxyProfileId?: string;
      mode?: string;
      layout?: any;
    }) => ipcCall('workspace-v2:save', workspace),
    load: (workspaceId: string) => ipcCall('workspace-v2:load', { workspaceId }),
    list: () => ipcCall<unknown, { workspaces: any[] }>('workspace-v2:list', {}),
    delete: (workspaceId: string) => ipcCall('workspace-v2:delete', { workspaceId }),
    updateNotes: (workspaceId: string, tabId: string, note: string) =>
      ipcCall('workspace-v2:updateNotes', { workspaceId, tabId, note }),
    getNotes: (workspaceId: string) =>
      ipcCall<unknown, { notes: Record<string, string> }>('workspace-v2:getNotes', { workspaceId }),
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
      ipcCall<
        unknown,
        { summary: { updatedAt: number; windowCount: number; tabCount: number } | null }
      >('session:lastSnapshotSummary', {}),
    restore: () =>
      ipcCall<unknown, { restored: boolean; tabCount?: number; error?: string }>(
        'session:restoreLast',
        {}
      ),
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
    execute: (commands: string[]) =>
      ipcCall<unknown, { actions: any[] }>('omniscript:execute', { commands }),
  },
  omniBrain: {
    addDocument: (document: { text: string; url?: string; metadata?: Record<string, unknown> }) =>
      ipcCall<unknown, { id: string }>('omni-brain:addDocument', document),
    search: (query: string, limit?: number) =>
      ipcCall<unknown, Array<{ document: any; similarity: number }>>('omni-brain:search', {
        query,
        limit: limit || 10,
      }),
    getDocument: (id: string) =>
      ipcCall<unknown, { document: any }>('omni-brain:getDocument', { id }),
    listDocuments: () => ipcCall<unknown, { documents: any[] }>('omni-brain:listDocuments', {}),
    deleteDocument: (id: string) => ipcCall('omni-brain:deleteDocument', { id }),
    clear: () => ipcCall('omni-brain:clear', {}),
  },
  spiritual: {
    focusMode: {
      enable: (config?: {
        ambientSound?: 'none' | 'nature' | 'rain' | 'ocean' | 'meditation';
        breathingOverlay?: boolean;
        timer?: number;
        notifications?: boolean;
      }) => ipcCall('spiritual:focusMode:enable', config || {}),
      disable: () => ipcCall('spiritual:focusMode:disable', {}),
      status: () =>
        ipcCall<unknown, { active: boolean; config: any }>('spiritual:focusMode:status', {}),
    },
    mood: {
      recordTyping: () => ipcCall('spiritual:mood:recordTyping', {}),
      get: () =>
        ipcCall<unknown, { mood: string; confidence: number; detectedAt: number; colors: any }>(
          'spiritual:mood:get',
          {}
        ),
      reset: () => ipcCall('spiritual:mood:reset', {}),
    },
    balance: {
      start: (intervals?: {
        rest?: number;
        stretch?: number;
        hydrate?: number;
        eyeBreak?: number;
      }) => ipcCall('spiritual:balance:start', intervals || {}),
      stop: () => ipcCall('spiritual:balance:stop', {}),
    },
  },
  pluginMarketplace: {
    list: () => ipcCall<unknown, { plugins: any[] }>('plugin-marketplace:list', {}),
    install: (pluginId: string, verifySignature?: boolean) =>
      ipcCall('plugin-marketplace:install', { pluginId, verifySignature: verifySignature ?? true }),
    uninstall: (pluginId: string) => ipcCall('plugin-marketplace:uninstall', { pluginId }),
    installed: () => ipcCall<unknown, { plugins: string[] }>('plugin-marketplace:installed', {}),
    isInstalled: (pluginId: string) =>
      ipcCall<unknown, { installed: boolean }>('plugin-marketplace:isInstalled', { pluginId }),
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
      ipcCall<{ pluginId: string; trusted: boolean }, { plugin: NexusPluginEntry | null }>(
        'plugins:nexus:trust',
        {
          pluginId,
          trusted,
        }
      ),
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
    getMetrics: () =>
      ipcCall<
        unknown,
        {
          cpu: number;
          memory: number;
          cpuLoad1: number;
          ramMb: number;
          activeTabs: number;
          timestamp: number;
        }
      >('performance:getMetrics', {}),
    gpu: {
      enableRaster: () =>
        ipcCall<unknown, { success: boolean; config: any }>('performance:gpu:enableRaster', {}),
      disableRaster: () =>
        ipcCall<unknown, { success: boolean; config: any }>('performance:gpu:disableRaster', {}),
      enableHardwareDecode: () =>
        ipcCall<unknown, { success: boolean; config: any }>(
          'performance:gpu:enableHardwareDecode',
          {}
        ),
      disableHardwareDecode: () =>
        ipcCall<unknown, { success: boolean; config: any }>(
          'performance:gpu:disableHardwareDecode',
          {}
        ),
      getConfig: () => ipcCall<unknown, { config: any }>('performance:gpu:getConfig', {}),
    },
    snapshot: {
      create: (snapshot: { windows: any[]; workspace?: string }) =>
        ipcCall<unknown, { snapshotId: string }>('performance:snapshot:create', snapshot),
      restore: (snapshotId: string) =>
        ipcCall<unknown, { snapshot: any }>('performance:snapshot:restore', { snapshotId }),
      latest: () => ipcCall<unknown, { snapshot: any }>('performance:snapshot:latest', {}),
      list: () => ipcCall<unknown, { snapshots: any[] }>('performance:snapshot:list', {}),
    },
  },
  workers: {
    scraping: {
      run: (task: { id: string; urls: string[]; selectors?: string[]; pagination?: any }) =>
        ipcCall<unknown, { taskId: string; results: any[]; completed: number; total: number }>(
          'workers:scraping:run',
          task
        ),
    },
  },
  videoCall: {
    getConfig: () =>
      ipcCall<
        unknown,
        {
          enabled: boolean;
          adaptiveQuality: boolean;
          maxResolution: string;
          maxFrameRate: number;
          bandwidthEstimate: number;
          priorityMode: string;
        }
      >('videoCall:getConfig', {}),
    updateConfig: (config: {
      enabled?: boolean;
      adaptiveQuality?: boolean;
      maxResolution?: '720p' | '480p' | '360p' | '240p';
      maxFrameRate?: number;
      bandwidthEstimate?: number;
      priorityMode?: 'performance' | 'balanced' | 'quality';
    }) => ipcCall('videoCall:updateConfig', config),
    getNetworkQuality: () =>
      ipcCall<unknown, { bandwidth: number; latency: number; packetLoss: number; quality: string }>(
        'videoCall:getNetworkQuality',
        {}
      ),
    updateNetworkQuality: (quality: { bandwidth: number; latency?: number; packetLoss?: number }) =>
      ipcCall('videoCall:updateNetworkQuality', quality),
  },
  sessions: {
    create: (request: { name: string; profileId?: string; color?: string }) =>
      ipcCall<
        { name: string; profileId?: string; color?: string },
        {
          id: string;
          name: string;
          profileId: string;
          createdAt: number;
          tabCount: number;
          color?: string;
        }
      >('sessions:create', request),
    list: () =>
      ipcCall<
        unknown,
        Array<{
          id: string;
          name: string;
          profileId: string;
          createdAt: number;
          tabCount: number;
          color?: string;
        }>
      >('sessions:list', {}),
    getActive: () =>
      ipcCall<
        unknown,
        {
          id: string;
          name: string;
          profileId: string;
          createdAt: number;
          tabCount: number;
          color?: string;
        } | null
      >('sessions:getActive', {}),
    setActive: (request: { sessionId: string }) => ipcCall('sessions:setActive', request),
    get: (request: { sessionId: string }) =>
      ipcCall<
        { sessionId: string },
        {
          id: string;
          name: string;
          profileId: string;
          createdAt: number;
          tabCount: number;
          color?: string;
        }
      >('sessions:get', request),
    delete: (request: { sessionId: string }) => ipcCall('sessions:delete', request),
    update: (request: { sessionId: string; name?: string; color?: string }) =>
      ipcCall('sessions:update', request),
    getPartition: (request: { sessionId: string }) =>
      ipcCall<{ sessionId: string }, { partition: string }>('sessions:getPartition', request),
  },
  private: {
    createWindow: (options?: {
      url?: string;
      autoCloseAfter?: number;
      contentProtection?: boolean;
      ghostMode?: boolean;
    }) =>
      ipcCall<
        { url?: string; autoCloseAfter?: number; contentProtection?: boolean; ghostMode?: boolean },
        { windowId: number }
      >('private:createWindow', options || {}),
    createGhostTab: (options?: { url?: string }) =>
      ipcCall<{ url?: string }, { tabId: string }>('private:createGhostTab', options || {}),
    closeAll: () => ipcCall<unknown, { count: number }>('private:closeAll', {}),
    panicWipe: (options?: { forensic?: boolean }) =>
      ipcCall<{ forensic?: boolean }, { success: boolean }>('private:panicWipe', options || {}),
  },
  crossReality: {
    handoff: (tabId: string, target: 'mobile' | 'xr') =>
      ipcCall<{ tabId: string; target: 'mobile' | 'xr' }, { success: boolean; handoff: any }>(
        'cross-reality:handoff',
        {
          tabId,
          target,
        }
      ),
    queue: () => ipcCall<unknown, { handoffs: any[] }>('cross-reality:queue', {}),
    sendHandoffStatus: (status: { platform: string; lastSentAt: number | null }) =>
      ipcCall<{ platform: string; lastSentAt: number | null }, { success: boolean }>(
        'cross-reality:handoffStatus',
        status
      ).catch(error => {
        if (IS_DEV) {
          console.warn('[IPC] Failed to send handoff status:', error);
        }
        return { success: false };
      }),
  },
  identity: {
    status: () => ipcCall<unknown, IdentityVaultSummary>('identity:status', {}),
    unlock: (passphrase: string) =>
      ipcCall<{ passphrase: string }, IdentityVaultSummary>('identity:unlock', { passphrase }),
    lock: () => ipcCall<unknown, IdentityVaultSummary>('identity:lock', {}),
    list: () => ipcCall<unknown, IdentityCredential[]>('identity:list', {}),
    add: (payload: {
      domain: string;
      username: string;
      secret: string;
      secretHint?: string | null;
      tags?: string[];
    }) => ipcCall<typeof payload, IdentityCredential>('identity:add', payload),
    remove: (id: string) =>
      ipcCall<{ id: string }, { success: boolean }>('identity:remove', { id }),
    reveal: (id: string) =>
      ipcCall<{ id: string }, IdentityRevealPayload>('identity:reveal', { id }),
  },
  consent: {
    createRequest: (action: ConsentAction) =>
      ipcCall<ConsentAction, { consentId: string }>('consent:createRequest', action),
    approve: (consentId: string) =>
      ipcCall<
        { consentId: string },
        {
          success: boolean;
          consent?: ConsentRecord | null;
          receipt?: { receiptId: string; proof: string };
        }
      >('consent:approve', { consentId }),
    revoke: (consentId: string) =>
      ipcCall<{ consentId: string }, { success: boolean }>('consent:revoke', { consentId }),
    check: (action: ConsentAction) =>
      ipcCall<ConsentAction, { hasConsent: boolean }>('consent:check', action),
    get: (consentId: string) =>
      ipcCall<{ consentId: string }, ConsentRecord | undefined>('consent:get', { consentId }),
    list: (filter?: { type?: ConsentAction['type']; approved?: boolean }) =>
      ipcCall<typeof filter, ConsentRecord[]>('consent:list', filter ?? {}),
    export: () => ipcCall<unknown, string>('consent:export', {}),
    vault: {
      export: () => ipcCall<unknown, ConsentVaultSnapshot>('consent:vault:export', {}),
    },
  },
  research: {
    queryEnhanced: (payload: {
      query: string;
      maxSources?: number;
      includeCounterpoints?: boolean;
      recencyWeight?: number;
      authorityWeight?: number;
      language?: string;
    }) => ipcCall<typeof payload, any>('research:queryEnhanced', payload),
    extractContent: (tabId?: string) =>
      ipcCall<{ tabId?: string }, { content: string; title: string; html: string }>(
        'research:extractContent',
        tabId ? { tabId } : {}
      ),
    saveNotes: (url: string, notes: string, highlights?: unknown[]) =>
      ipcCall<{ url: string; notes: string; highlights?: unknown[] }, { success: boolean }>(
        'research:saveNotes',
        {
          url,
          notes,
          highlights,
        }
      ),
    getNotes: (url: string) =>
      ipcCall<{ url: string }, { notes: string; highlights: unknown[] }>('research:getNotes', {
        url,
      }),
    export: (payload: {
      format: 'markdown' | 'obsidian' | 'notion';
      sources: string[];
      includeNotes?: boolean;
    }) => ipcCall<typeof payload, any>('research:export', payload),
    saveSnapshot: (tabId: string) =>
      ipcCall<{ tabId: string }, { snapshotId: string; url: string }>('research:saveSnapshot', {
        tabId,
      }),
    uploadFile: (file: File) => {
      // Convert File to base64 for IPC
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          const result = await ipcCall<
            {
              filename: string;
              content: string;
              mimeType: string;
              size: number;
            },
            { fileId: string }
          >('research:uploadFile', {
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
      ipcCall<
        unknown,
        {
          documents: Array<{
            id: string;
            type: string;
            title: string;
            uploadedAt: number;
            chunkCount: number;
          }>;
        }
      >('research:listDocuments', {}),
    getDocumentChunks: (documentId: string) =>
      ipcCall<
        { documentId: string },
        { chunks: Array<{ id: string; content: string; metadata: any }> }
      >('research:getDocumentChunks', { documentId }),
    capturePage: (tabId?: string) =>
      ipcCall<
        { tabId?: string },
        {
          snapshotId: string;
          url: string;
          title: string;
          dimensions: { width: number; height: number };
        }
      >('research:capturePage', tabId ? { tabId } : {}),
    captureSelection: (text?: string, tabId?: string) =>
      ipcCall<{ tabId?: string; text?: string }, { clipId: string; url: string; text: string }>(
        'research:captureSelection',
        { tabId, text }
      ),
  },
  reader: {
    summarize: (payload: { url?: string; title?: string; content: string; html?: string }) =>
      ipcCall<typeof payload, any>('reader:summarize', payload),
    export: (payload: { url?: string; title?: string; html: string }) =>
      ipcCall<typeof payload, { success: boolean; path: string }>('reader:export', payload),
  },
  trade: {
    execute: (query: string) =>
      ipcCall<{ query: string }, string>('execute_trade_command', { query }),
    // TradingView API Integration
    tradingviewAuthorize: (login: string, password: string) =>
      ipcCall<
        { login: string; password: string },
        { s: string; d: { access_token: string; expiration: number } }
      >('tradingview_authorize', { login, password }),
    tradingviewQuotes: (accountId: string, symbols: string) =>
      ipcCall<{ accountId: string; symbols: string }, { s: string; d: Array<any> }>(
        'tradingview_quotes',
        { accountId, symbols }
      ),
    tradingviewPlaceOrder: (params: {
      accountId: string;
      instrument: string;
      qty: number;
      side: 'buy' | 'sell';
      orderType: 'market' | 'limit' | 'stop' | 'stoplimit';
      limitPrice?: number;
      stopPrice?: number;
      currentAsk: number;
      currentBid: number;
      stopLoss?: number;
      takeProfit?: number;
    }) =>
      ipcCall<typeof params, { s: string; d: { orderId: string; transactionId?: string } }>(
        'tradingview_place_order',
        params
      ),
    tradingviewGetPositions: (accountId: string) =>
      ipcCall<{ accountId: string }, { s: string; d: Array<any> }>('tradingview_get_positions', {
        accountId,
      }),
    tradingviewGetAccountState: (accountId: string) =>
      ipcCall<
        { accountId: string },
        { s: string; d: { balance: number; unrealizedPl: number; equity: number } }
      >('tradingview_get_account_state', { accountId }),
    placeOrder: (order: {
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
      orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
      limitPrice?: number;
      stopPrice?: number;
      timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
      bracket?: {
        stopLoss: number;
        takeProfit: number;
        stopLossType?: 'price' | 'percent' | 'atr';
        takeProfitType?: 'price' | 'percent' | 'atr';
      };
      trailingStop?: {
        distance: number;
        distanceType: 'price' | 'percent' | 'atr';
        activationPrice?: number;
      };
      paper?: boolean;
      aiSignalId?: string;
    }) => ipcCall<typeof order, { orderId: string }>('trade:placeOrder', order),
    cancelOrder: (orderId: string) =>
      ipcCall<{ orderId: string }, { success: boolean }>('trade:cancelOrder', { orderId }),
    getOrders: (status?: string) =>
      ipcCall<
        { status?: string },
        {
          orders: Array<{
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
          }>;
        }
      >('trade:getOrders', status ? { status } : {}),
    getPositions: () =>
      ipcCall<
        unknown,
        {
          positions: Array<{
            id: string;
            symbol: string;
            quantity: number;
            averageEntryPrice: number;
            currentPrice: number;
            unrealizedPnL: number;
            realizedPnL: number;
            entryOrderId: string;
            paper: boolean;
          }>;
        }
      >('trade:getPositions', {}),
    closePosition: (symbol: string, quantity?: number) =>
      ipcCall<
        { symbol: string; quantity?: number },
        { success: boolean; orderId?: string; error?: string }
      >('trade:closePosition', { symbol, quantity }),
    getBalance: () =>
      ipcCall<unknown, { cash: number; buyingPower: number; portfolioValue: number }>(
        'trade:getBalance',
        {}
      ),
    connectBroker: (config: {
      brokerId: string;
      apiKey: string;
      apiSecret: string;
      paper: boolean;
    }) => ipcCall<typeof config, { success: boolean }>('trade:connectBroker', config),
    getQuote: (symbol: string) =>
      ipcCall<
        { symbol: string },
        {
          symbol: string;
          bid: number;
          ask: number;
          last: number;
          volume: number;
          timestamp: number;
        }
      >('trade:getQuote', { symbol }),
    getCandles: (params: { symbol: string; timeframe: string; from: number; to: number }) =>
      ipcCall<
        typeof params,
        {
          candles: Array<{
            time: number;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
          }>;
        }
      >('trade:getCandles', params),
  },
  dns: {
    status: () =>
      ipcCall<unknown, { enabled: boolean; provider: 'cloudflare' | 'quad9' }>('dns:status', {}),
    enableDoH: (provider: 'cloudflare' | 'quad9' = 'cloudflare') =>
      ipcCall<{ provider: 'cloudflare' | 'quad9' }>('dns:enableDoH', { provider }),
    disableDoH: () => ipcCall('dns:disableDoH', {}),
  },
  privacy: {
    sentinel: {
      audit: (tabId?: string | null) =>
        ipcCall<{ tabId?: string | null } | undefined, PrivacyAuditSummary>(
          'privacy:sentinel:audit',
          tabId ? { tabId } : {}
        ),
    },
    getStats: () =>
      ipcCall<
        unknown,
        {
          trackersBlocked: number;
          adsBlocked: number;
          cookiesBlocked: number;
          scriptsBlocked: number;
          httpsUpgrades: number;
          fingerprintingEnabled: boolean;
          webrtcBlocked: boolean;
          totalCookies: number;
          totalOrigins: number;
          privacyScore: number;
        }
      >('privacy:getStats', {}),
    getTrackers: (limit?: number) =>
      ipcCall<
        { limit?: number },
        Array<{
          domain: string;
          category: string;
          count: number;
          blocked: boolean;
          lastSeen: number;
        }>
      >('privacy:getTrackers', { limit: limit || 50 }),
    exportReport: (format?: 'json' | 'csv') =>
      ipcCall<
        { format?: 'json' | 'csv' },
        {
          stats: any;
          trackers: any[];
          origins: any[];
          timestamp: number;
          exportFormat: 'json' | 'csv';
        }
      >('privacy:exportReport', { format: format || 'json' }),
  },
  redix: {
    ask: (prompt: string, options?: { sessionId?: string; stream?: boolean }) =>
      ipcCall<
        { prompt: string; sessionId?: string; stream?: boolean },
        {
          success: boolean;
          response?: string;
          tokens?: number;
          cached?: boolean;
          ready?: boolean;
          error?: string;
          streaming?: boolean;
        }
      >('redix:ask', { prompt, ...options }),
    status: () =>
      ipcCall<
        unknown,
        { success: boolean; ready: boolean; backend: string; message: string; error?: string }
      >('redix:status', {}),
    stream: (
      prompt: string,
      options?: { sessionId?: string },
      onChunk?: (chunk: {
        type: string;
        text?: string;
        tokens?: number;
        done?: boolean;
        error?: string;
      }) => void
    ) => {
      // For streaming, we'll use events
      let handler: ((_event: any, data: any) => void) | null = null;

      if (onChunk && typeof window !== 'undefined' && window.ipc) {
        handler = (
          _event: any,
          data: { type: string; text?: string; tokens?: number; done?: boolean; error?: string }
        ) => {
          try {
            onChunk(data);
            if (data.done || data.error) {
              if (handler && window.ipc?.removeListener) {
                window.ipc.removeListener('redix:chunk', handler);
              }
              handler = null;
            }
          } catch (error) {
            console.error('[Redix] Error in stream handler:', error);
            if (handler && window.ipc?.removeListener) {
              window.ipc.removeListener('redix:chunk', handler);
            }
            handler = null;
          }
        };

        try {
          window.ipc.on?.('redix:chunk', handler);
        } catch (error) {
          console.error('[Redix] Failed to register stream handler:', error);
        }
      }

      return ipcCall<
        { prompt: string; sessionId?: string; stream: boolean },
        { success: boolean; error?: string }
      >('redix:stream', { prompt, stream: true, ...options }).catch(error => {
        // Clean up handler on error
        if (handler && typeof window !== 'undefined' && window.ipc?.removeListener) {
          window.ipc.removeListener('redix:chunk', handler);
        }
        throw error;
      });
    },
  },
  system: {
    getStatus: () =>
      ipcCall<
        unknown,
        {
          redisConnected: boolean;
          redixAvailable: boolean;
          workerState: 'running' | 'stopped' | 'error';
          vpn: { connected: boolean; profile?: string; type?: string };
          tor: { running: boolean; bootstrapped: boolean };
          mode: string;
          uptime: number;
          memoryUsage: {
            heapUsed: number;
            heapTotal: number;
            external: number;
            rss: number;
          };
        }
      >('system:getStatus', {}),
  },
  gpu: {
    getStatus: () => ipcCall<unknown, { enabled: boolean }>('gpu:getStatus', {}),
    setEnabled: (payload: { enabled: boolean }) =>
      ipcCall<typeof payload, { success: boolean; enabled: boolean; requiresRestart: boolean }>(
        'gpu:setEnabled',
        payload
      ),
  },
  features: {
    list: () =>
      ipcCall<
        unknown,
        {
          flags: Array<{
            name: string;
            enabled: boolean;
            description?: string;
          }>;
        }
      >('features:list', {}),
    get: (payload: { name: string }) =>
      ipcCall<typeof payload, { enabled: boolean }>('features:get', payload),
    set: (payload: { name: string; enabled: boolean }) =>
      ipcCall<typeof payload, { success: boolean }>('features:set', payload),
  },
  regen: {
    query: (payload: {
      sessionId: string;
      message: string;
      mode?: 'research' | 'trade' | 'browser' | 'automation' | 'handsFree';
      source?: 'text' | 'voice';
      tabId?: string;
      context?: { url?: string; title?: string; dom?: string };
    }) =>
      ipcCall<
        typeof payload,
        {
          intent: string;
          text: string;
          commands?: Array<{ type: string; payload: Record<string, unknown> }>;
          metadata?: Record<string, unknown>;
        }
      >('regen:query', payload),
    getDom: (payload: { tabId: string }) =>
      ipcCall<typeof payload, { success: boolean; data?: unknown; error?: string }>(
        'regen:getDom',
        payload
      ),
    clickElement: (payload: { tabId: string; selector: string }) =>
      ipcCall<typeof payload, { success: boolean; data?: unknown; error?: string }>(
        'regen:clickElement',
        payload
      ),
    scroll: (payload: { tabId: string; amount: number }) =>
      ipcCall<typeof payload, { success: boolean; data?: unknown; error?: string }>(
        'regen:scroll',
        payload
      ),
    openTab: (payload: { url: string; background?: boolean }) =>
      ipcCall<typeof payload, { success: boolean; data?: unknown; error?: string }>(
        'regen:openTab',
        payload
      ),
    typeIntoElement: (payload: { tabId: string; selector: string; text: string }) =>
      ipcCall<typeof payload, { success: boolean; data?: unknown; error?: string }>(
        'regen:typeIntoElement',
        payload
      ),
    goBack: (payload: { tabId: string }) =>
      ipcCall<typeof payload, { success: boolean; data?: unknown; error?: string }>(
        'regen:goBack',
        payload
      ),
    goForward: (payload: { tabId: string }) =>
      ipcCall<typeof payload, { success: boolean; data?: unknown; error?: string }>(
        'regen:goForward',
        payload
      ),
    switchTab: (payload: { index?: number; id?: string }) =>
      ipcCall<typeof payload, { success: boolean; data?: unknown; error?: string }>(
        'regen:switchTab',
        payload
      ),
    closeTab: (payload: { tabId: string }) =>
      ipcCall<typeof payload, { success: boolean; data?: unknown; error?: string }>(
        'regen:closeTab',
        payload
      ),
    readPage: (payload: { tabId: string }) =>
      ipcCall<typeof payload, { success: boolean; data?: unknown; error?: string }>(
        'regen:readPage',
        payload
      ),
    tradeConfirm: (payload: {
      orderId?: string;
      confirmed: boolean;
      pendingOrder: {
        type: 'buy' | 'sell';
        symbol: string;
        quantity: number;
        orderType?: 'market' | 'limit';
        price?: number;
      };
    }) =>
      ipcCall<
        typeof payload,
        {
          success: boolean;
          orderId?: string;
          cancelled?: boolean;
          message?: string;
          error?: string;
        }
      >('regen:trade:confirm', payload),
  },
  // Event system for real-time updates
  events: ipcEvents,
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
