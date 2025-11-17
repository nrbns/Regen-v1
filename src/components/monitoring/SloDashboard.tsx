import { useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Activity, CheckCircle2, Timer } from 'lucide-react';
import { useObservabilityStore } from '../../state/observabilityStore';

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return 'Just started';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function SloDashboard() {
  const { summary, loading, error, refresh } = useObservabilityStore();

  useEffect(() => {
    void refresh();
    const id = setInterval(() => refresh().catch(() => undefined), 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const crashFree = summary ? (summary.crashCount === 0 ? 100 : Math.max(0, 100 - summary.crashCount * 10)) : 100;
  const uptime = summary ? formatDuration(summary.uptimeSeconds) : 'Calculating…';
  const lastCrash = summary?.lastCrashAt
    ? formatDistanceToNow(new Date(summary.lastCrashAt), { addSuffix: true })
    : 'No crashes recorded';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-100">Reliability Dashboard</h3>
        <button
          onClick={() => refresh().catch(() => undefined)}
          className="text-sm text-blue-400 hover:text-blue-300"
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-800/60 bg-gray-900/60 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            Crash-free sessions
          </div>
          <div className="mt-2 text-3xl font-semibold text-gray-100">{crashFree}%</div>
          <p className="mt-1 text-xs text-gray-500">
            {summary?.crashCount ? `${summary.crashCount} crash${summary.crashCount === 1 ? '' : 'es'} this session` : 'No crashes detected'}
          </p>
        </div>

        <div className="rounded-lg border border-gray-800/60 bg-gray-900/60 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Timer className="h-4 w-4 text-blue-400" />
            Uptime
          </div>
          <div className="mt-2 text-3xl font-semibold text-gray-100">{uptime}</div>
          <p className="mt-1 text-xs text-gray-500">Since last restart</p>
        </div>

        <div className="rounded-lg border border-gray-800/60 bg-gray-900/60 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            Last crash
          </div>
          <div className="mt-2 text-3xl font-semibold text-gray-100 text-balance">{lastCrash}</div>
          <p className="mt-1 text-xs text-gray-500">Crash data stored locally only</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-800/60 bg-gray-900/60 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Activity className="h-4 w-4 text-purple-400" />
          Performance samples
        </div>
        {summary?.perfMetrics?.length ? (
          <div className="mt-3 space-y-2">
            {summary.perfMetrics.map((metric) => (
              <div key={metric.metric} className="rounded-md border border-gray-800/40 bg-gray-900/70 p-3 text-sm">
                <div className="flex items-center justify-between text-gray-200">
                  <span className="font-medium">{metric.metric}</span>
                  <span className="text-xs text-gray-500">{metric.samples} samples</span>
                </div>
                <div className="mt-2 grid grid-cols-3 text-xs text-gray-400">
                  <div>
                    Avg:{' '}
                    <span className="text-gray-100">
                      {metric.avg.toFixed(0)} {metric.unit}
                    </span>
                  </div>
                  <div>
                    P95:{' '}
                    <span className="text-gray-100">
                      {metric.p95.toFixed(0)} {metric.unit}
                    </span>
                  </div>
                  <div>
                    Last:{' '}
                    <span className="text-gray-100">
                      {metric.last.toFixed(0)} {metric.unit}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-400">No performance samples yet. They populate automatically as you browse.</p>
        )}
      </div>
    </div>
  );
}


