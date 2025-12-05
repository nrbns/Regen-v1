import { type OmniMode, type ExternalAPI } from '../config/externalApis';
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
export declare const useExternalApisStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<ExternalApisState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<ExternalApisState, {
            apis: {
                [k: string]: {
                    enabled: boolean;
                    health: ApiHealthStatus;
                };
            };
        }>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: ExternalApisState) => void) => () => void;
        onFinishHydration: (fn: (state: ExternalApisState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<ExternalApisState, {
            apis: {
                [k: string]: {
                    enabled: boolean;
                    health: ApiHealthStatus;
                };
            };
        }>>;
    };
}>;
export {};
