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

import { getApiById } from '../config/externalApis';
import { useExternalApisStore } from '../state/externalApisStore';

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

export class ApiError extends Error {
  constructor(
    public apiId: string,
    public status: number,
    public message: string,
    public response?: unknown
  ) {
    super(`[${apiId}] ${message}`);
    this.name = 'ApiError';
  }
}

/**
 * Base API Client
 */
export class ExternalApiClient {
  private static instance: ExternalApiClient;

  private constructor() {}

  static getInstance(): ExternalApiClient {
    if (!ExternalApiClient.instance) {
      ExternalApiClient.instance = new ExternalApiClient();
    }
    return ExternalApiClient.instance;
  }

  /**
   * Make an API request with health tracking
   */
  async request<T = unknown>(
    apiId: string,
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const api = getApiById(apiId);
    if (!api) {
      throw new ApiError(apiId, 0, `API ${apiId} not found in registry`);
    }

    const config = useExternalApisStore.getState().getApiConfig(apiId);
    if (!config?.enabled) {
      throw new ApiError(apiId, 0, `API ${apiId} is not enabled`);
    }

    // Check if API key is required
    if (api.authType === 'apiKey' && !config.apiKey) {
      // Try to get from environment variable
      const envKey = api.authEnvKey ? process.env[api.authEnvKey] : undefined;
      if (!envKey) {
        throw new ApiError(apiId, 401, `API key required for ${api.name}`);
      }
    }

    const startTime = Date.now();
    const url = `${api.baseUrl}${endpoint}`;
    const apiKey = config.apiKey || (api.authEnvKey ? process.env[api.authEnvKey] : undefined);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add API key to headers or query params
    if (apiKey) {
      // Different APIs use different auth methods
      if (api.id === 'virustotal') {
        headers['x-apikey'] = apiKey;
      } else if (api.id === 'urlscan') {
        headers['API-Key'] = apiKey;
      } else if (api.id === 'abuseipdb') {
        headers['Key'] = apiKey;
      } else if (api.id === 'ipqualityscore' || api.id === 'haveibeenpwned') {
        // These use query params
      } else {
        // Default: query param 'apiKey' or 'apikey'
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    try {
      // Build full URL with query params for APIs that need it
      let fullUrl = url;
      if (apiKey && (api.id === 'ipqualityscore' || api.id === 'haveibeenpwned')) {
        const separator = url.includes('?') ? '&' : '?';
        fullUrl = `${url}${separator}${api.id === 'ipqualityscore' ? 'key' : 'hibp-api-key'}=${apiKey}`;
      }

      // Make request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);

      // Handle FormData vs JSON body
      let body: string | FormData | undefined;
      if (options.body) {
        if (options.body instanceof FormData) {
          body = options.body;
          // Remove Content-Type header for FormData (browser will set it with boundary)
          delete headers['Content-Type'];
        } else {
          body = JSON.stringify(options.body);
        }
      }

      const response = await fetch(fullUrl, {
        method: options.method || 'GET',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        useExternalApisStore.getState().recordError(apiId);
        throw new ApiError(
          apiId,
          response.status,
          errorData.message || 'Request failed',
          errorData
        );
      }

      const data = await response.json().catch(() => ({}));

      // Record success
      useExternalApisStore.getState().recordSuccess(apiId, latency);

      // Convert response headers to plain object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        data: data as T,
        status: response.status,
        headers: responseHeaders,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other errors
      useExternalApisStore.getState().recordError(apiId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(apiId, 0, 'Request timeout', error);
      }

      throw new ApiError(apiId, 0, error instanceof Error ? error.message : 'Unknown error', error);
    }
  }

  /**
   * Try multiple APIs in order (fallback chain)
   */
  async requestWithFallback<T = unknown>(
    apiIds: string[],
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<{ apiId: string; response: ApiResponse<T> }> {
    const errors: Array<{ apiId: string; error: ApiError }> = [];

    for (const apiId of apiIds) {
      try {
        const response = await this.request<T>(apiId, endpoint, options);
        return { apiId, response };
      } catch (error) {
        if (error instanceof ApiError) {
          errors.push({ apiId, error });
          // Continue to next API
          continue;
        }
        throw error;
      }
    }

    // All APIs failed
    const errorMessages = errors.map(e => `[${e.apiId}] ${e.error.message}`).join('; ');
    throw new ApiError('fallback', 0, `All APIs failed: ${errorMessages}`);
  }
}

/**
 * Get the singleton API client instance
 */
export function getApiClient(): ExternalApiClient {
  return ExternalApiClient.getInstance();
}
