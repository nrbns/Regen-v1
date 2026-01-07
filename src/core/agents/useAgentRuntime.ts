import { useEffect, useState, useCallback } from 'react';
import { agentRuntime } from './runtime';
import type { AgentRunRecord, AgentExecutionInput, AgentExecutionResult } from './types';

export function useAgentRuns(limit = 10): AgentRunRecord[] {
  const [runs, setRuns] = useState<AgentRunRecord[]>([]);

  useEffect(() => {
    const update = (run: AgentRunRecord) => {
      setRuns((prev) => {
        const updated = [run, ...prev.filter((r) => r.id !== run.id)];
        return updated.slice(0, limit);
      });
    };
    const unsubscribe = agentRuntime.onRunUpdate(update);
    return unsubscribe;
  }, [limit]);

  return runs;
}

export function useAgentExecutor(agentId?: string) {
  return useCallback(
    (input: AgentExecutionInput & { signal?: AbortSignal }): Promise<AgentExecutionResult> =>
      agentRuntime.execute({ ...input, agentId }),
    [agentId]
  );
}


