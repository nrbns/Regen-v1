interface MemoryPoolOptions {
    tabCapMB: number;
    maxTotalMB: number;
    rebalanceIntervalMs: number;
    reserveForActiveTabsMB: number;
}
declare class MemoryPool {
    private options;
    private samples;
    private pool;
    private metricsTimer;
    private rebalanceTimer;
    start(options?: Partial<MemoryPoolOptions>): void;
    stop(): void;
    update(partial: Partial<MemoryPoolOptions>): void;
    private pollUsage;
    private rebalance;
    private setCap;
}
export declare const memoryPool: MemoryPool;
export declare function initializeMemoryPool(): void;
export declare function configureMemoryPool(options: Partial<MemoryPoolOptions>): void;
export {};
