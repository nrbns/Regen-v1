/**
 * useRedix Hook for Mobile
 * 
 * React hook for using Redix AI engine from mobile components.
 * Provides query, streaming, and eco-scoring functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import { mobileRedix, type RedixQueryRequest, type RedixQueryResponse, type EcoScoreRequest } from '../utils/redixClient';

interface UseRedixQueryOptions {
  immediate?: boolean;
}

interface UseRedixQueryResult {
  data: RedixQueryResponse | null;
  loading: boolean;
  error: Error | null;
  query: (request: RedixQueryRequest) => Promise<void>;
  isConnected: boolean;
}

/**
 * Hook for querying Redix AI engine
 */
export function useRedixQuery(
  initialRequest: RedixQueryRequest | null = null,
  options: UseRedixQueryOptions = {}
): UseRedixQueryResult {
  const { immediate = false } = options;
  
  const [data, setData] = useState<RedixQueryResponse | null>(null);
  const [loading, setLoading] = useState(immediate && initialRequest !== null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check Redix health on mount
  useEffect(() => {
    mobileRedix.checkHealth()
      .then(connected => setIsConnected(connected))
      .catch(() => setIsConnected(false));
  }, []);

  const query = useCallback(async (request: RedixQueryRequest) => {
    setLoading(true);
    setError(null);

    try {
      const result = await mobileRedix.query(request);
      setData(result);
      setIsConnected(true);
    } catch (err) {
      const queryError = err instanceof Error ? err : new Error(String(err));
      setError(queryError);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate && initialRequest) {
      query(initialRequest);
    }
  }, [immediate, initialRequest, query]);

  return {
    data,
    loading,
    error,
    query,
    isConnected,
  };
}

/**
 * Hook for streaming Redix queries
 */
export function useRedixStream() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const stream = useCallback(
    (
      request: RedixQueryRequest,
      onComplete?: (response: RedixQueryResponse) => void
    ): { cancel: () => void } => {
      setLoading(true);
      setError(null);
      setStreamingText('');
      setIsComplete(false);

      return mobileRedix.streamQuery(
        request,
        (token: string) => {
          setStreamingText(prev => prev + token);
        },
        (response: RedixQueryResponse) => {
          setLoading(false);
          setIsComplete(true);
          onComplete?.(response);
        },
        (err: Error) => {
          setLoading(false);
          setIsComplete(true);
          setError(err);
        }
      );
    },
    []
  );

  return {
    stream,
    streamingText,
    loading,
    error,
    isComplete,
  };
}

/**
 * Hook for eco scoring
 */
export function useEcoScore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const calculateScore = useCallback(async (request: EcoScoreRequest) => {
    setLoading(true);
    setError(null);

    try {
      const result = await mobileRedix.getEcoScore(request);
      setLoading(false);
      return result;
    } catch (err) {
      const scoreError = err instanceof Error ? err : new Error(String(err));
      setError(scoreError);
      setLoading(false);
      throw scoreError;
    }
  }, []);

  return {
    calculateScore,
    loading,
    error,
  };
}

