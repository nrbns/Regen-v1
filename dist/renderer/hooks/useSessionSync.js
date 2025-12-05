/**
 * useSessionSync Hook
 * Manages session synchronization state
 */
import { useState, useEffect } from 'react';
export function useSessionSync() {
    const [sessionId] = useState(() => {
        // Generate or retrieve session ID
        const stored = sessionStorage.getItem('regenbrowser_session_id');
        if (stored)
            return stored;
        const newId = crypto.randomUUID();
        sessionStorage.setItem('regenbrowser_session_id', newId);
        return newId;
    });
    const [isSynced, setIsSynced] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [syncError, setSyncError] = useState(null);
    const sync = async () => {
        try {
            // Call sync API
            const response = await fetch('/api/sync/full', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            });
            if (!response.ok) {
                throw new Error('Sync failed');
            }
            setIsSynced(true);
            setLastSyncTime(new Date());
            setSyncError(null);
        }
        catch (error) {
            setIsSynced(false);
            setSyncError(error instanceof Error ? error.message : 'Unknown error');
        }
    };
    useEffect(() => {
        // Initial sync
        sync();
        // Periodic sync every 30 seconds
        const interval = setInterval(sync, 30000);
        return () => clearInterval(interval);
    }, [sessionId]);
    return {
        sessionId,
        isSynced,
        lastSyncTime,
        syncError,
        retrySync: sync,
    };
}
function _formatRelativeTime(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    if (seconds < 60)
        return 'just now';
    if (minutes < 60)
        return `${minutes}m ago`;
    return date.toLocaleTimeString();
}
