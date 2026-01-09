import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Battery, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { getPerformanceMonitor, PerformanceMetrics, ThrottlingRecommendation } from '../../services/performance/PerformanceMonitor';

interface PerformanceStatusProps {
  compact?: boolean;
  showDetails?: boolean;
}

/**
 * Performance Status Component
 * Shows real-time resource usage and throttling recommendations
 */
export function PerformanceStatus({ compact = true, showDetails = false }: PerformanceStatusProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
  });
  const [throttling, setThrottling] = useState<ThrottlingRecommendation>({
    shouldThrottleStreaming: false,
    shouldThrottleVoice: false,
    shouldReduceQuality: false,
    reason: 'Performance within acceptable limits',
    severity: 'low',
  });
  const [showExpanded, setShowExpanded] = useState(showDetails);

  useEffect(() => {
    const monitor = getPerformanceMonitor();

    // Subscribe to metrics updates
    const unsubscribeMetrics = monitor.onMetricsUpdate((newMetrics) => {
      setMetrics(newMetrics);
      setThrottling(monitor.getThrottlingRecommendation());
    });

    return unsubscribeMetrics;
  }, []);

  const getResourceColor = (usage: number) => {
    if (usage > 80) return 'text-red-400';
    if (usage > 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getBatteryColor = (level?: number, charging?: boolean) => {
    if (charging) return 'text-green-400';
    if (!level) return 'text-gray-400';
    if (level < 20) return 'text-red-400';
    if (level < 30) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getThrottlingIcon = () => {
    switch (throttling.severity) {
      case 'high':
        return <AlertTriangle size={14} className="text-red-400" />;
      case 'medium':
        return <Zap size={14} className="text-yellow-400" />;
      default:
        return <CheckCircle size={14} className="text-green-400" />;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs">
        {/* CPU */}
        <div className={`flex items-center gap-1 ${getResourceColor(metrics.cpuUsage)}`}>
          <Cpu size={12} />
          <span>{metrics.cpuUsage}%</span>
        </div>

        {/* Memory */}
        <div className={`flex items-center gap-1 ${getResourceColor(metrics.memoryUsage)}`}>
          <HardDrive size={12} />
          <span>{metrics.memoryUsage}%</span>
        </div>

        {/* Battery */}
        {metrics.batteryLevel !== undefined && (
          <div className={`flex items-center gap-1 ${getBatteryColor(metrics.batteryLevel, metrics.isCharging)}`}>
            <Battery size={12} />
            <span>{metrics.batteryLevel}%</span>
            {metrics.isCharging && <span className="text-xs">⚡</span>}
          </div>
        )}

        {/* Throttling Indicator */}
        {throttling.severity !== 'low' && (
          <button
            onClick={() => setShowExpanded(!showExpanded)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              throttling.severity === 'high' ? 'bg-red-900/20 text-red-400' : 'bg-yellow-900/20 text-yellow-400'
            }`}
            title={`Performance: ${throttling.reason}`}
          >
            {getThrottlingIcon()}
            {!compact && <span className="text-xs">{throttling.severity}</span>}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Compact Trigger */}
      <button
        onClick={() => setShowExpanded(!showExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-slate-700"
      >
        {getThrottlingIcon()}
        <span className={throttling.severity === 'high' ? 'text-red-400' : throttling.severity === 'medium' ? 'text-yellow-400' : 'text-green-400'}>
          Performance
        </span>
      </button>

      {/* Expanded Details Panel */}
      {showExpanded && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Cpu size={16} />
              Performance Monitor
            </h3>
            <button
              onClick={() => setShowExpanded(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Resource Usage */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Cpu size={14} />
                  <span>CPU Usage</span>
                </div>
                <span className={`text-sm font-medium ${getResourceColor(metrics.cpuUsage)}`}>
                  {metrics.cpuUsage}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    metrics.cpuUsage > 80 ? 'bg-red-500' :
                    metrics.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.cpuUsage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <HardDrive size={14} />
                  <span>Memory Usage</span>
                </div>
                <span className={`text-sm font-medium ${getResourceColor(metrics.memoryUsage)}`}>
                  {metrics.memoryUsage}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    metrics.memoryUsage > 80 ? 'bg-red-500' :
                    metrics.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.memoryUsage}%` }}
                />
              </div>
            </div>

            {metrics.batteryLevel !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Battery size={14} />
                    <span>Battery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getBatteryColor(metrics.batteryLevel, metrics.isCharging)}`}>
                      {metrics.batteryLevel}%
                    </span>
                    {metrics.isCharging && <span className="text-green-400">⚡</span>}
                  </div>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      metrics.batteryLevel < 20 ? 'bg-red-500' :
                      metrics.batteryLevel < 30 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${metrics.batteryLevel}%` }}
                  />
                </div>
              </div>
            )}

            {/* Throttling Status */}
            <div className="mt-4 p-3 rounded-lg border bg-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                {getThrottlingIcon()}
                <span className="text-sm font-medium text-white">Realtime Status</span>
              </div>

              <div className="text-sm text-gray-300 mb-2">
                {throttling.reason}
              </div>

              {throttling.shouldThrottleStreaming && (
                <div className="text-xs text-yellow-400 mb-1">
                  • Streaming throttled to reduce CPU usage
                </div>
              )}

              {throttling.shouldThrottleVoice && (
                <div className="text-xs text-yellow-400 mb-1">
                  • Voice processing throttled to reduce memory usage
                </div>
              )}

              {throttling.shouldReduceQuality && (
                <div className="text-xs text-yellow-400">
                  • Quality reduced for better performance
                </div>
              )}

              {throttling.severity === 'low' && (
                <div className="text-xs text-green-400">
                  ✓ All realtime features running at full performance
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
