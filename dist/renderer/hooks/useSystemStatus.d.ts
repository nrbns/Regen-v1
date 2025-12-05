/**
 * useSystemStatus Hook
 * Hook for fetching system status with auto-refresh
 */
export interface SystemStatus {
    redisConnected: boolean;
    redixAvailable: boolean;
    workerState: 'running' | 'stopped' | 'error';
    vpn: {
        connected: boolean;
        profile?: string;
        type?: string;
    };
    tor: {
        running: boolean;
        bootstrapped: boolean;
    };
    mode: string;
    uptime: number;
    memoryUsage: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
    };
}
export declare function useSystemStatus(): {
    data: SystemStatus | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
};
