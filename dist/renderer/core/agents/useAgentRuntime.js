import { useEffect, useState, useCallback } from 'react';
import { agentRuntime } from './runtime';
export function useAgentRuns(limit = 10) {
    const [runs, setRuns] = useState([]);
    useEffect(() => {
        const update = (run) => {
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
export function useAgentExecutor(agentId) {
    return useCallback((input) => agentRuntime.execute({ ...input, agentId }), [agentId]);
}
