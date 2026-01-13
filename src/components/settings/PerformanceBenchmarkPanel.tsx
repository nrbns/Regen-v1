/**
 * Performance Benchmark Panel
 * Displays benchmark results in Settings → System tab
 */

import React, { useState } from 'react';
import { Activity, CheckCircle, XCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { runAllBenchmarks, checkMinimumRequirements, type BenchmarkResult, type SystemInfo } from '../../utils/performance/benchmark';

export function PerformanceBenchmarkPanel() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    systemInfo: SystemInfo;
    results: BenchmarkResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      score: number;
    };
  } | null>(null);
  const [requirements, setRequirements] = useState<{
    meetsRequirements: boolean;
    issues: string[];
  } | null>(null);

  const handleRunBenchmarks = async () => {
    setLoading(true);
    try {
      const benchmarkResults = await runAllBenchmarks();
      const reqCheck = await checkMinimumRequirements();
      setResults(benchmarkResults);
      setRequirements(reqCheck);
    } catch (error) {
      console.error('[PerformanceBenchmark] Failed to run benchmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return 'N/A';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Performance Benchmarks</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Test Regen performance on your device (4GB RAM target)
          </p>
        </div>
        <button
          onClick={handleRunBenchmarks}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary-500)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--color-primary-600)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          aria-label="Run performance benchmarks"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Run Benchmarks
            </>
          )}
        </button>
      </div>

      {/* System Info */}
      {results && (
        <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-hover)] p-4">
          <h4 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">System Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[var(--text-muted)]">Platform:</span>
              <span className="ml-2 text-[var(--text-primary)]">{results.systemInfo.platform}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">CPU Cores:</span>
              <span className="ml-2 text-[var(--text-primary)]">{results.systemInfo.cpuCount}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Total Memory:</span>
              <span className="ml-2 text-[var(--text-primary)]">
                {formatBytes(results.systemInfo.totalMemory)}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Available Memory:</span>
              <span className="ml-2 text-[var(--text-primary)]">
                {formatBytes(results.systemInfo.availableMemory)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Requirements Check */}
      {requirements && (
        <div
          className={`rounded-lg border p-4 ${
            requirements.meetsRequirements
              ? 'border-[var(--color-success-500)]/30 bg-[var(--color-success-500)]/10'
              : 'border-[var(--color-warning-500)]/30 bg-[var(--color-warning-500)]/10'
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            {requirements.meetsRequirements ? (
              <CheckCircle className="h-5 w-5 text-[var(--color-success-500)]" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-[var(--color-warning-500)]" />
            )}
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              {requirements.meetsRequirements
                ? 'Meets Minimum Requirements'
                : 'Requirements Check'}
            </h4>
          </div>
          {requirements.issues.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
              {requirements.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[var(--color-warning-500)]">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Benchmark Results */}
      {results && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Benchmark Results</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Score:</span>
              <span
                className={`text-lg font-bold ${
                  results.summary.score >= 80
                    ? 'text-[var(--color-success-500)]'
                    : results.summary.score >= 60
                      ? 'text-[var(--color-warning-500)]'
                      : 'text-[var(--color-error-500)]'
                }`}
              >
                {results.summary.score}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {results.results.map((result, i) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-hover)] p-3 transition-all hover:bg-[var(--surface-active)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.passed ? (
                      <CheckCircle className="h-4 w-4 text-[var(--color-success-500)]" />
                    ) : (
                      <XCircle className="h-4 w-4 text-[var(--color-error-500)]" />
                    )}
                    <span className="text-sm font-medium text-[var(--text-primary)]">{result.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-[var(--text-muted)]">
                      {result.value.toFixed(2)} {result.unit}
                    </span>
                    {result.target && (
                      <span className="text-[var(--text-disabled)]">
                        (target: &lt;{result.target} {result.unit})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-hover)] p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Summary:</span>
              <span className="text-[var(--text-primary)]">
                {results.summary.passed} passed, {results.summary.failed} failed out of{' '}
                {results.summary.total} tests
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-hover)] p-3 text-xs text-[var(--text-muted)]">
        <p>
          Benchmarks test event bus performance, memory usage, and tab creation speed. Target:
          smooth operation on 4GB RAM devices.
        </p>
      </div>
    </div>
  );
}
