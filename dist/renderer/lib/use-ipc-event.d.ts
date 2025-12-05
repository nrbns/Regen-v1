/**
 * React hook for IPC events
 * Separate file to avoid require() issues in browser
 */
export declare function useIPCEvent<T>(event: string, callback: (data: T) => void, deps?: any[]): void;
