/**
 * Redix Policy Engine - Resource management and optimization policies
 * Applies rules for tab suspension, throttling, and prefetching based on system state
 */
export type PolicyMode = 'default' | 'performance' | 'balanced' | 'battery';
export interface PolicyRules {
    suspendBackgroundTabs: boolean;
    suspendAfterMinutes: number;
    throttleHeavyTabs: boolean;
    memoryThreshold: number;
    cpuThreshold: number;
    batteryThreshold: number;
    prefetchEnabled: boolean;
    prefetchOnWifiOnly: boolean;
}
interface SystemMetrics {
    memoryUsage?: number;
    cpuUsage?: number;
    batteryLevel?: number;
    isWifi?: boolean;
    isBatteryLow?: boolean;
}
declare class PolicyEngine {
    private currentMode;
    private metrics;
    private activePolicies;
    constructor();
    /**
     * Get policy rules for a mode
     */
    getPolicyRules(mode?: PolicyMode): PolicyRules;
    /**
     * Set active policy mode
     */
    setMode(mode: PolicyMode): void;
    /**
     * Get current policy mode
     */
    getMode(): PolicyMode;
    /**
     * Update system metrics
     */
    updateMetrics(metrics: Partial<SystemMetrics>): void;
    /**
     * Initialize metrics from system APIs
     */
    private initializeMetrics;
    /**
     * Evaluate policies based on current metrics
     */
    private evaluatePolicies;
    /**
     * Check if an action is allowed by current policies
     */
    shouldAllow(action: string, _context?: Record<string, any>): boolean;
    /**
     * Get recommendations based on current metrics
     */
    getRecommendations(): string[];
    /**
     * Get current metrics
     */
    getMetrics(): SystemMetrics;
    /**
     * Get active policies
     */
    getActivePolicies(): PolicyRules;
}
export declare const policyEngine: PolicyEngine;
export declare const setPolicyMode: (mode: PolicyMode) => void;
export declare const getPolicyMode: () => PolicyMode;
export declare const updatePolicyMetrics: (metrics: Partial<SystemMetrics>) => void;
export declare const shouldAllowPolicy: (action: string, context?: Record<string, any>) => boolean;
export declare const getPolicyRecommendations: () => string[];
export declare const getPolicyMetrics: () => SystemMetrics;
export declare const getPolicyRules: (mode?: PolicyMode) => PolicyRules;
export {};
