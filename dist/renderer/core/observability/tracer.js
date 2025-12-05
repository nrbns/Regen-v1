/**
 * Execution Tracer - Tier 2
 * Trace AI agent execution for debugging and observability
 */
import { log } from '../../utils/logger';
export class Tracer {
    spans = new Map();
    activeSpans = [];
    /**
     * Start a trace span
     */
    startSpan(name, tags) {
        const spanId = `span-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const parentId = this.activeSpans[this.activeSpans.length - 1];
        const span = {
            id: spanId,
            name,
            startTime: performance.now(),
            tags,
            children: [],
        };
        // Add as child of parent if exists
        if (parentId) {
            const parent = this.spans.get(parentId);
            if (parent) {
                parent.children.push(span);
            }
        }
        this.spans.set(spanId, span);
        this.activeSpans.push(spanId);
        log.debug(`[Tracer] Started span: ${name}`, { spanId, tags });
        return spanId;
    }
    /**
     * End a trace span
     */
    endSpan(spanId, error) {
        const span = this.spans.get(spanId);
        if (!span) {
            log.warn(`[Tracer] Span not found: ${spanId}`);
            return;
        }
        span.endTime = performance.now();
        span.duration = span.endTime - span.startTime;
        if (error) {
            span.error = error;
        }
        // Remove from active spans
        const index = this.activeSpans.indexOf(spanId);
        if (index !== -1) {
            this.activeSpans.splice(index, 1);
        }
        log.debug(`[Tracer] Ended span: ${span.name}`, { spanId, duration: span.duration, error });
    }
    /**
     * Get trace for a span
     */
    getTrace(spanId) {
        return this.spans.get(spanId);
    }
    /**
     * Get all root spans
     */
    getRootSpans() {
        return Array.from(this.spans.values()).filter(span => {
            // Root span if not a child of any other span
            return !Array.from(this.spans.values()).some(s => s.children.includes(span));
        });
    }
    /**
     * Clear all traces
     */
    clear() {
        this.spans.clear();
        this.activeSpans = [];
    }
}
// Singleton instance
export const tracer = new Tracer();
/**
 * Trace a function execution
 */
export async function traceFunction(name, fn, tags) {
    const spanId = tracer.startSpan(name, tags);
    try {
        const result = await Promise.resolve(fn());
        tracer.endSpan(spanId);
        return result;
    }
    catch (error) {
        tracer.endSpan(spanId, error instanceof Error ? error.message : String(error));
        throw error;
    }
}
