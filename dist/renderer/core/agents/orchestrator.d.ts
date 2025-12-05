/**
 * Agent Orchestration Layer - Tier 2
 * Central coordination for multi-agent tasks, job queue, and context management
 */
import type { AgentExecutionInput, AgentExecutionResult } from './types';
export interface Job {
    id: string;
    agentId?: string;
    input: AgentExecutionInput;
    priority: number;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    result?: AgentExecutionResult;
    error?: string;
    retryCount: number;
    maxRetries: number;
}
export interface AgentContext {
    jobId: string;
    runId: string;
    memory: Record<string, unknown>;
    sharedState: Record<string, unknown>;
}
declare class AgentOrchestrator {
    private jobQueue;
    private runningJobs;
    private contextStore;
    private rateLimits;
    private maxConcurrentJobs;
    /**
     * Enqueue a job
     */
    enqueue(input: AgentExecutionInput & {
        agentId?: string;
        priority?: number;
        maxRetries?: number;
    }): string;
    /**
     * Process job queue
     */
    private processQueue;
    /**
     * Execute a job
     */
    private executeJob;
    /**
     * Check rate limit for agent
     */
    private checkRateLimit;
    /**
     * Cancel a job
     */
    cancel(jobId: string): boolean;
    /**
     * Get job status
     */
    getJob(jobId: string): Job | undefined;
    /**
     * Get all jobs
     */
    getJobs(): Job[];
    /**
     * Get context for job
     */
    getContext(jobId: string): AgentContext | undefined;
    /**
     * Update context
     */
    updateContext(jobId: string, updates: Partial<AgentContext>): void;
}
export declare const agentOrchestrator: AgentOrchestrator;
export {};
