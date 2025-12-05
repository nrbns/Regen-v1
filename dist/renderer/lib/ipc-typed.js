/**
 * Typed IPC Client for Renderer
 * Provides type-safe IPC calls with automatic error handling
 */
import { isDevEnv, isElectronRuntime, isTauriRuntime } from './env';
import apiClient from './api-client';
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
    kind: 'default',
    color: '#3b82f6',
    system: true,
    policy: { ...DEFAULT_PROFILE_POLICY },
    description: 'Fallback profile (IPC unavailable)',
});
const FALLBACK_CHANNELS = {
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
    'tabs:create': (req) => {
        const payload = typeof req === 'object' && req ? req : {};
        const tabsState = getTabsStore();
        const previousActiveId = tabsState?.activeId;
        const tabId = (typeof payload.tabId === 'string' && payload.tabId.trim().length > 0
            ? payload.tabId
            : undefined) ?? `tab-${Date.now()}`;
        const url = typeof payload.url === 'string' && payload.url.trim().length > 0
            ? payload.url
            : 'about:blank';
        const title = typeof payload.title === 'string' && payload.title.trim().length > 0
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
        }
        catch {
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
        }
        catch {
            // ignore
        }
        return null;
    },
    'tabs:close': (req) => {
        try {
            if (req?.id) {
                const state = useTabsStore.getState?.();
                state?.remove?.(req.id);
            }
        }
        catch {
            // ignore
        }
        return { success: true };
    },
    'tabs:activate': (req) => {
        try {
            if (req?.id) {
                const state = useTabsStore.getState?.();
                state?.setActive?.(req.id);
            }
        }
        catch {
            // ignore
        }
        return { success: true };
    },
    'tabs:navigate': (req) => {
        try {
            if (req?.id && req?.url) {
                const state = useTabsStore.getState?.();
                if (state?.navigateTab) {
                    state.navigateTab(req.id, req.url);
                }
                else {
                    state?.updateTab?.(req.id, { url: req.url, title: deriveTitleFromUrl(req.url) });
                }
            }
        }
        catch {
            // ignore
        }
        return { success: true };
    },
    'tabs:goBack': (req) => {
        try {
            if (req?.id) {
                const state = useTabsStore.getState?.();
                state?.goBack?.(req.id);
            }
        }
        catch {
            // ignore
        }
        return { success: true };
    },
    'tabs:goForward': (req) => {
        try {
            if (req?.id) {
                const state = useTabsStore.getState?.();
                state?.goForward?.(req.id);
            }
        }
        catch {
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
        }
        catch {
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
        }
        catch {
            // ignore
        }
        return null;
    },
    'identity:status': () => ({ status: 'locked', totalCredentials: 0, lastUpdatedAt: null }),
    'identity:unlock': () => ({ status: 'locked', totalCredentials: 0, lastUpdatedAt: null }),
    'identity:lock': () => ({ status: 'locked', totalCredentials: 0, lastUpdatedAt: null }),
    'identity:list': () => [],
    'identity:add': () => ({
        id: 'demo',
        domain: 'example.com',
        username: 'demo',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }),
    'identity:remove': () => ({ success: false }),
    'identity:reveal': () => ({ id: 'demo', secret: 'demo' }),
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
    'research:queryEnhanced': (payload) => {
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
const reportedMissingChannels = new Set();
function getTabsStore() {
    try {
        return typeof useTabsStore.getState === 'function' ? useTabsStore.getState() : undefined;
    }
    catch {
        return undefined;
    }
}
export function deriveTitleFromUrl(url) {
    if (!url || url === 'about:blank') {
        return 'New Tab';
    }
    try {
        const parsed = new URL(url);
        return parsed.hostname || url;
    }
    catch {
        return url;
    }
}
function getFallback(channel, request) {
    const factory = FALLBACK_CHANNELS[channel];
    if (!factory)
        return undefined;
    return factory(request);
}
function noteFallback(channel, reason) {
    if (!IS_DEV)
        return;
    if (reportedMissingChannels.has(channel))
        return;
    // Don't warn about missing channels in web mode - they're expected
    // Only warn if we're in a runtime that should have IPC (Electron/Tauri)
    const expectsIPC = isElectronRuntime() || isTauriRuntime();
    if (!expectsIPC)
        return; // Silent in web mode
    reportedMissingChannels.add(channel);
    console.warn(`[IPC] Channel ${channel} unavailable (${reason}); using renderer fallback.`);
}
async function mapIpcToHttp(channel, request, schema) {
    const normalized = channel.replace('ob://ipc/v1/', '');
    const handlers = {
        'tabs:list': () => apiClient.tabs.list(),
        'tabs:create': async (req) => {
            if (typeof req === 'string') {
                return apiClient.tabs.create({ url: req });
            }
            if (req && typeof req === 'object') {
                const payload = 'url' in req ? req : { url: 'about:blank' };
                return apiClient.tabs.create(payload);
            }
            return apiClient.tabs.create({ url: 'about:blank' });
        },
        'tabs:close': (req) => apiClient.tabs.close(req.id),
        'tabs:activate': (req) => apiClient.tabs.activate(req.id),
        'tabs:navigate': (req) => apiClient.tabs.navigate(req),
        'tabs:goBack': (req) => apiClient.tabs.goBack(req.id),
        'tabs:goForward': (req) => apiClient.tabs.goForward(req.id),
        'tabs:reload': (req) => apiClient.tabs.reload(req.id, req),
        'tabs:stop': (req) => apiClient.tabs.stop(req.id),
        'tabs:overlay/start': () => apiClient.tabs.overlayStart(),
        'tabs:overlay/pick': () => apiClient.tabs.overlayGetPick(),
        'tabs:overlay/clear': () => apiClient.tabs.overlayClear(),
        'sessions:list': () => apiClient.sessions.list(),
        'sessions:create': (req) => apiClient.sessions.create(req),
        'sessions:getActive': () => apiClient.sessions.getActive(),
        'session:checkRestore': () => apiClient.session.checkRestore(),
        'session:getSnapshot': () => apiClient.session.getSnapshot(),
        'session:dismissRestore': () => apiClient.session.dismissRestore(),
        'system:getStatus': () => apiClient.system.getStatus(),
        'agent:ask': (req) => apiClient.agent.ask(req),
        'telemetry:getStatus': () => apiClient.system.getStatus(),
        'research:queryEnhanced': (req) => apiClient.research.queryEnhanced(req),
        'search:hybrid': async (req) => {
            const response = await fetch(`${apiClient.API_BASE_URL || 'http://localhost:3000'}/api/search/hybrid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: req.query,
                    lang: req.language || 'auto',
                    maxResults: req.maxResults || 6,
                }),
            });
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            return response.json();
        },
    };
    const handler = handlers[normalized];
    if (!handler) {
        // In web mode, suppress errors for missing mappings - they're expected
        const isWeb = typeof window !== 'undefined' && !window.__ELECTRON__ && !window.__TAURI__;
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
    return response;
}
// Track IPC readiness
let ipcReady = false;
let ipcReadyResolvers = [];
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
        }
        else {
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
        }
        else if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            // Only warn in Electron/Tauri mode - silent in web mode
            const expectsIPC = isElectronRuntime() || isTauriRuntime();
            if (IS_DEV && expectsIPC) {
                console.warn('[IPC] window.ipc never appeared after polling');
                console.warn('[IPC] Available window properties:', Object.keys(window).filter(k => k.includes('ipc') || k.includes('api') || k.includes('electron')));
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
async function waitForIPC(timeout = 10000) {
    // In web mode, skip IPC wait entirely - resolve immediately with false
    // This prevents timeout warnings in web mode where IPC is not available
    if (!isElectronRuntime() && !isTauriRuntime()) {
        return Promise.resolve(false);
    }
    // If already ready, return immediately
    if (ipcReady &&
        typeof window !== 'undefined' &&
        window.ipc &&
        typeof window.ipc.invoke === 'function') {
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
            const hasIpc = typeof window !== 'undefined' && window.ipc && typeof window.ipc.invoke === 'function';
            if (ipcReady && hasIpc) {
                clearInterval(checkInterval);
                clearTimeout(timeoutId);
                ipcReadyResolvers = ipcReadyResolvers.filter(r => r !== resolver);
                resolve(true);
            }
            else if (hasIpc && !ipcReady) {
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
            }
            else if (Date.now() - startTime > timeout) {
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
export async function ipcCall(channel, request, schema) {
    const fullChannel = `ob://ipc/v1/${channel}`;
    // Check if we're in Electron - be lenient, check multiple indicators
    const hasUserAgent = typeof navigator !== 'undefined' && navigator.userAgent;
    const userAgent = hasUserAgent ? navigator.userAgent : '';
    const userAgentHasElectron = userAgent.includes('Electron');
    const hasElectronRuntime = isElectronRuntime();
    // Check for window.ipc OR window.api (legacy API) - both indicate Electron
    const hasWindowIpc = typeof window !== 'undefined' &&
        ((window.ipc && typeof window.ipc.invoke === 'function') ||
            (window.api && typeof window.api.ping === 'function'));
    // Check if we're in a regular web browser (Chrome, Firefox, Safari, Edge)
    // But exclude Electron's Chrome user agent
    const isRegularBrowser = (userAgent.includes('Chrome') && !userAgent.includes('Electron')) ||
        userAgent.includes('Firefox') ||
        (userAgent.includes('Safari') && !userAgent.includes('Chrome')) ||
        userAgent.includes('Edg');
    // If we have window.ipc or window.api, we're definitely in Electron (even if other checks fail)
    // Also, if we're NOT in a regular browser, assume Electron (more aggressive detection)
    const isElectron = hasElectronRuntime || userAgentHasElectron || hasWindowIpc || !isRegularBrowser;
    // Wait for IPC to be ready (with longer timeout for first call)
    const isReady = await waitForIPC(8000);
    // Check if IPC bridge is actually available
    // Migration: Use HTTP API client if not in Electron runtime
    if (!isElectron) {
        // Map IPC channels to HTTP API calls
        try {
            return await mapIpcToHttp(fullChannel, request, schema);
        }
        catch (error) {
            // Fallback to default fallback if HTTP call fails
            const normalized = fullChannel.replace('ob://ipc/v1/', '');
            const fallback = getFallback(normalized, request);
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
        if (typeof window !== 'undefined' && window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                if (ipcRenderer && typeof ipcRenderer.invoke === 'function') {
                    // Create a temporary bridge
                    ipcBridge = {
                        invoke: async (ch, req) => {
                            const response = await ipcRenderer.invoke(ch, req);
                            if (response && typeof response === 'object' && 'ok' in response) {
                                if (!response.ok) {
                                    throw new Error(response.error || 'IPC call failed');
                                }
                                return response.data;
                            }
                            return response;
                        },
                        on: () => { },
                        removeListener: () => { },
                    };
                }
            }
            catch {
                // context isolation prevents direct access, that's expected
            }
        }
    }
    if (!isReady || !ipcBridge || typeof ipcBridge.invoke !== 'function') {
        // Always try fallback first if available, regardless of Electron detection
        const fallback = getFallback(channel, request);
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
        return response;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('No handler registered')) {
            const fallback = getFallback(channel, request);
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
    windowControl: {
        toggleFullscreen: (force) => ipcCall('app:toggleFullscreen', {
            fullscreen: force,
        }).catch(error => {
            if (IS_DEV) {
                console.warn('[IPC] Failed to toggle fullscreen:', error);
            }
            return { success: false, fullscreen: false };
        }),
        setFullscreen: (fullscreen) => ipcCall('app:setFullscreen', { fullscreen }).catch(error => {
            if (IS_DEV) {
                console.warn('[IPC] Failed to set fullscreen:', error);
            }
            return { success: false, fullscreen };
        }),
        getState: () => ipcCall('app:getWindowState', {}).catch(() => ({
            fullscreen: !!document.fullscreenElement,
        })),
    },
    tabs: {
        create: async (input) => {
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
            }
            catch (error) {
                if (IS_DEV) {
                    console.error('Failed to create tab:', error);
                }
                // Return a mock result to prevent UI from breaking
                return { id: `temp-${Date.now()}`, success: false };
            }
        },
        close: async (request) => {
            try {
                const response = await ipcCall('tabs:close', request);
                if (IS_DEV) {
                    console.log('[IPC] tabs.close response:', response);
                }
                return response;
            }
            catch (err) {
                if (IS_DEV) {
                    console.warn('Failed to close tab:', err);
                }
                throw err;
            }
        },
        activate: async (request) => {
            try {
                const response = await ipcCall('tabs:activate', request);
                if (IS_DEV) {
                    console.log('[IPC] tabs.activate response:', response);
                }
                return response;
            }
            catch (err) {
                if (IS_DEV) {
                    console.warn('Failed to activate tab:', err);
                }
                throw err;
            }
        },
        navigate: (id, url) => ipcCall('tabs:navigate', { id, url }).catch(err => console.warn('Failed to navigate:', err)),
        goBack: (id) => ipcCall('tabs:goBack', { id }).catch(err => console.warn('Failed to go back:', err)),
        goForward: (id) => ipcCall('tabs:goForward', { id }).catch(err => console.warn('Failed to go forward:', err)),
        setMemoryCap: async (tabId, capMB) => {
            try {
                return await ipcCall('tabs:setMemoryCap', { tabId, capMB });
            }
            catch (err) {
                if (IS_DEV) {
                    console.warn('Failed to set memory cap:', err);
                }
                throw err;
            }
        },
        devtools: (id) => ipcCall('tabs:devtools', { id }),
        zoomIn: (id) => ipcCall('tabs:zoomIn', { id }),
        zoomOut: (id) => ipcCall('tabs:zoomOut', { id }),
        zoomReset: (id) => ipcCall('tabs:zoomReset', { id }),
        screenshot: (id) => ipcCall('tabs:screenshot', { id }),
        capturePreview: (request) => ipcCall('tabs:capturePreview', request),
        pip: (id, enabled) => ipcCall('tabs:pip', { id, enabled }),
        find: (id) => ipcCall('tabs:find', { id }),
        reload: (id, options) => ipcCall('tabs:reload', { id, ...(options ?? {}) }).catch(err => console.warn('Failed to reload:', err)),
        stop: (id) => ipcCall('tabs:stop', { id }).catch(err => console.warn('Failed to stop loading:', err)),
        list: async () => {
            try {
                const result = await ipcCall('tabs:list', {});
                return Array.isArray(result) ? result : [];
            }
            catch (error) {
                console.warn('Failed to list tabs:', error);
                return [];
            }
        },
        predictiveGroups: async (options) => {
            try {
                const response = await ipcCall('tabs:predictiveGroups', options ?? {});
                return {
                    groups: Array.isArray(response?.groups) ? response.groups : [],
                    prefetch: Array.isArray(response?.prefetch) ? response.prefetch : [],
                    summary: response?.summary,
                };
            }
            catch (error) {
                if (IS_DEV) {
                    console.warn('Failed to fetch predictive tab groups:', error);
                }
                return { groups: [], prefetch: [], summary: undefined };
            }
        },
        moveToWorkspace: (request) => ipcCall('tabs:moveToWorkspace', request),
        hibernate: (id) => ipcCall('tabs:hibernate', { id }),
        wake: (id) => ipcCall('tabs:wake', { id }),
        burn: (id) => ipcCall('tabs:burn', { id }),
        onUpdated: (callback) => {
            if (window.ipc?.on) {
                window.ipc.on('tabs:updated', (_event, tabs) => callback(tabs));
            }
        },
        setContainer: (id, containerId) => ipcCall('tabs:setContainer', {
            id,
            containerId,
        }),
        reorder: (tabId, newIndex) => ipcCall('tabs:reorder', {
            tabId,
            newIndex,
        }),
        reopenClosed: (index) => ipcCall('tabs:reopenClosed', {
            index,
        }),
        setPinned: (request) => ipcCall('tabs:setPinned', request),
        listClosed: () => ipcCall('tabs:listClosed', {}),
        getContext: (tabId) => ipcCall('tabs:getContext', { tabId }),
    },
    workflow: {
        launch: (query) => ipcCall('workflow:launch', { query }),
        list: () => ipcCall('workflow:list', {}),
    },
    tor: {
        async status() {
            try {
                await waitForIPC(3000);
                return await ipcCall('tor:status', {});
            }
            catch (error) {
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
            }
            catch (error) {
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
            }
            catch (error) {
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
            }
            catch (error) {
                if (IS_DEV) {
                    console.warn('[IPC] tor.newIdentity failed in stub mode', error);
                }
                return { stub: true };
            }
        },
        async getProxy() {
            try {
                await waitForIPC(3000);
                return await ipcCall('tor:getProxy', {});
            }
            catch (error) {
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
            }
            catch (error) {
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
            }
            catch (error) {
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
        listProfiles: () => ipcCall('vpn:listProfiles', {}),
        connect: (id) => ipcCall('vpn:connect', { id }),
        disconnect: () => ipcCall('vpn:disconnect', {}),
    },
    containers: {
        list: () => ipcCall('containers:list', {}),
        getActive: () => ipcCall('containers:getActive', {}),
        setActive: (containerId) => ipcCall('containers:setActive', { containerId }),
        create: (payload) => ipcCall('containers:create', payload),
        getPermissions: (containerId) => ipcCall('containers:getPermissions', { containerId }),
        setPermission: (containerId, permission, enabled) => ipcCall('containers:setPermission', { containerId, permission, enabled }),
        getSitePermissions: (containerId) => ipcCall('containers:getSitePermissions', { containerId }),
        allowSitePermission: (containerId, permission, origin) => ipcCall('containers:allowSitePermission', { containerId, permission, origin }),
        revokeSitePermission: (containerId, permission, origin) => ipcCall('containers:revokeSitePermission', { containerId, permission, origin }),
    },
    ui: {
        setChromeOffsets: async (offsets) => {
            try {
                return await ipcCall('ui:setChromeOffsets', offsets);
            }
            catch (err) {
                if (IS_DEV) {
                    console.warn('[IPC] Failed to set chrome offsets:', err);
                }
                return { success: false };
            }
        },
    },
    proxy: {
        set: (config) => ipcCall('proxy:set', config),
        status: () => ipcCall('proxy:status', {}),
        getForTab: (tabId) => ipcCall('proxy:getForTab', { tabId }),
    },
    profiles: {
        create: (input, proxy) => {
            if (typeof input === 'string') {
                return ipcCall('profiles:create', { name: input, proxy });
            }
            return ipcCall('profiles:create', input);
        },
        list: () => ipcCall('profiles:list', {}),
        get: (id) => ipcCall('profiles:get', { id }),
        delete: (id) => ipcCall('profiles:delete', { id }),
        updateProxy: (profileId, proxy) => ipcCall('profiles:updateProxy', { profileId, proxy }),
        setActive: (profileId) => ipcCall('profiles:setActive', { profileId }),
        getActive: () => ipcCall('profiles:getActive', {}),
        getPolicy: (profileId) => ipcCall('profiles:getPolicy', profileId ? { profileId } : {}),
    },
    games: {
        createSandbox: (payload) => ipcCall('games:sandbox:create', payload),
        destroySandbox: (payload) => ipcCall('games:sandbox:destroy', payload),
        reportMetrics: (payload) => ipcCall('games:sandbox:metrics', payload),
    },
    telemetry: {
        setOptIn: (optIn) => {
            // Always return success, even if IPC fails (non-blocking for onboarding)
            return ipcCall('telemetry:setOptIn', {
                optIn,
            }).catch(() => ({ success: true })); // Fallback to success if IPC fails
        },
        getStatus: () => ipcCall('telemetry:getStatus', {}).catch(() => ({
            optIn: false,
            enabled: false,
        })),
        getSummary: () => ipcCall('telemetry:getSummary', {}).catch(() => ({
            optIn: false,
            enabled: false,
            crashCount: 0,
            lastCrashAt: null,
            uptimeSeconds: 0,
            perfMetrics: [],
        })),
        trackPerf: (metric, value, unit) => ipcCall('telemetry:trackPerf', { metric, value, unit }),
        trackFeature: (feature, action) => ipcCall('telemetry:trackFeature', { feature, action }),
    },
    analytics: {
        setOptIn: (optIn) => ipcCall('analytics:setOptIn', { optIn }).catch(() => ({ success: true })),
        getStatus: () => ipcCall('analytics:getStatus', {}).catch(() => ({
            optIn: false,
            enabled: false,
        })),
        track: (type, payload) => ipcCall('analytics:track', { type, payload }).catch(() => ({
            success: false,
        })),
    },
    settings: {
        get: () => ipcCall('settings:get', {}),
        set: (path, value) => ipcCall('settings:set', { path, value }),
        reset: () => ipcCall('settings:reset', {}),
        getCategory: (category) => ipcCall('settings:getCategory', { category }),
        setCategory: (category, values) => ipcCall('settings:setCategory', { category, values }),
        exportAll: () => ipcCall('settings:exportAll', {}),
        importAll: () => ipcCall('settings:importAll', {}),
        exportFile: () => ipcCall('settings:exportAll', {}),
        importFile: () => ipcCall('settings:importAll', {}),
    },
    diagnostics: {
        openLogs: () => ipcCall('diagnostics:openLogs', {}),
        copyDiagnostics: () => ipcCall('diagnostics:copy', {}),
    },
    agent: {
        createTask: (task) => ipcCall('agent:createTask', task),
        generatePlan: (taskId, observations) => ipcCall('agent:generatePlan', { taskId, observations }),
        executeTask: (taskId, confirmSteps) => ipcCall('agent:executeTask', { taskId, confirmSteps }),
        cancelTask: (taskId) => ipcCall('agent:cancelTask', { taskId }),
        getStatus: (taskId) => ipcCall('agent:getStatus', { taskId }),
        ask: (query, context) => ipcCall('agent:ask', { query, context }),
        askWithScrape: (payload) => ipcCall('agent:askWithScrape', payload),
        deepResearch: (request) => ipcCall('agent:deepResearch', request),
        stream: {
            start: (query, options) => ipcCall('agent:stream:start', { query, ...options }),
            stop: (streamId) => ipcCall('agent:stream:stop', { streamId }),
        },
        generatePlanFromGoal: (request) => ipcCall('agent:generatePlanFromGoal', request),
        executePlan: (request) => ipcCall('agent:executePlan', request),
        guardrails: {
            config: (config) => ipcCall('agent:guardrails:config', config),
            check: (type, data) => ipcCall('agent:guardrails:check', { type, data }),
        },
    },
    cursor: {
        setApiKey: (payload) => ipcCall('cursor:setApiKey', payload),
        checkApiKey: () => ipcCall('cursor:checkApiKey', {}),
        query: (payload) => ipcCall('cursor:query', payload),
        clearHistory: () => ipcCall('cursor:clearHistory', {}),
    },
    omnix: {
        browser: {
            getPage: () => ipcCall('omnix:browser:getPage', {}),
            getActiveTab: () => ipcCall('omnix:browser:getActiveTab', {}),
            captureSnapshot: (payload) => ipcCall('omnix:browser:captureSnapshot', payload),
        },
        scrape: {
            fetch: (payload) => ipcCall('omnix:scrape:fetch', payload),
            enqueue: (payload) => ipcCall('omnix:scrape:enqueue', payload),
        },
        ai: {
            ask: (payload) => ipcCall('omnix:ai:ask', payload),
            summarize: (payload) => ipcCall('omnix:ai:summarize', payload),
        },
        trade: {
            getChart: (payload) => ipcCall('omnix:trade:getChart', payload),
        },
        file: {
            save: (payload) => ipcCall('omnix:file:save', payload),
            read: (payload) => ipcCall('omnix:file:read', payload),
        },
        security: {
            scanPage: (payload) => ipcCall('omnix:security:scanPage', payload),
        },
    },
    session: {
        saveTabs: () => ipcCall('session:saveTabs', {}),
        loadTabs: () => ipcCall('session:loadTabs', {}),
        addHistory: (payload) => ipcCall('session:addHistory', payload),
        getHistory: (payload) => ipcCall('session:getHistory', payload),
        searchHistory: (payload) => ipcCall('session:searchHistory', payload),
        saveSetting: (payload) => ipcCall('session:saveSetting', payload),
        getSetting: (payload) => ipcCall('session:getSetting', payload),
        checkRestore: () => ipcCall('session:checkRestore', {}),
        getSnapshot: () => ipcCall('session:getSnapshot', {}),
        dismissRestore: () => ipcCall('session:dismissRestore', {}),
    },
    researchStream: {
        start: async (question, mode) => {
            const payload = { question, ...(mode ? { mode } : {}) };
            const response = await ipcCall('research:start', payload);
            return response;
        },
    },
    cloudVector: {
        config: (config) => ipcCall('cloud-vector:config', config),
        sync: (documentIds) => ipcCall('cloud-vector:sync', { documentIds }),
        search: (query, topK) => ipcCall('cloud-vector:search', { query, topK }),
        available: () => ipcCall('cloud-vector:available', {}),
    },
    hybridSearch: {
        search: (query, maxResults, language) => ipcCall('search:hybrid', { query, maxResults, language }),
        config: (config) => ipcCall('search:config', config),
    },
    liveSearch: {
        start: (query, options) => ipcCall('search:live:start', { query, ...options }),
    },
    graph: {
        tabs: () => ipcCall('graph:tabs', {}),
        workflow: (options) => ipcCall('graph:workflowWeaver', options ?? {}),
    },
    efficiency: {
        applyMode: (mode) => ipcCall('efficiency:applyMode', { mode }),
        clearOverride: () => ipcCall('efficiency:clearOverride', {}),
        hibernateInactiveTabs: () => ipcCall('efficiency:hibernate', {}),
        ecoImpact: (options) => ipcCall('efficiency:ecoImpact', options ?? {}),
    },
    browser: {
        launch: (url, headless) => ipcCall('launch_browser', { url, headless }),
        regenLaunch: (url, mode) => ipcCall('regen_launch', { url, mode }),
        regenSession: (urls) => ipcCall('regen_session', { urls }),
        captureScreenshot: (url) => ipcCall('capture_browser_screenshot', { url }),
    },
    grammar: {
        correct: (text) => ipcCall('correct_text', { text }),
    },
    vision: {
        captureScreen: () => ipcCall('capture_screen', {}),
        analyze: (prompt, screenshot) => ipcCall('ollama_vision', {
            prompt,
            screenshot,
        }),
    },
    trust: {
        list: () => ipcCall('trust:list', {}),
        get: (domain) => ipcCall('trust:get', {
            domain,
        }),
        submit: (signal) => ipcCall('trust:submit', signal),
    },
    downloads: {
        list: () => ipcCall('downloads:list', {}),
        openFile: (path) => ipcCall('downloads:openFile', { path }),
        showInFolder: (path) => ipcCall('downloads:showInFolder', { path }),
        requestConsent: (url, filename, size) => ipcCall('downloads:requestConsent', { url, filename, size }),
        pause: (id) => ipcCall('downloads:pause', { id }),
        resume: (id) => ipcCall('downloads:resume', { id }),
        cancel: (id) => ipcCall('downloads:cancel', { id }),
        retry: (id) => ipcCall('downloads:retry', { id }),
        getQueue: () => ipcCall('downloads:getQueue', {}),
    },
    watchers: {
        list: () => ipcCall('watchers:list', {}),
        add: (request) => ipcCall('watchers:add', request),
        remove: (id) => ipcCall('watchers:remove', { id }),
        trigger: (id) => ipcCall('watchers:trigger', { id }),
        updateInterval: (id, intervalMinutes) => ipcCall('watchers:updateInterval', { id, intervalMinutes }),
    },
    history: {
        list: () => ipcCall('history:list', {}),
        clear: () => ipcCall('history:clear', {}),
        search: async (query) => {
            try {
                return await ipcCall('history:search', { query });
            }
            catch (error) {
                // Return empty array on error instead of throwing
                if (IS_DEV) {
                    console.warn('History search failed:', error);
                }
                return [];
            }
        },
        deleteUrl: (url) => ipcCall('history:deleteUrl', { url }),
    },
    storage: {
        saveWorkspace: (workspace) => ipcCall('storage:saveWorkspace', workspace),
        listWorkspaces: () => ipcCall('storage:listWorkspaces', {}),
    },
    shields: {
        get: (url) => ipcCall('shields:get', { url }),
        set: (hostname, config) => ipcCall('shields:set', { hostname, config }),
        updateDefault: (config) => ipcCall('shields:updateDefault', config),
        list: () => ipcCall('shields:list', {}),
        getStatus: () => ipcCall('shields:getStatus', {}),
    },
    network: {
        get: () => ipcCall('network:get', {}),
        disableQUIC: () => ipcCall('network:disableQUIC', {}),
        enableQUIC: () => ipcCall('network:enableQUIC', {}),
        disableIPv6: () => ipcCall('network:disableIPv6', {}),
        enableIPv6: () => ipcCall('network:enableIPv6', {}),
    },
    ollama: {
        check: () => ipcCall('ollama:check', {}),
        listModels: () => ipcCall('ollama:listModels', {}),
    },
    citation: {
        extract: (text, url) => ipcCall('citation:extract', { text, url }),
        get: () => ipcCall('citation:get', {}),
        export: (format) => ipcCall('citation:export', { format }),
        clear: () => ipcCall('citation:clear', {}),
    },
    knowledge: {
        cluster: (sources, threshold) => ipcCall('knowledge:cluster', { sources, threshold: threshold ?? 0.7 }),
        parsePDF: (filePath) => ipcCall('knowledge:parsePDF', { filePath }),
        clusterCompare: (cluster1Id, cluster2Id) => ipcCall('knowledge:clusterCompare', { cluster1Id, cluster2Id }),
        clustersList: () => ipcCall('knowledge:clustersList', {}),
    },
    cognitive: {
        recordPattern: (pattern) => ipcCall('cognitive:recordPattern', pattern),
        getSuggestions: (request) => ipcCall('cognitive:getSuggestions', request || {}),
        getPersona: () => ipcCall('cognitive:getPersona', {}),
        getGraph: () => ipcCall('cognitive:getGraph', {}),
        clear: () => ipcCall('cognitive:clear', {}),
    },
    workspaceV2: {
        save: (workspace) => ipcCall('workspace-v2:save', workspace),
        load: (workspaceId) => ipcCall('workspace-v2:load', { workspaceId }),
        list: () => ipcCall('workspace-v2:list', {}),
        delete: (workspaceId) => ipcCall('workspace-v2:delete', { workspaceId }),
        updateNotes: (workspaceId, tabId, note) => ipcCall('workspace-v2:updateNotes', { workspaceId, tabId, note }),
        getNotes: (workspaceId) => ipcCall('workspace-v2:getNotes', { workspaceId }),
    },
    sessionBundle: {
        export: (runId, options) => ipcCall('session-bundle:export', { runId, ...options }),
        import: (filePath) => ipcCall('session-bundle:import', { filePath }),
        replay: (bundleId, options) => ipcCall('session-bundle:replay', { bundleId, ...options }),
        list: () => ipcCall('session-bundle:list', {}),
    },
    sessionState: {
        summary: () => ipcCall('session:lastSnapshotSummary', {}),
        restore: () => ipcCall('session:restoreLast', {}),
    },
    historyGraph: {
        recordNavigation: (fromUrl, toUrl, title) => ipcCall('history-graph:recordNavigation', { fromUrl, toUrl, title }),
        recordCitation: (sourceUrl, targetUrl) => ipcCall('history-graph:recordCitation', { sourceUrl, targetUrl }),
        recordExport: (sourceUrl, exportType, filename) => ipcCall('history-graph:recordExport', { sourceUrl, exportType, filename }),
        recordNote: (url, noteText) => ipcCall('history-graph:recordNote', { url, noteText }),
        get: (options) => ipcCall('history-graph:get', options || {}),
        export: (format) => ipcCall('history-graph:export', { format }),
        clear: () => ipcCall('history-graph:clear', {}),
    },
    omniscript: {
        parse: (command) => ipcCall('omniscript:parse', { command }),
        execute: (commands) => ipcCall('omniscript:execute', { commands }),
    },
    omniBrain: {
        addDocument: (document) => ipcCall('omni-brain:addDocument', document),
        search: (query, limit) => ipcCall('omni-brain:search', {
            query,
            limit: limit || 10,
        }),
        getDocument: (id) => ipcCall('omni-brain:getDocument', { id }),
        listDocuments: () => ipcCall('omni-brain:listDocuments', {}),
        deleteDocument: (id) => ipcCall('omni-brain:deleteDocument', { id }),
        clear: () => ipcCall('omni-brain:clear', {}),
    },
    spiritual: {
        focusMode: {
            enable: (config) => ipcCall('spiritual:focusMode:enable', config || {}),
            disable: () => ipcCall('spiritual:focusMode:disable', {}),
            status: () => ipcCall('spiritual:focusMode:status', {}),
        },
        mood: {
            recordTyping: () => ipcCall('spiritual:mood:recordTyping', {}),
            get: () => ipcCall('spiritual:mood:get', {}),
            reset: () => ipcCall('spiritual:mood:reset', {}),
        },
        balance: {
            start: (intervals) => ipcCall('spiritual:balance:start', intervals || {}),
            stop: () => ipcCall('spiritual:balance:stop', {}),
        },
    },
    pluginMarketplace: {
        list: () => ipcCall('plugin-marketplace:list', {}),
        install: (pluginId, verifySignature) => ipcCall('plugin-marketplace:install', { pluginId, verifySignature: verifySignature ?? true }),
        uninstall: (pluginId) => ipcCall('plugin-marketplace:uninstall', { pluginId }),
        installed: () => ipcCall('plugin-marketplace:installed', {}),
        isInstalled: (pluginId) => ipcCall('plugin-marketplace:isInstalled', { pluginId }),
    },
    extensionNexus: {
        list: () => ipcCall('plugins:nexus:list', {}),
        publish: (metadata) => ipcCall('plugins:nexus:publish', metadata),
        trust: (pluginId, trusted) => ipcCall('plugins:nexus:trust', {
            pluginId,
            trusted,
        }),
    },
    performance: {
        battery: {
            update: (payload) => ipcCall('performance:battery:update', payload),
        },
        getMetrics: () => ipcCall('performance:getMetrics', {}),
        gpu: {
            enableRaster: () => ipcCall('performance:gpu:enableRaster', {}),
            disableRaster: () => ipcCall('performance:gpu:disableRaster', {}),
            enableHardwareDecode: () => ipcCall('performance:gpu:enableHardwareDecode', {}),
            disableHardwareDecode: () => ipcCall('performance:gpu:disableHardwareDecode', {}),
            getConfig: () => ipcCall('performance:gpu:getConfig', {}),
        },
        snapshot: {
            create: (snapshot) => ipcCall('performance:snapshot:create', snapshot),
            restore: (snapshotId) => ipcCall('performance:snapshot:restore', { snapshotId }),
            latest: () => ipcCall('performance:snapshot:latest', {}),
            list: () => ipcCall('performance:snapshot:list', {}),
        },
    },
    workers: {
        scraping: {
            run: (task) => ipcCall('workers:scraping:run', task),
        },
    },
    videoCall: {
        getConfig: () => ipcCall('videoCall:getConfig', {}),
        updateConfig: (config) => ipcCall('videoCall:updateConfig', config),
        getNetworkQuality: () => ipcCall('videoCall:getNetworkQuality', {}),
        updateNetworkQuality: (quality) => ipcCall('videoCall:updateNetworkQuality', quality),
    },
    sessions: {
        create: (request) => ipcCall('sessions:create', request),
        list: () => ipcCall('sessions:list', {}),
        getActive: () => ipcCall('sessions:getActive', {}),
        setActive: (request) => ipcCall('sessions:setActive', request),
        get: (request) => ipcCall('sessions:get', request),
        delete: (request) => ipcCall('sessions:delete', request),
        update: (request) => ipcCall('sessions:update', request),
        getPartition: (request) => ipcCall('sessions:getPartition', request),
    },
    private: {
        createWindow: (options) => ipcCall('private:createWindow', options || {}),
        createGhostTab: (options) => ipcCall('private:createGhostTab', options || {}),
        closeAll: () => ipcCall('private:closeAll', {}),
        panicWipe: (options) => ipcCall('private:panicWipe', options || {}),
    },
    crossReality: {
        handoff: (tabId, target) => ipcCall('cross-reality:handoff', {
            tabId,
            target,
        }),
        queue: () => ipcCall('cross-reality:queue', {}),
        sendHandoffStatus: (status) => ipcCall('cross-reality:handoffStatus', status).catch(error => {
            if (IS_DEV) {
                console.warn('[IPC] Failed to send handoff status:', error);
            }
            return { success: false };
        }),
    },
    identity: {
        status: () => ipcCall('identity:status', {}),
        unlock: (passphrase) => ipcCall('identity:unlock', { passphrase }),
        lock: () => ipcCall('identity:lock', {}),
        list: () => ipcCall('identity:list', {}),
        add: (payload) => ipcCall('identity:add', payload),
        remove: (id) => ipcCall('identity:remove', { id }),
        reveal: (id) => ipcCall('identity:reveal', { id }),
    },
    consent: {
        createRequest: (action) => ipcCall('consent:createRequest', action),
        approve: (consentId) => ipcCall('consent:approve', { consentId }),
        revoke: (consentId) => ipcCall('consent:revoke', { consentId }),
        check: (action) => ipcCall('consent:check', action),
        get: (consentId) => ipcCall('consent:get', { consentId }),
        list: (filter) => ipcCall('consent:list', filter ?? {}),
        export: () => ipcCall('consent:export', {}),
        vault: {
            export: () => ipcCall('consent:vault:export', {}),
        },
    },
    research: {
        queryEnhanced: (payload) => ipcCall('research:queryEnhanced', payload),
        extractContent: (tabId) => ipcCall('research:extractContent', tabId ? { tabId } : {}),
        saveNotes: (url, notes, highlights) => ipcCall('research:saveNotes', {
            url,
            notes,
            highlights,
        }),
        getNotes: (url) => ipcCall('research:getNotes', {
            url,
        }),
        export: (payload) => ipcCall('research:export', payload),
        saveSnapshot: (tabId) => ipcCall('research:saveSnapshot', {
            tabId,
        }),
        uploadFile: (file) => {
            // Convert File to base64 for IPC
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async () => {
                    const base64 = reader.result;
                    const result = await ipcCall('research:uploadFile', {
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
        listDocuments: () => ipcCall('research:listDocuments', {}),
        getDocumentChunks: (documentId) => ipcCall('research:getDocumentChunks', { documentId }),
        capturePage: (tabId) => ipcCall('research:capturePage', tabId ? { tabId } : {}),
        captureSelection: (text, tabId) => ipcCall('research:captureSelection', { tabId, text }),
    },
    reader: {
        summarize: (payload) => ipcCall('reader:summarize', payload),
        export: (payload) => ipcCall('reader:export', payload),
    },
    trade: {
        execute: (query) => ipcCall('execute_trade_command', { query }),
        // TradingView API Integration
        tradingviewAuthorize: (login, password) => ipcCall('tradingview_authorize', { login, password }),
        tradingviewQuotes: (accountId, symbols) => ipcCall('tradingview_quotes', { accountId, symbols }),
        tradingviewPlaceOrder: (params) => ipcCall('tradingview_place_order', params),
        tradingviewGetPositions: (accountId) => ipcCall('tradingview_get_positions', {
            accountId,
        }),
        tradingviewGetAccountState: (accountId) => ipcCall('tradingview_get_account_state', { accountId }),
        placeOrder: (order) => ipcCall('trade:placeOrder', order),
        cancelOrder: (orderId) => ipcCall('trade:cancelOrder', { orderId }),
        getOrders: (status) => ipcCall('trade:getOrders', status ? { status } : {}),
        getPositions: () => ipcCall('trade:getPositions', {}),
        closePosition: (symbol, quantity) => ipcCall('trade:closePosition', { symbol, quantity }),
        getBalance: () => ipcCall('trade:getBalance', {}),
        connectBroker: (config) => ipcCall('trade:connectBroker', config),
        getQuote: (symbol) => ipcCall('trade:getQuote', { symbol }),
        getCandles: (params) => ipcCall('trade:getCandles', params),
    },
    dns: {
        status: () => ipcCall('dns:status', {}),
        enableDoH: (provider = 'cloudflare') => ipcCall('dns:enableDoH', { provider }),
        disableDoH: () => ipcCall('dns:disableDoH', {}),
    },
    privacy: {
        sentinel: {
            audit: (tabId) => ipcCall('privacy:sentinel:audit', tabId ? { tabId } : {}),
        },
        getStats: () => ipcCall('privacy:getStats', {}),
        getTrackers: (limit) => ipcCall('privacy:getTrackers', { limit: limit || 50 }),
        exportReport: (format) => ipcCall('privacy:exportReport', { format: format || 'json' }),
    },
    redix: {
        ask: (prompt, options) => ipcCall('redix:ask', { prompt, ...options }),
        status: () => ipcCall('redix:status', {}),
        stream: (prompt, options, onChunk) => {
            // For streaming, we'll use events
            let handler = null;
            if (onChunk && typeof window !== 'undefined' && window.ipc) {
                handler = (_event, data) => {
                    try {
                        onChunk(data);
                        if (data.done || data.error) {
                            if (handler && window.ipc?.removeListener) {
                                window.ipc.removeListener('redix:chunk', handler);
                            }
                            handler = null;
                        }
                    }
                    catch (error) {
                        console.error('[Redix] Error in stream handler:', error);
                        if (handler && window.ipc?.removeListener) {
                            window.ipc.removeListener('redix:chunk', handler);
                        }
                        handler = null;
                    }
                };
                try {
                    window.ipc.on?.('redix:chunk', handler);
                }
                catch (error) {
                    console.error('[Redix] Failed to register stream handler:', error);
                }
            }
            return ipcCall('redix:stream', { prompt, stream: true, ...options }).catch(error => {
                // Clean up handler on error
                if (handler && typeof window !== 'undefined' && window.ipc?.removeListener) {
                    window.ipc.removeListener('redix:chunk', handler);
                }
                throw error;
            });
        },
    },
    system: {
        getStatus: () => ipcCall('system:getStatus', {}),
    },
    gpu: {
        getStatus: () => ipcCall('gpu:getStatus', {}),
        setEnabled: (payload) => ipcCall('gpu:setEnabled', payload),
    },
    features: {
        list: () => ipcCall('features:list', {}),
        get: (payload) => ipcCall('features:get', payload),
        set: (payload) => ipcCall('features:set', payload),
    },
    regen: {
        query: (payload) => ipcCall('regen:query', payload),
        getDom: (payload) => ipcCall('regen:getDom', payload),
        clickElement: (payload) => ipcCall('regen:clickElement', payload),
        scroll: (payload) => ipcCall('regen:scroll', payload),
        openTab: (payload) => ipcCall('regen:openTab', payload),
        typeIntoElement: (payload) => ipcCall('regen:typeIntoElement', payload),
        goBack: (payload) => ipcCall('regen:goBack', payload),
        goForward: (payload) => ipcCall('regen:goForward', payload),
        switchTab: (payload) => ipcCall('regen:switchTab', payload),
        closeTab: (payload) => ipcCall('regen:closeTab', payload),
        readPage: (payload) => ipcCall('regen:readPage', payload),
        tradeConfirm: (payload) => ipcCall('regen:trade:confirm', payload),
    },
};
