/**
 * React Hook for Research Agent
 * Provides easy access to research agent pipeline with loading states
 */

import { useState, useCallback } from 'react';
import { executeResearchAgent, planResearchTask, type ResearchAgentResult, type ResearchAgentOptions } from '../services/researchAgent';
import { toast } from '../utils/toast';

export interface UseResearchAgentReturn {
  execute: (query: string, options?: ResearchAgentOptions) => Promise<ResearchAgentResult | null>;
  plan: (query: string) => Array<{ step: string; description: string }>;
  isLoading: boolean;
  error: string | null;
  lastResult: ResearchAgentResult | null;
}

/**
 * Hook for using research agent
 */
export function useResearchAgent(): UseResearchAgentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ResearchAgentResult | null>(null);

  const execute = useCallback(
    async (query: string, options?: ResearchAgentOptions): Promise<ResearchAgentResult | null> => {
      if (!query || query.trim().length < 2) {
        setError('Query must be at least 2 characters');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await executeResearchAgent(query, options);

        if (!result.success) {
          setError(result.error || 'Research failed');
          toast.error(result.error || 'Research agent failed');
          setLastResult(result);
          return result;
        }

        setLastResult(result);
        toast.success(`Research completed in ${result.latency_ms}ms`);
        return result;
      } catch (err: any) {
        const errorMessage = err.message || 'Research agent request failed';
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const plan = useCallback((query: string) => {
    return planResearchTask(query);
  }, []);

  return {
    execute,
    plan,
    isLoading,
    error,
    lastResult,
  };
}


