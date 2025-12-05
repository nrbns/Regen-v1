/**
 * HTTP API Client for Regen
 *
 * This replaces Electron IPC with HTTP calls to the Fastify backend.
 * Used during Electron → Tauri migration and web fallback.
 */
import { canAttemptBackendRequest, markBackendAvailable, markBackendUnavailable, } from './backend-status';
// CATEGORY C FIX: Read API base URL from .env (Vite env variables)
const API_BASE_URL = typeof window !== 'undefined'
    ? window.__API_BASE_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_APP_API_URL ||
        'http://127.0.0.1:4000'
    : import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_APP_API_URL ||
        'http://127.0.0.1:4000';
import { isWebMode } from './env';
async function apiRequest(endpoint, options = {}) {
    // FIX: Allow backend requests in web mode - server may be running
    // Don't block requests based on mode alone, let the actual connection attempt determine availability
    const webMode = isWebMode();
    // In web mode, we should still try to connect to the backend server
    // The backend-status system will handle connection failures gracefully
    // Only block if backend is confirmed offline AND we're in web mode
    if (webMode) {
        // Check if we can attempt a request (backend might be available)
        if (!canAttemptBackendRequest()) {
            // Backend is confirmed offline, but in web mode this is expected
            // Still allow the attempt - it will fail gracefully and update status
            // This allows the backend to come online and be detected
        }
        // Continue with request attempt - let the fetch handle the connection
    }
    const { method = 'GET', body, headers = {}, params } = options;
    let url = `${API_BASE_URL}${endpoint}`;
    // Add query parameters
    if (params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }
    const requestOptions = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };
    if (body && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(body);
    }
    // FIX: In web mode, always attempt the request to check if backend is available
    // The backend-status system will update based on the actual response
    if (!webMode && !canAttemptBackendRequest()) {
        throw new Error('Backend offline');
    }
    try {
        const response = await fetch(url, requestOptions);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.statusText} - ${errorText}`);
        }
        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const result = await response.json();
            markBackendAvailable();
            return result;
        }
        const textResult = (await response.text());
        markBackendAvailable();
        return textResult;
    }
    catch (error) {
        // Mark backend as unavailable if request fails
        markBackendUnavailable(error);
        // Provide better error messages for connection errors
        const isConnectionError = error instanceof TypeError ||
            (error instanceof Error && (error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError') ||
                error.message.includes('ECONNREFUSED') ||
                error.message.includes('connection refused')));
        if (isConnectionError) {
            // Create a more helpful error message
            const connectionError = new Error(`Backend server is not running. Please start the server with: npm run dev:server\n\n` +
                `Attempted to connect to: ${url}`);
            connectionError.name = 'ConnectionError';
            throw connectionError;
        }
        // In web mode, backend failures are expected initially, but log once we know it's down
        if (webMode) {
            if (!isConnectionError) {
                // Server responded but with error - log it
                console.error(`[API Client] Request failed for ${endpoint}:`, error);
            }
            // Connection errors in web mode are expected - don't spam console
        }
        else {
            // In Electron/Tauri mode, always log errors
            console.error(`[API Client] Request failed for ${endpoint}:`, error);
            console.error(`[API Client] Error details:`, {
                message: error instanceof Error ? error.message : String(error),
                url,
                method,
            });
        }
        throw error;
    }
}
// Tabs API
export const tabsApi = {
    list: () => apiRequest('/api/tabs'),
    create: (payload) => apiRequest('/api/tabs', { method: 'POST', body: payload }),
    close: (id) => apiRequest(`/api/tabs/${id}`, { method: 'DELETE' }),
    activate: (id) => apiRequest(`/api/tabs/${id}/activate`, { method: 'POST' }),
    navigate: (payload) => apiRequest(`/api/tabs/${payload.id}/navigate`, {
        method: 'POST',
        body: { url: payload.url },
    }),
    goBack: (id) => apiRequest(`/api/tabs/${id}/back`, { method: 'POST' }),
    goForward: (id) => apiRequest(`/api/tabs/${id}/forward`, { method: 'POST' }),
    reload: (id, options) => apiRequest(`/api/tabs/${id}/reload`, {
        method: 'POST',
        body: options || {},
    }),
    stop: (id) => apiRequest(`/api/tabs/${id}/stop`, { method: 'POST' }),
    createWithProfile: (payload) => apiRequest('/api/tabs', {
        method: 'POST',
        body: { url: payload.url, profileId: payload.accountId },
    }),
    overlayStart: () => apiRequest('/api/tabs/overlay/start', { method: 'POST' }),
    overlayGetPick: () => apiRequest('/api/tabs/overlay/pick'),
    overlayClear: () => apiRequest('/api/tabs/overlay/clear', { method: 'POST' }),
    predictiveGroups: () => apiRequest('/api/tabs/predictive-groups'),
};
// Sessions API
export const sessionsApi = {
    list: () => apiRequest('/api/sessions'),
    create: (payload) => apiRequest('/api/sessions', { method: 'POST', body: payload }),
    getActive: () => apiRequest('/api/sessions/active'),
    setActive: (sessionId) => apiRequest(`/api/sessions/${sessionId}/activate`, { method: 'POST' }),
    get: (sessionId) => apiRequest(`/api/sessions/${sessionId}`),
    delete: (sessionId) => apiRequest(`/api/sessions/${sessionId}`, { method: 'DELETE' }),
    update: (payload) => apiRequest(`/api/sessions/${payload.sessionId}`, {
        method: 'PUT',
        body: payload,
    }),
    getPartition: (sessionId) => apiRequest(`/api/sessions/${sessionId}/partition`),
};
// Agent API
export const agentApi = {
    start: (dsl) => apiRequest('/api/agent/start', { method: 'POST', body: { dsl } }),
    status: (id) => apiRequest(`/api/agent/status/${id}`),
    runs: () => apiRequest('/api/agent/runs'),
    executeSkill: (payload) => apiRequest('/api/agent/execute-skill', { method: 'POST', body: payload }),
    ask: (payload) => apiRequest('/api/agent/ask', { method: 'POST', body: payload }),
    query: (payload) => apiRequest('/api/agent/query', { method: 'POST', body: payload }),
};
// System API
export const systemApi = {
    getStatus: () => apiRequest('/api/system/status'),
    ping: () => apiRequest('/api/ping'),
};
// Profiles API
export const profilesApi = {
    list: () => apiRequest('/api/profiles'),
    get: (id) => apiRequest(`/api/profiles/${id}`),
    getActive: () => apiRequest('/api/profiles/active'),
    getPolicy: (id) => apiRequest(`/api/profiles/${id}/policy`),
    updateProxy: (payload) => apiRequest(`/api/profiles/${payload.id}/proxy`, {
        method: 'PUT',
        body: payload.proxy,
    }),
    delete: (id) => apiRequest(`/api/profiles/${id}`, { method: 'DELETE' }),
};
// Storage API
export const storageApi = {
    getSetting: (key) => apiRequest(`/api/storage/settings/${key}`),
    listWorkspaces: () => apiRequest('/api/storage/workspaces'),
    listDownloads: () => apiRequest('/api/storage/downloads'),
    listAccounts: () => apiRequest('/api/storage/accounts'),
};
// History API
export const historyApi = {
    list: (limit) => apiRequest('/api/history', {
        params: limit ? { limit: limit.toString() } : undefined,
    }),
};
// Research API
export const researchApi = {
    query: (query) => apiRequest('/api/research/query', { method: 'POST', body: { query } }),
    queryEnhanced: (payload) => apiRequest('/api/research/enhanced', { method: 'POST', body: payload }),
    run: (payload) => apiRequest('/api/research/run', {
        method: 'POST',
        body: payload,
    }),
    getStatus: (jobId) => apiRequest(`/api/research/status/${jobId}`),
};
// Graph API
export const graphApi = {
    add: (node, edges = []) => apiRequest('/api/graph', { method: 'POST', body: { node, edges } }),
    get: (key) => apiRequest(`/api/graph/${key}`),
    all: () => apiRequest('/api/graph'),
};
// Trade API
export const tradeApi = {
    getQuote: (symbol) => apiRequest(`/api/trade/quote/${symbol}`),
    getCandles: (symbol, interval = '1d', limit = 50) => apiRequest(`/api/trade/candles/${symbol}?interval=${interval}&limit=${limit}`),
    placeOrder: (order) => apiRequest('/api/trade/order', {
        method: 'POST',
        body: order,
    }),
};
// Ledger API
export const ledgerApi = {
    add: (payload) => apiRequest('/api/ledger', { method: 'POST', body: payload }),
    verify: () => apiRequest('/api/ledger/verify'),
};
// Recorder API
export const recorderApi = {
    start: () => apiRequest('/api/recorder/start', { method: 'POST' }),
    getDsl: () => apiRequest('/api/recorder/dsl'),
};
// Proxy API
export const proxyApi = {
    set: (rules) => apiRequest('/api/proxy', { method: 'POST', body: rules }),
    status: () => apiRequest('/api/proxy/status'),
    killSwitch: (enabled) => apiRequest('/api/proxy/kill-switch', {
        method: 'POST',
        body: { enabled },
    }),
};
// Threats API
export const threatsApi = {
    scanUrl: (url) => apiRequest('/api/threats/scan-url', { method: 'POST', body: { url } }),
    scanFile: (filePath) => apiRequest('/api/threats/scan-file', { method: 'POST', body: { filePath } }),
};
// Video API
export const videoApi = {
    start: (args) => apiRequest('/api/video/start', { method: 'POST', body: args }),
    cancel: (id) => apiRequest(`/api/video/${id}`, { method: 'DELETE' }),
    consent: {
        get: () => apiRequest('/api/video/consent'),
        set: (value) => apiRequest('/api/video/consent', { method: 'POST', body: { value } }),
    },
};
// UI API
export const uiApi = {
    setRightDock: (px) => apiRequest('/api/ui/right-dock', { method: 'POST', body: { px } }),
    setChromeOffsets: (offsets) => apiRequest('/api/ui/chrome-offsets', { method: 'POST', body: offsets }),
};
// Scrape API
export const scrapeApi = {
    enqueue: (task) => apiRequest('/api/scrape', { method: 'POST', body: task }),
    get: (id) => apiRequest(`/api/scrape/${id}`),
};
// Summarize API - Tier 1: Unified facade (no polling needed)
export const summarizeApi = {
    summarize: (payload) => apiRequest('/api/summarize', { method: 'POST', body: payload }),
};
// Session State API
export const sessionStateApi = {
    checkRestore: () => apiRequest('/api/session/check-restore'),
    getSnapshot: () => apiRequest('/api/session/snapshot'),
    dismissRestore: () => apiRequest('/api/session/dismiss-restore', { method: 'POST' }),
    saveTabs: () => apiRequest('/api/session/save-tabs', { method: 'POST' }),
    loadTabs: () => apiRequest('/api/session/load-tabs'),
    addHistory: (payload) => apiRequest('/api/session/add-history', { method: 'POST', body: payload }),
    getHistory: (payload) => apiRequest('/api/session/history', {
        params: payload.limit ? { limit: payload.limit.toString() } : undefined,
    }),
    searchHistory: (payload) => apiRequest('/api/session/search-history', {
        method: 'POST',
        body: payload,
    }),
    saveSetting: (payload) => apiRequest('/api/session/save-setting', {
        method: 'POST',
        body: payload,
    }),
    getSetting: (payload) => apiRequest(`/api/session/get-setting/${payload.key}`),
};
// Export default API client
export default {
    tabs: tabsApi,
    sessions: sessionsApi,
    agent: agentApi,
    system: systemApi,
    profiles: profilesApi,
    storage: storageApi,
    history: historyApi,
    research: researchApi,
    graph: graphApi,
    ledger: ledgerApi,
    recorder: recorderApi,
    proxy: proxyApi,
    threats: threatsApi,
    video: videoApi,
    ui: uiApi,
    scrape: scrapeApi,
    summarize: summarizeApi,
    session: sessionStateApi,
};
