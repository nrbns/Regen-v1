/**
 * React Hook for Production Search
 * Provides search and summarize functionality with loading states and error handling
 */

import { useState, useCallback, useRef } from 'react';
import {
  productionSearch,
  productionSummarize,
  productionSearchAndSummarize,
  type ProductionSearchResponse,
  type ProductionSummarizeResponse,
  type SearchOptions,
  type SummarizeOptions,
} from '../services/productionSearch';
import { toast } from '../utils/toast';

interface UseProductionSearchReturn {
  // Search
  search: (query: string, options?: SearchOptions) => Promise<ProductionSearchResponse | null>;
  searchResults: ProductionSearchResponse | null;
  isSearching: boolean;
  searchError: string | null;

  // Summarize
  summarize: (
    urls: string | string[],
    options?: SummarizeOptions
  ) => Promise<ProductionSummarizeResponse | null>;
  summarizeResults: ProductionSummarizeResponse | null;
  isSummarizing: boolean;
  summarizeError: string | null;

  // Combined
  searchAndSummarize: (
    query: string,
    options?: SearchOptions & SummarizeOptions & { summarizeTopN?: number }
  ) => Promise<{
    search: ProductionSearchResponse;
    summaries?: ProductionSummarizeResponse;
  } | null>;
  isSearchingAndSummarizing: boolean;

  // Utilities
  clearResults: () => void;
  clearErrors: () => void;
}

export function useProductionSearch(): UseProductionSearchReturn {
  const [searchResults, setSearchResults] = useState<ProductionSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [summarizeResults, setSummarizeResults] = useState<ProductionSummarizeResponse | null>(
    null
  );
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);

  const [isSearchingAndSummarizing, setIsSearchingAndSummarizing] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (query: string, options?: SearchOptions): Promise<ProductionSearchResponse | null> => {
      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const result = await productionSearch(query, options);
        setSearchResults(result);

        // Show toast for cached results
        if (result.cached) {
          toast.success(`Search results (cached) - ${result.latency_ms}ms`, { duration: 2000 });
        }

        return result;
      } catch (error: any) {
        const errorMessage = error.message || 'Search failed';
        setSearchError(errorMessage);
        toast.error(`Search failed: ${errorMessage}`, { duration: 4000 });
        console.error('[useProductionSearch] Search error:', error);
        return null;
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const summarize = useCallback(
    async (
      urls: string | string[],
      options?: SummarizeOptions
    ): Promise<ProductionSummarizeResponse | null> => {
      setIsSummarizing(true);
      setSummarizeError(null);

      try {
        const result = await productionSummarize(urls, options);
        setSummarizeResults(result);

        // Show toast for cached results
        if (result.cached) {
          toast.success(`Summary generated (cached) - ${result.latency_ms}ms`, { duration: 2000 });
        } else {
          toast.success(`Summary generated - ${result.latency_ms}ms`, { duration: 2000 });
        }

        return result;
      } catch (error: any) {
        const errorMessage = error.message || 'Summarization failed';
        setSummarizeError(errorMessage);
        toast.error(`Summarization failed: ${errorMessage}`, { duration: 4000 });
        console.error('[useProductionSearch] Summarize error:', error);
        return null;
      } finally {
        setIsSummarizing(false);
      }
    },
    []
  );

  const searchAndSummarize = useCallback(
    async (
      query: string,
      options?: SearchOptions & SummarizeOptions & { summarizeTopN?: number }
    ): Promise<{
      search: ProductionSearchResponse;
      summaries?: ProductionSummarizeResponse;
    } | null> => {
      setIsSearchingAndSummarizing(true);
      setSearchError(null);
      setSummarizeError(null);

      try {
        const result = await productionSearchAndSummarize(query, options);
        setSearchResults(result.search);
        if (result.summaries) {
          setSummarizeResults(result.summaries);
        }

        toast.success(
          `Search complete${result.summaries ? ' with summaries' : ''} - ${result.search.latency_ms}ms`,
          { duration: 3000 }
        );

        return result;
      } catch (error: any) {
        const errorMessage = error.message || 'Search and summarize failed';
        setSearchError(errorMessage);
        toast.error(`Failed: ${errorMessage}`, { duration: 4000 });
        console.error('[useProductionSearch] Search and summarize error:', error);
        return null;
      } finally {
        setIsSearchingAndSummarizing(false);
      }
    },
    []
  );

  const clearResults = useCallback(() => {
    setSearchResults(null);
    setSummarizeResults(null);
  }, []);

  const clearErrors = useCallback(() => {
    setSearchError(null);
    setSummarizeError(null);
  }, []);

  return {
    // Search
    search,
    searchResults,
    isSearching,
    searchError,

    // Summarize
    summarize,
    summarizeResults,
    isSummarizing,
    summarizeError,

    // Combined
    searchAndSummarize,
    isSearchingAndSummarizing,

    // Utilities
    clearResults,
    clearErrors,
  };
}
