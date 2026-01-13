/**
 * Realtime Metrics Dashboard
 * Dev mode component showing event bus metrics
 * Helps debug and optimize realtime performance
 */

import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { eventBus } from '../../core/state/eventBus';

export function RealtimeMetricsDashboard() {
  const [metrics, setMetrics] = useState(eventBus.getMetrics());
  const [failedCount, setFailedCount] = useState(eventBus.getFailedEventsCount());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in dev mode
    const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';
    setIsVisible(isDev);

    if (!isDev) return;

    // Update metrics every second
    const interval = setInterval(() => {
      setMetrics(eventBus.getMetrics());
      setFailedCount(eventBus.getFailedEventsCount());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return null;
  }

  const handleReset = () => {
    eventBus.resetMetrics();
    eventBus.clearFailedEvents();
    setMetrics(eventBus.getMetrics());
    setFailedCount(0);
  };

  const successRate =
    metrics.totalEmitted > 0
      ? ((metrics.totalProcessed / metrics.totalEmitted) * 100).toFixed(1)
      : '100.0';

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 md:w-80 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-3 md:p-4 shadow-lg backdrop-blur-sm max-h-[80vh] overflow-y-auto">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--color-primary-500)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Realtime Metrics</h3>
        </div>
        <button
          onClick={handleReset}
          className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          title="Reset metrics"
          aria-label="Reset metrics"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 text-xs">
        {/* Event Counts */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded bg-[var(--surface-hover)] p-2">
            <div className="text-[var(--text-muted)] text-xs">Emitted</div>
            <div className="text-lg font-semibold text-[var(--text-primary)]">{metrics.totalEmitted}</div>
          </div>
          <div className="rounded bg-[var(--surface-hover)] p-2">
            <div className="text-[var(--text-muted)] text-xs">Processed</div>
            <div className="text-lg font-semibold text-[var(--color-success-500)]">{metrics.totalProcessed}</div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="rounded bg-[var(--color-primary-500)]/10 p-2 border border-[var(--color-primary-500)]/20">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)] text-xs">Success Rate</span>
            <span className="font-semibold text-[var(--color-primary-500)]">{successRate}%</span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-[var(--surface-hover)]">
            <div
              className="h-2 rounded-full bg-[var(--color-primary-500)] transition-all"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>

        {/* Failed Events */}
        {failedCount > 0 && (
          <div className="flex items-center gap-2 rounded bg-[var(--color-error-500)]/10 border border-[var(--color-error-500)]/20 p-2 text-[var(--color-error-500)]">
            <AlertCircle className="h-4 w-4" />
            <span className="flex-1 text-xs">Failed Events: {failedCount}</span>
            <button
              onClick={() => {
                eventBus.clearFailedEvents();
                setFailedCount(0);
              }}
              className="text-xs underline hover:no-underline transition-all"
              aria-label="Clear failed events"
            >
              Clear
            </button>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="space-y-1 rounded bg-[var(--surface-hover)] p-2">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)] text-xs">Avg Latency</span>
            <span className="font-mono text-[var(--text-primary)] text-xs">
              {metrics.averageLatency.toFixed(1)}ms
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)] text-xs">Queue Size</span>
            <span className="font-mono text-[var(--text-primary)] text-xs">{metrics.queueSize}</span>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              metrics.queueSize < 10 && failedCount === 0
                ? 'bg-[var(--color-success-500)]'
                : metrics.queueSize < 50
                  ? 'bg-[var(--color-warning-500)]'
                  : 'bg-[var(--color-error-500)]'
            }`}
          />
          <span className="text-xs text-[var(--text-secondary)]">
            {metrics.queueSize < 10 && failedCount === 0
              ? 'Healthy'
              : metrics.queueSize < 50
                ? 'Moderate Load'
                : 'High Load'}
          </span>
        </div>
      </div>
    </div>
  );
}
