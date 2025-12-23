export interface SentryLike {
  addBreadcrumb: (message: string, category?: string, data?: Record<string, any>) => void;
  captureException?: (error: unknown, context?: any) => void;
  startSpan?: (...args: any[]) => any;
  captureExecutionMetrics?: (...args: any[]) => void;
  captureExecutionError?: (...args: any[]) => void;
  captureQueueError?: (...args: any[]) => void;
}

export function getSentry(): SentryLike | undefined {
  return undefined; // No-op in renderer/services context
}
