/**
 * Redix Memory Monitor Component
 * Visual display of memory usage and optimization stats
 */

import { Database, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useEnhancedRedix } from '../../hooks/useEnhancedRedix';

export function RedixMemoryMonitor() {
  const { stats, isEnabled } = useEnhancedRedix();

  if (!isEnabled) {
    return null;
  }

  const getTrendIcon = () => {
    switch (stats.memoryTrend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-400" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-400" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getMemoryColor = () => {
    if (stats.memoryMB > 500) return 'text-red-400';
    if (stats.memoryMB > 350) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-white">Redix Memory Monitor</h3>
      </div>

      <div className="space-y-3">
        {/* Current Memory */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Current Memory</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${getMemoryColor()}`}>{stats.memoryMB} MB</span>
            {getTrendIcon()}
          </div>
        </div>

        {/* Memory Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-500">Average:</span>
            <span className="ml-2 text-slate-300">{stats.averageMemoryMB} MB</span>
          </div>
          <div>
            <span className="text-slate-500">Peak:</span>
            <span className="ml-2 text-slate-300">{stats.peakMemoryMB} MB</span>
          </div>
        </div>

        {/* Tab Stats */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Active Tabs</span>
          <span className="text-slate-300">
            {stats.activeTabs} / {stats.maxActiveTabs}
          </span>
        </div>

        {/* Memory Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full transition-all ${
              stats.memoryMB > 500
                ? 'bg-red-500'
                : stats.memoryMB > 350
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
            }`}
            style={{
              width: `${Math.min(100, (stats.memoryMB / 600) * 100)}%`,
            }}
          />
        </div>

        {/* Optimization Status */}
        {stats.isOptimized && (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <Database className="h-3 w-3" />
            <span>Optimization Active</span>
          </div>
        )}
      </div>
    </div>
  );
}
