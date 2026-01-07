/**
 * React hook for IPC events
 * Separate file to avoid require() issues in browser
 */

import { useEffect } from 'react';
import { ipcEvents } from './ipc-events';

export function useIPCEvent<T>(event: string, callback: (data: T) => void, deps: any[] = []) {
  useEffect(() => {
    const unsubscribe = ipcEvents.on<T>(event, callback);
    return unsubscribe;
  }, [event, ...deps]);
}

