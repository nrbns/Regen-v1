/**
 * useApi Hook for Mobile
 * 
 * React hook for making API calls from mobile components.
 * Provides loading states, error handling, and automatic retries.
 */

import { useState, useEffect, useCallback } from 'react';
import { mobileApiRequest, checkMobileApiHealth } from '../utils/apiClient';

interface UseApiOptions {
  immediate?: boolean;
  retries?: number;
  retryDelay?: number;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isConnected: boolean;
}

/**
 * Hook for making API calls
 */
export function useApi<T>(
  endpoint: string | null,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const { immediate = true, retries = 2, retryDelay = 1000 } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check API health on mount
  useEffect(() => {
    checkMobileApiHealth()
      .then(connected => setIsConnected(connected))
      .catch(() => setIsConnected(false));
  }, []);

  const fetchData = useCallback(async () => {
    if (!endpoint) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts <= retries) {
      try {
        const result = await mobileApiRequest<T>(endpoint);
        setData(result);
        setIsConnected(true);
        setLoading(false);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        attempts++;

        if (attempts <= retries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    setError(lastError);
    setIsConnected(false);
    setLoading(false);
  }, [endpoint, retries, retryDelay]);

  useEffect(() => {
    if (immediate && endpoint) {
      fetchData();
    }
  }, [endpoint, immediate, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isConnected,
  };
}

/**
 * Hook for POST/PUT/DELETE API calls
 */
export function useApiMutation<TRequest, TResponse>(
  endpoint: string
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (data: TRequest, method: 'POST' | 'PUT' | 'DELETE' = 'POST'): Promise<TResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await mobileApiRequest<TResponse>(endpoint, {
          method,
          body: data,
        });
        setLoading(false);
        return result;
      } catch (err) {
        const apiError = err instanceof Error ? err : new Error(String(err));
        setError(apiError);
        setLoading(false);
        return null;
      }
    },
    [endpoint]
  );

  return {
    mutate,
    loading,
    error,
  };
}

