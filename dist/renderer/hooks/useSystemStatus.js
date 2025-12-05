/**
 * useSystemStatus Hook
 * Hook for fetching system status with auto-refresh
 */
import { useState, useEffect } from 'react';
import { ipc } from '../lib/ipc-typed';
import { isElectronRuntime, isTauriRuntime } from '../lib/env';
export function useSystemStatus() {
    const [status, setStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchStatus = async () => {
        try {
            setIsLoading(true);
            const data = await ipc.system.getStatus();
            setStatus(data);
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch system status'));
            console.error('[useSystemStatus] Failed to fetch status:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        // Skip backend status checks in web mode - backend is optional
        const isWebMode = !isElectronRuntime() && !isTauriRuntime();
        if (isWebMode) {
            setIsLoading(false);
            return;
        }
        // Fetch immediately
        fetchStatus();
        // Then refresh every 5 seconds
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);
    return {
        data: status,
        isLoading,
        error,
        refetch: fetchStatus,
    };
}
