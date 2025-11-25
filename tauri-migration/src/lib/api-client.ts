/**
 * HTTP API Client for Regen
 *
 * This replaces Electron IPC with HTTP calls to the Fastify backend.
 * Used during Electron → Tauri migration.
 */

import {
  canAttemptBackendRequest,
  isBackendAvailable,
  markBackendAvailable,
  markBackendUnavailable,
} from './backend-status';

const API_BASE_URL =
  typeof window !== 'undefined'
    ? (window as any).__API_BASE_URL || 'http://127.0.0.1:4000'
    : 'http://127.0.0.1:4000';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, params } = options;

  let url = `${API_BASE_URL}${endpoint}`;

  // Add query parameters
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    requestOptions.body = JSON.stringify(body);
  }

  if (!canAttemptBackendRequest()) {
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

    const textResult = (await response.text()) as unknown as T;
    markBackendAvailable();
    return textResult;
  } catch (error) {
    console.error(`[API Client] Request failed for ${endpoint}:`, error);
    markBackendUnavailable(error);
    throw error;
  }
}

// Tabs API
export const tabsApi = {
  list: () => apiRequest<Array<any>>('/api/tabs'),
  create: (payload: { url: string; profileId?: string }) =>
    apiRequest<{ id: string }>('/api/tabs', { method: 'POST', body: payload }),
  close: (id: string) => apiRequest<{ success: boolean }>(`/api/tabs/${id}`, { method: 'DELETE' }),
  activate: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/tabs/${id}/activate`, { method: 'POST' }),
  navigate: (payload: { id: string; url: string }) =>
    apiRequest<{ success: boolean }>(`/api/tabs/${payload.id}/navigate`, {
      method: 'POST',
      body: { url: payload.url },
    }),
  goBack: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/tabs/${id}/back`, { method: 'POST' }),
  goForward: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/tabs/${id}/forward`, { method: 'POST' }),
  reload: (id: string, options?: { hard?: boolean }) =>
    apiRequest<{ success: boolean }>(`/api/tabs/${id}/reload`, {
      method: 'POST',
      body: options || {},
    }),
  stop: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/tabs/${id}/stop`, { method: 'POST' }),
  createWithProfile: (payload: { accountId: string; url: string }) =>
    apiRequest<{ id: string }>('/api/tabs', {
      method: 'POST',
      body: { url: payload.url, profileId: payload.accountId },
    }),
  overlayStart: () =>
    apiRequest<{ success: boolean }>('/api/tabs/overlay/start', { method: 'POST' }),
  overlayGetPick: () => apiRequest<any>('/api/tabs/overlay/pick'),
  overlayClear: () =>
    apiRequest<{ success: boolean }>('/api/tabs/overlay/clear', { method: 'POST' }),
  predictiveGroups: () =>
    apiRequest<{ groups: any[]; prefetch: any[]; summary?: any }>('/api/tabs/predictive-groups'),
};

// Sessions API
export const sessionsApi = {
  list: () => apiRequest<Array<any>>('/api/sessions'),
  create: (payload: { name: string; profileId?: string; color?: string }) =>
    apiRequest<{ id: string }>('/api/sessions', { method: 'POST', body: payload }),
  getActive: () => apiRequest<{ id: string } | null>('/api/sessions/active'),
  setActive: (sessionId: string) =>
    apiRequest<{ success: boolean }>(`/api/sessions/${sessionId}/activate`, { method: 'POST' }),
  get: (sessionId: string) => apiRequest<any>(`/api/sessions/${sessionId}`),
  delete: (sessionId: string) =>
    apiRequest<{ success: boolean }>(`/api/sessions/${sessionId}`, { method: 'DELETE' }),
  update: (payload: { sessionId: string; name?: string; color?: string }) =>
    apiRequest<{ success: boolean }>(`/api/sessions/${payload.sessionId}`, {
      method: 'PUT',
      body: payload,
    }),
  getPartition: (sessionId: string) =>
    apiRequest<{ partition: string }>(`/api/sessions/${sessionId}/partition`),
};

// Agent API
export const agentApi = {
  start: (dsl: any) =>
    apiRequest<{ id: string }>('/api/agent/start', { method: 'POST', body: { dsl } }),
  status: (id: string) => apiRequest<any>(`/api/agent/status/${id}`),
  runs: () => apiRequest<Array<any>>('/api/agent/runs'),
  executeSkill: (payload: { skill: string; args: any }) =>
    apiRequest<any>('/api/agent/execute-skill', { method: 'POST', body: payload }),
  ask: (payload: { prompt: string; sessionId?: string; stream?: boolean }) =>
    apiRequest<{ response: string }>('/api/agent/ask', { method: 'POST', body: payload }),
  query: (payload: { query: string; mode?: string }) =>
    apiRequest<any>('/api/agent/query', { method: 'POST', body: payload }),
};

// System API
export const systemApi = {
  getStatus: () => apiRequest<{ cpu: number; memory: number; disk?: any }>('/api/system/status'),
  ping: () => apiRequest<string>('/api/ping'),
};

// Profiles API
export const profilesApi = {
  list: () => apiRequest<Array<any>>('/api/profiles'),
  get: (id: string) => apiRequest<any>(`/api/profiles/${id}`),
  getActive: () => apiRequest<any>('/api/profiles/active'),
  getPolicy: (id: string) => apiRequest<any>(`/api/profiles/${id}/policy`),
  updateProxy: (payload: { id: string; proxy: any }) =>
    apiRequest<{ success: boolean }>(`/api/profiles/${payload.id}/proxy`, {
      method: 'PUT',
      body: payload.proxy,
    }),
  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/profiles/${id}`, { method: 'DELETE' }),
};

// Storage API
export const storageApi = {
  getSetting: (key: string) => apiRequest<any>(`/api/storage/settings/${key}`),
  listWorkspaces: () => apiRequest<Array<any>>('/api/storage/workspaces'),
  listDownloads: () => apiRequest<Array<any>>('/api/storage/downloads'),
  listAccounts: () => apiRequest<Array<any>>('/api/storage/accounts'),
};

// History API
export const historyApi = {
  list: (limit?: number) =>
    apiRequest<Array<any>>('/api/history', {
      params: limit ? { limit: limit.toString() } : undefined,
    }),
};

// Research API
export const researchApi = {
  query: (query: string) =>
    apiRequest<any>('/api/research/query', { method: 'POST', body: { query } }),
};

// Graph API
export const graphApi = {
  add: (node: any, edges: any[] = []) =>
    apiRequest<{ success: boolean }>('/api/graph', { method: 'POST', body: { node, edges } }),
  get: (key: string) => apiRequest<any>(`/api/graph/${key}`),
  all: () => apiRequest<{ nodes: any[]; edges: any[] }>('/api/graph'),
};

// Ledger API
export const ledgerApi = {
  add: (payload: { url: string; passage: string }) =>
    apiRequest<{ success: boolean }>('/api/ledger', { method: 'POST', body: payload }),
  verify: () => apiRequest<any>('/api/ledger/verify'),
};

// Recorder API
export const recorderApi = {
  start: () => apiRequest<{ success: boolean }>('/api/recorder/start', { method: 'POST' }),
  getDsl: () => apiRequest<any>('/api/recorder/dsl'),
};

// Proxy API
export const proxyApi = {
  set: (rules: any) =>
    apiRequest<{ success: boolean }>('/api/proxy', { method: 'POST', body: rules }),
  status: () => apiRequest<{ healthy: boolean; killSwitchEnabled: boolean }>('/api/proxy/status'),
  killSwitch: (enabled: boolean) =>
    apiRequest<{ success: boolean }>('/api/proxy/kill-switch', {
      method: 'POST',
      body: { enabled },
    }),
};

// Threats API
export const threatsApi = {
  scanUrl: (url: string) =>
    apiRequest<any>('/api/threats/scan-url', { method: 'POST', body: { url } }),
  scanFile: (filePath: string) =>
    apiRequest<any>('/api/threats/scan-file', { method: 'POST', body: { filePath } }),
};

// Video API
export const videoApi = {
  start: (args: any) =>
    apiRequest<{ id: string }>('/api/video/start', { method: 'POST', body: args }),
  cancel: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/video/${id}`, { method: 'DELETE' }),
  consent: {
    get: () => apiRequest<boolean>('/api/video/consent'),
    set: (value: boolean) =>
      apiRequest<{ success: boolean }>('/api/video/consent', { method: 'POST', body: { value } }),
  },
};

// UI API
export const uiApi = {
  setRightDock: (px: number) =>
    apiRequest<{ success: boolean }>('/api/ui/right-dock', { method: 'POST', body: { px } }),
  setChromeOffsets: (offsets: { top?: number; bottom?: number; left?: number; right?: number }) =>
    apiRequest<{ success: boolean }>('/api/ui/chrome-offsets', { method: 'POST', body: offsets }),
};

// Scrape API
export const scrapeApi = {
  enqueue: (task: any) => apiRequest<{ id: string }>('/api/scrape', { method: 'POST', body: task }),
  get: (id: string) => apiRequest<any>(`/api/scrape/${id}`),
};

// Session State API
export const sessionStateApi = {
  checkRestore: () =>
    apiRequest<{ available: boolean; snapshot?: any }>('/api/session/check-restore'),
  getSnapshot: () => apiRequest<any>('/api/session/snapshot'),
  dismissRestore: () =>
    apiRequest<{ success: boolean }>('/api/session/dismiss-restore', { method: 'POST' }),
  saveTabs: () =>
    apiRequest<{ success: boolean; count: number }>('/api/session/save-tabs', { method: 'POST' }),
  loadTabs: () => apiRequest<{ tabs: any[] }>('/api/session/load-tabs'),
  addHistory: (payload: { url: string; title: string; typed?: boolean }) =>
    apiRequest<{ success: boolean }>('/api/session/add-history', { method: 'POST', body: payload }),
  getHistory: (payload: { limit?: number }) =>
    apiRequest<{ history: any[] }>('/api/session/history', {
      params: payload.limit ? { limit: payload.limit.toString() } : undefined,
    }),
  searchHistory: (payload: { query: string; limit?: number }) =>
    apiRequest<{ results: any[] }>('/api/session/search-history', {
      method: 'POST',
      body: payload,
    }),
  saveSetting: (payload: { key: string; value: unknown }) =>
    apiRequest<{ success: boolean }>('/api/session/save-setting', {
      method: 'POST',
      body: payload,
    }),
  getSetting: (payload: { key: string }) =>
    apiRequest<{ value: unknown }>(`/api/session/get-setting/${payload.key}`),
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
  session: sessionStateApi,
};
