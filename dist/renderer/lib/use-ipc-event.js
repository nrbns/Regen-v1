/**
 * React hook for IPC events
 * Separate file to avoid require() issues in browser
 */
import { useEffect } from 'react';
import { ipcEvents } from './ipc-events';
export function useIPCEvent(event, callback, deps = []) {
    useEffect(() => {
        const unsubscribe = ipcEvents.on(event, callback);
        return unsubscribe;
    }, [event, ...deps]);
}
