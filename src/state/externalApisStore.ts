import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  EXTERNAL_APIS,
  getDefaultEnabledApis,
  type OmniMode,
  type ExternalAPI,
} from '../config/externalApis';

/**
 * API Health Status
 */
export interface ApiHealthStatus {
  /** Last successful request timestamp */
  lastSuccess?: number;

  /** Last error timestamp */
  lastError?: number;

  /** Error count in the last hour */
  errorCount: number;

  /** Average latency in milliseconds */
  avgLatency?: number;

  /** Total request count */
  requestCount: number;
}

/**
 * API Configuration (user settings)
 */
export interface ApiConfig {
  /** Whether this API is enabled */
  enabled: boolean;

  /** API key (stored securely, encrypted in production) */
  apiKey?: string;

  /** Health status */
  health: ApiHealthStatus;
}

type ExternalApisState = {
  /** Map of API ID -> configuration */
  apis: Record<string, ApiConfig>;

  /** Initialize with defaults */
  initialize: () => void;

  /** Enable/disable an API */
  setApiEnabled: (apiId: string, enabled: boolean) => void;

  /** Set API key for an API */
  setApiKey: (apiId: string, key: string) => void;

  /** Clear API key */
  clearApiKey: (apiId: string) => void;

  /** Update health status */
  updateHealth: (apiId: string, update: Partial<ApiHealthStatus>) => void;

  /** Record a successful request */
  recordSuccess: (apiId: string, latency: number) => void;

  /** Record a failed request */
  recordError: (apiId: string) => void;

  /** Get config for an API */
  getApiConfig: (apiId: string) => ApiConfig | undefined;

  /** Get all enabled APIs for a mode */
  getEnabledApisForMode: (mode: OmniMode) => ExternalAPI[];

  /** Reset all API settings */
  reset: () => void;
};

const createDefaultConfig = (): ApiConfig => ({
  enabled: false,
  apiKey: undefined,
  health: {
    errorCount: 0,
    requestCount: 0,
  },
});

const createInitialState = (): Record<string, ApiConfig> => {
  const defaults = getDefaultEnabledApis();
  const state: Record<string, ApiConfig> = {};

  // Initialize all APIs as disabled
  for (const api of EXTERNAL_APIS) {
    state[api.id] = {
      ...createDefaultConfig(),
      // Enable default APIs
      enabled:
        (api.mode === 'trade' && defaults.trade.includes(api.id)) ||
        (api.mode === 'research' && defaults.research.includes(api.id)) ||
        (api.mode === 'threat' && defaults.threat.includes(api.id)) ||
        (api.mode === 'image' && defaults.image.includes(api.id)) ||
        (Array.isArray(api.mode) && api.mode.some(m => defaults[m]?.includes(api.id))),
    };
  }

  return state;
};

export const useExternalApisStore = create<ExternalApisState>()(
  persist(
    (set, get) => ({
      apis: createInitialState(),

      initialize: () => {
        const current = get().apis;
        const initial = createInitialState();

        // Merge: keep existing configs, add new APIs
        const merged: Record<string, ApiConfig> = { ...initial };
        for (const [id, config] of Object.entries(current)) {
          if (merged[id]) {
            // Preserve user settings
            merged[id] = {
              ...merged[id],
              enabled: config.enabled,
              apiKey: config.apiKey,
              health: config.health,
            };
          } else {
            // Keep old APIs that might have been removed
            merged[id] = config;
          }
        }

        set({ apis: merged });
      },

      setApiEnabled: (apiId, enabled) =>
        set(state => ({
          apis: {
            ...state.apis,
            [apiId]: {
              ...(state.apis[apiId] ?? createDefaultConfig()),
              enabled,
            },
          },
        })),

      setApiKey: (apiId, key) =>
        set(state => ({
          apis: {
            ...state.apis,
            [apiId]: {
              ...(state.apis[apiId] ?? createDefaultConfig()),
              apiKey: key,
            },
          },
        })),

      clearApiKey: apiId =>
        set(state => ({
          apis: {
            ...state.apis,
            [apiId]: {
              ...(state.apis[apiId] ?? createDefaultConfig()),
              apiKey: undefined,
            },
          },
        })),

      updateHealth: (apiId, update) =>
        set(state => {
          const current = state.apis[apiId] ?? createDefaultConfig();
          return {
            apis: {
              ...state.apis,
              [apiId]: {
                ...current,
                health: {
                  ...current.health,
                  ...update,
                },
              },
            },
          };
        }),

      recordSuccess: (apiId, latency) =>
        set(state => {
          const current = state.apis[apiId] ?? createDefaultConfig();
          const health = current.health;
          const newRequestCount = health.requestCount + 1;

          // Calculate running average latency
          const avgLatency = health.avgLatency
            ? (health.avgLatency * health.requestCount + latency) / newRequestCount
            : latency;

          return {
            apis: {
              ...state.apis,
              [apiId]: {
                ...current,
                health: {
                  ...health,
                  lastSuccess: Date.now(),
                  requestCount: newRequestCount,
                  avgLatency,
                  // Reset error count on success
                  errorCount: 0,
                },
              },
            },
          };
        }),

      recordError: apiId =>
        set(state => {
          const current = state.apis[apiId] ?? createDefaultConfig();
          const health = current.health;
          const now = Date.now();

          // Reset error count if last error was > 1 hour ago
          const oneHourAgo = now - 60 * 60 * 1000;
          const errorCount =
            health.lastError && health.lastError > oneHourAgo ? health.errorCount + 1 : 1;

          return {
            apis: {
              ...state.apis,
              [apiId]: {
                ...current,
                health: {
                  ...health,
                  lastError: now,
                  errorCount,
                },
              },
            },
          };
        }),

      getApiConfig: apiId => {
        return get().apis[apiId];
      },

      getEnabledApisForMode: mode => {
        const state = get();
        return EXTERNAL_APIS.filter(api => {
          const config = state.apis[api.id];
          if (!config?.enabled) return false;

          if (Array.isArray(api.mode)) {
            return api.mode.includes(mode);
          }
          return api.mode === mode;
        });
      },

      reset: () => {
        set({ apis: createInitialState() });
      },
    }),
    {
      name: 'omnibrowser:external-apis-v1',
      version: 1,
      // Don't persist API keys in localStorage (should use secure storage in production)
      partialize: state => ({
        apis: Object.fromEntries(
          Object.entries(state.apis).map(([id, config]) => [
            id,
            {
              enabled: config.enabled,
              // apiKey is NOT persisted for security
              health: config.health,
            },
          ])
        ),
      }),
    }
  )
);
