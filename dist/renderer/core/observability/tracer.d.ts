/**
 * Execution Tracer - Tier 2
 * Trace AI agent execution for debugging and observability
 */
export interface TraceSpan {
    id: string;
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    tags?: Record<string, string | number | boolean>;
    children: TraceSpan[];
    error?: string;
}
export declare class Tracer {
    private spans;
    private activeSpans;
    /**
     * Start a trace span
     */
    startSpan(name: string, tags?: Record<string, string | number | boolean>): string;
    /**
     * End a trace span
     */
    endSpan(spanId: string, error?: string): void;
    /**
     * Get trace for a span
     */
    getTrace(spanId: string): TraceSpan | undefined;
    /**
     * Get all root spans
     */
    getRootSpans(): TraceSpan[];
    /**
     * Clear all traces
     */
    clear(): void;
}
export declare const tracer: Tracer;
/**
 * Trace a function execution
 */
export declare function traceFunction<T>(name: string, fn: () => T | Promise<T>, tags?: Record<string, string | number | boolean>): Promise<T>;
