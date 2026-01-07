/**
 * Sentry Integration for Orchestrator (Week 4)
 * Production-grade error tracking, performance monitoring, and alerting
 */

// Sentry packages are optional - gracefully handle if not installed
let Sentry: any;
let ProfilingIntegration: any;

try {
  Sentry = require('@sentry/node');
  const profiling = require('@sentry/profiling-node');
  ProfilingIntegration = profiling.ProfilingIntegration;
} catch {
  console.warn('[Sentry] Packages not installed - monitoring disabled');
  Sentry = null;
  ProfilingIntegration = null;
}

export interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  releaseVersion?: string;
  enabled?: boolean;
}

export interface TaskResult {
  taskId: string;
  status: 'success' | 'failure' | 'skipped';
  error?: string;
  retryCount?: number;
  data?: any;
}

export interface ExecutionResult {
  status: 'completed' | 'partial' | 'failed';
  totalDurationMs: number;
  successRate: number;
  taskResults: TaskResult[];
}

export class OrchestratorSentry {
  private initialized = false;
  private config: SentryConfig;

  constructor(config: SentryConfig) {
    this.config = {
      ...config,
      enabled: config.enabled !== false, // Default to enabled
      tracesSampleRate: config.tracesSampleRate ?? 0.1, // 10% sampling
      profilesSampleRate: config.profilesSampleRate ?? 0.1, // 10% profiling
    };
    console.log(`[Sentry] Configured for environment: ${this.config.environment}`);
  }

  /**
   * Initialize Sentry with production client
   */
  async initialize(): Promise<void> {
    if (!Sentry) {
      console.log('[Sentry] Package not installed - monitoring disabled');
      return;
    }

    if (!this.config.enabled) {
      console.log('[Sentry] Disabled by configuration');
      return;
    }

    if (!this.config.dsn) {
      console.warn('[Sentry] No DSN provided, error tracking disabled');
      return;
    }

    try {
      const integrations = ProfilingIntegration ? [new ProfilingIntegration()] : [];

      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.releaseVersion,

        // Performance monitoring
        tracesSampleRate: this.config.tracesSampleRate,
        profilesSampleRate: this.config.profilesSampleRate,

        // Integrations
        integrations,

        // Filter sensitive data
        beforeSend(event: any, _hint: any) {
          // Remove sensitive information
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers;
          }
          return event;
        },

        // Ignore certain errors
        ignoreErrors: ['NetworkError', 'AbortError', 'TimeoutError'],
      });

      this.initialized = true;
      console.log('[Sentry] Initialized successfully');
    } catch (error) {
      console.error('[Sentry] Failed to initialize:', error);
    }
  }

  /**
   * Capture plan execution error
   */
  captureExecutionError(
    planId: string,
    error: Error,
    context: {
      userId: string;
      agentType: string;
      taskCount: number;
      taskId?: string;
    }
  ): void {
    if (!this.initialized) return;

    console.error('[Sentry] Capturing execution error:', {
      planId,
      error: error.message,
      context,
    });

    Sentry.captureException(error, {
      tags: {
        planId,
        agentType: context.agentType,
        taskId: context.taskId || 'unknown',
      },
      contexts: {
        orchestrator: {
          userId: context.userId,
          taskCount: context.taskCount,
        },
      },
      level: 'error',
    });
  }

  /**
   * Track plan execution performance
   */
  captureExecutionMetrics(
    planId: string,
    result: ExecutionResult,
    context: { userId: string; agentType: string }
  ): void {
    if (!this.initialized) return;

    const metrics = {
      duration: result.totalDurationMs,
      successRate: result.successRate,
      taskCount: result.taskResults.length,
      successCount: result.taskResults.filter(r => r.status === 'success').length,
      failureCount: result.taskResults.filter(r => r.status === 'failure').length,
    };

    console.log('[Sentry] Recording execution metrics:', {
      planId,
      ...metrics,
      context,
    });

    // Use breadcrumb for performance metrics
    Sentry.addBreadcrumb({
      category: 'orchestrator.execution',
      message: `Plan ${planId} executed`,
      level: result.status === 'completed' ? 'info' : 'warning',
      data: {
        planId,
        ...metrics,
        agentType: context.agentType,
      },
    });

    // Track performance transaction
    const transaction = Sentry.startTransaction({
      op: 'plan.execution',
      name: `Execute Plan: ${context.agentType}`,
      tags: {
        planId,
        agentType: context.agentType,
        status: result.status,
      },
    });

    transaction.setMeasurement('duration', result.totalDurationMs, 'millisecond');
    transaction.setMeasurement('task_count', result.taskResults.length, 'none');
    transaction.setMeasurement('success_rate', result.successRate, 'ratio');
    transaction.finish();
  }

  /**
   * Track task-level failures
   */
  captureTaskFailure(
    planId: string,
    result: TaskResult,
    context: { userId: string; taskAction: string }
  ): void {
    if (!this.initialized) return;

    console.error('[Sentry] Capturing task failure:', {
      planId,
      taskId: result.taskId,
      error: result.error,
      context,
    });

    const error = new Error(result.error || 'Task failed');
    error.name = 'TaskExecutionError';

    Sentry.captureException(error, {
      tags: {
        planId,
        taskId: result.taskId,
        taskAction: context.taskAction,
      },
      contexts: {
        task: {
          action: context.taskAction,
          retries: result.retryCount || 0,
          status: result.status,
        },
      },
      level: 'warning',
    });
  }

  /**
   * Track RBAC violations
   */
  captureAuthorizationFailure(userId: string, action: string, resource: string): void {
    if (!this.initialized) return;

    console.warn('[Sentry] Authorization failure:', { userId, action, resource });

    Sentry.captureMessage(`Authorization failure: ${action} on ${resource}`, {
      level: 'warning',
      tags: {
        userId: userId.substring(0, 8), // Truncate for privacy
        action,
        resource,
        type: 'rbac_violation',
      },
      contexts: {
        auth: {
          userId,
          action,
          resource,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Track queue-related errors (Week 3 Bull integration)
   */
  captureQueueError(
    jobId: string,
    error: Error,
    context: {
      planId: string;
      attemptNumber?: number;
      queueName?: string;
    }
  ): void {
    if (!this.initialized) return;

    console.error('[Sentry] Queue error:', { jobId, error: error.message, context });

    Sentry.captureException(error, {
      tags: {
        jobId,
        planId: context.planId,
        queueName: context.queueName || 'plans:execute',
        attemptNumber: context.attemptNumber || 1,
      },
      contexts: {
        queue: {
          jobId,
          planId: context.planId,
          attemptNumber: context.attemptNumber,
        },
      },
      level: 'error',
    });
  }

  /**
   * Create span for distributed tracing
   */
  startSpan(
    name: string,
    context?: Record<string, any>
  ): {
    end: () => void;
    setTag: (key: string, value: any) => void;
    setData: (key: string, value: any) => void;
  } {
    if (!this.initialized) {
      return {
        end: () => {},
        setTag: () => {},
        setData: () => {},
      };
    }

    const span = Sentry.startTransaction({
      op: 'orchestrator.operation',
      name,
      data: context,
    });

    return {
      end: () => {
        span.finish();
        console.log(`[Sentry] Span "${name}" completed`);
      },
      setTag: (key: string, value: any) => {
        span.setTag(key, value);
      },
      setData: (key: string, value: any) => {
        span.setData(key, value);
      },
    };
  }

  /**
   * Set user context for error tracking
   */
  setUser(userId: string, metadata?: Record<string, any>): void {
    if (!this.initialized) return;

    Sentry.setUser({
      id: userId,
      ...metadata,
    });
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (!this.initialized) return;
    Sentry.setUser(null);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    if (!this.initialized) return;

    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Capture exception with context
   */
  captureException(
    error: Error,
    context?: { tags?: Record<string, string>; level?: string }
  ): void {
    if (!this.initialized) return;

    Sentry.captureException(error, {
      tags: context?.tags,
      level: (context?.level as any) || 'error',
    });
  }

  /**
   * Flush events (useful for serverless/worker shutdown)
   */
  async flush(timeout = 2000): Promise<boolean> {
    if (!this.initialized) return true;

    try {
      return await Sentry.flush(timeout);
    } catch (error) {
      console.error('[Sentry] Flush error:', error);
      return false;
    }
  }

  /**
   * Close Sentry client
   */
  async close(timeout = 2000): Promise<boolean> {
    if (!this.initialized) return true;

    try {
      await Sentry.close(timeout);
      this.initialized = false;
      console.log('[Sentry] Client closed');
      return true;
    } catch (error) {
      console.error('[Sentry] Close error:', error);
      return false;
    }
  }
}

let sentryInstance: OrchestratorSentry | null = null;

export function initSentry(config: SentryConfig): OrchestratorSentry {
  sentryInstance = new OrchestratorSentry(config);
  sentryInstance.initialize();
  return sentryInstance;
}

export function getSentry(): OrchestratorSentry | null {
  return sentryInstance;
}

export default OrchestratorSentry;
