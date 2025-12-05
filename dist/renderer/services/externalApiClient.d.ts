/**
 * Base API Client for External APIs
 *
 * Handles:
 * - Health tracking (success/error rates, latency)
 * - API key management
 * - CORS/proxy handling
 * - Rate limiting
 * - Fallback chains
 */
export interface ApiRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
}
export interface ApiResponse<T = unknown> {
    data: T;
    status: number;
    headers: Record<string, string>;
}
export declare class ApiError extends Error {
    apiId: string;
    status: number;
    message: string;
    response?: unknown | undefined;
    constructor(apiId: string, status: number, message: string, response?: unknown | undefined);
}
/**
 * Base API Client
 */
export declare class ExternalApiClient {
    private static instance;
    private constructor();
    static getInstance(): ExternalApiClient;
    /**
     * Make an API request with health tracking
     */
    request<T = unknown>(apiId: string, endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
    /**
     * Try multiple APIs in order (fallback chain)
     */
    requestWithFallback<T = unknown>(apiIds: string[], endpoint: string, options?: ApiRequestOptions): Promise<{
        apiId: string;
        response: ApiResponse<T>;
    }>;
}
/**
 * Get the singleton API client instance
 */
export declare function getApiClient(): ExternalApiClient;
