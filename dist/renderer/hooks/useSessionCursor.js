/**
 * useSessionCursor Hook
 * React hook for managing session cursor state via Redis
 * Replaces file-based .cursor access
 */
import { useState, useEffect, useCallback } from 'react';
import { useSessionSync } from './useSessionSync';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export function useSessionCursor() {
    const { sessionId } = useSessionSync();
    const [cursor, setCursor] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Generate worker ID for this tab
    const workerId = `tab-${typeof window !== 'undefined' ? window.location.hash : 'unknown'}-${Date.now()}`;
    /**
     * Fetch cursor from Redis API
     */
    const fetchCursor = useCallback(async () => {
        if (!sessionId) {
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE}/api/session/${sessionId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                if (response.status === 503) {
                    throw new Error('Sync service not available');
                }
                throw new Error(`Failed to fetch cursor: ${response.statusText}`);
            }
            const data = await response.json();
            setCursor(data.cursor || null);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            setCursor(null);
        }
        finally {
            setIsLoading(false);
        }
    }, [sessionId]);
    /**
     * Update cursor in Redis
     */
    const updateCursor = useCallback(async (newCursor) => {
        if (!sessionId) {
            throw new Error('No session ID');
        }
        try {
            setError(null);
            const response = await fetch(`${API_BASE}/api/session/${sessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cursor: newCursor,
                    workerId,
                }),
            });
            if (!response.ok) {
                if (response.status === 409) {
                    throw new Error('Session locked by another tab');
                }
                if (response.status === 503) {
                    throw new Error('Sync service not available');
                }
                throw new Error(`Failed to update cursor: ${response.statusText}`);
            }
            const data = await response.json();
            setCursor(data.cursor);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        }
    }, [sessionId, workerId]);
    /**
     * Refresh cursor
     */
    const refreshCursor = useCallback(async () => {
        await fetchCursor();
    }, [fetchCursor]);
    // Fetch cursor on mount and when sessionId changes
    useEffect(() => {
        fetchCursor();
    }, [fetchCursor]);
    return {
        cursor,
        isLoading,
        error,
        updateCursor,
        refreshCursor,
    };
}
