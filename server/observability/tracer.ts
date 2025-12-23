/**
 * Distributed Tracing with OpenTelemetry (Week 8)
 * Enables end-to-end observability across orchestrator components
 */

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  timestamp: Date;
}

export interface TraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tags: Record<string, string | number>;
  events: TraceEvent[];
  status: 'unset' | 'ok' | 'error';
  error?: Error;
}

export interface TraceEvent {
  name: string;
  timestamp: Date;
  attributes: Record<string, any>;
}

export class DistributedTracer {
  private spans: Map<string, TraceSpan> = new Map();
  private activeSpan: TraceSpan | null = null;

  /**
   * Start new trace
   */
  startTrace(operationName: string): TraceContext {
    const traceId = this.generateId();
    const spanId = this.generateId();

    const span: TraceSpan = {
      spanId,
      traceId,
      name: operationName,
      startTime: new Date(),
      tags: {},
      events: [],
      status: 'unset',
    };

    this.spans.set(spanId, span);
    this.activeSpan = span;

    return { traceId, spanId, timestamp: new Date() };
  }

  /**
   * Create child span
   */
  startChildSpan(parentSpanId: string, operationName: string): TraceContext {
    const parentSpan = this.spans.get(parentSpanId);
    if (!parentSpan) throw new Error(`Parent span not found: ${parentSpanId}`);

    const spanId = this.generateId();
    const span: TraceSpan = {
      spanId,
      traceId: parentSpan.traceId,
      parentSpanId,
      name: operationName,
      startTime: new Date(),
      tags: {},
      events: [],
      status: 'unset',
    };

    this.spans.set(spanId, span);
    const _previousSpan = this.activeSpan;
    this.activeSpan = span;

    return {
      traceId: parentSpan.traceId,
      spanId,
      parentSpanId,
      timestamp: new Date(),
    };
  }

  /**
   * Add tag to current span
   */
  setTag(key: string, value: string | number): void {
    if (!this.activeSpan) return;
    this.activeSpan.tags[key] = value;
  }

  /**
   * Add event to current span
   */
  addEvent(name: string, attributes?: Record<string, any>): void {
    if (!this.activeSpan) return;
    this.activeSpan.events.push({
      name,
      timestamp: new Date(),
      attributes: attributes || {},
    });
  }

  /**
   * End current span
   */
  endSpan(spanId: string, status: 'ok' | 'error' = 'ok', error?: Error): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
    span.status = status;
    span.error = error;

    console.log(`[Trace] Span "${span.name}" completed in ${span.duration}ms (${status})`);
  }

  /**
   * Get trace
   */
  getTrace(traceId: string): TraceSpan[] {
    return Array.from(this.spans.values()).filter(s => s.traceId === traceId);
  }

  /**
   * Export trace as JSON
   */
  exportTrace(traceId: string): any {
    const spans = this.getTrace(traceId);
    return {
      traceId,
      spanCount: spans.length,
      spans: spans.map(s => ({
        spanId: s.spanId,
        parentSpanId: s.parentSpanId,
        name: s.name,
        duration: s.duration,
        status: s.status,
        tags: s.tags,
        events: s.events,
      })),
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 16);
  }
}

export default DistributedTracer;
