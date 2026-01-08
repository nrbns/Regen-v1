import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Wifi, Zap, Activity, ChevronUp, ChevronDown } from 'lucide-react';

interface SystemMetrics {
  cpu: number;
  ram: number;
  network: boolean;
  activeModel?: 'local' | 'online';
  taskCount?: number;
  uptime?: number;
}

interface RealityStripProps {
  metrics: SystemMetrics;
  onToggleExpanded?: () => void;
  isExpanded?: boolean;
}

export function RealityStrip({ metrics, onToggleExpanded, isExpanded = false }: RealityStripProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getResourceBar = (value: number, maxValue: number = 100, color: string = 'blue') => {
    const percentage = Math.min((value / maxValue) * 100, 100);

    const colorClasses = {
      blue: percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-blue-500',
      green: percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-green-500',
      red: 'bg-red-500',
    };

    return (
      <div className="flex items-center gap-1">
        <div className="w-8 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs font-mono min-w-[2rem] text-gray-300">
          {value}{maxValue === 100 ? '%' : ''}
        </span>
      </div>
    );
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Main strip */}
      <div
        className={`bg-slate-900/95 backdrop-blur-xl border-t border-slate-700 transition-all duration-300 ${
          isHovered ? 'bg-slate-900' : ''
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Left side - Core metrics */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Cpu size={14} className="text-blue-400" />
                <span className="text-xs text-gray-400 hidden sm:inline">CPU</span>
                {getResourceBar(metrics.cpu)}
              </div>

              <div className="flex items-center gap-2">
                <HardDrive size={14} className="text-green-400" />
                <span className="text-xs text-gray-400 hidden sm:inline">RAM</span>
                {getResourceBar(metrics.ram)}
              </div>

              <div className="flex items-center gap-2">
                <Wifi
                  size={14}
                  className={metrics.network ? 'text-green-400' : 'text-red-400'}
                />
                <span className="text-xs text-gray-400 hidden sm:inline">NET</span>
                <div className={`w-2 h-2 rounded-full ${metrics.network ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>
            </div>

            {/* Center - Active model */}
            <div className="flex items-center gap-2">
              {metrics.activeModel && (
                <>
                  <Zap size={14} className="text-yellow-400" />
                  <span className="text-xs text-gray-300">
                    {metrics.activeModel === 'local' ? 'Local' : 'Online'}
                  </span>
                </>
              )}
              {metrics.taskCount !== undefined && metrics.taskCount > 0 && (
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                  {metrics.taskCount} active
                </span>
              )}
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center gap-2">
              {metrics.uptime && (
                <span className="text-xs text-gray-500 hidden md:inline">
                  {formatUptime(metrics.uptime)}
                </span>
              )}
              {onToggleExpanded && (
                <button
                  onClick={onToggleExpanded}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="border-t border-slate-700 bg-slate-900/50">
            <div className="px-4 py-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* System Health */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-300">System Health</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">CPU Usage:</span>
                      <span className="text-white font-mono">{metrics.cpu}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Memory Usage:</span>
                      <span className="text-white font-mono">{metrics.ram}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Network:</span>
                      <span className={metrics.network ? 'text-green-400' : 'text-red-400'}>
                        {metrics.network ? 'Connected' : 'Offline'}
                      </span>
                    </div>
                    {metrics.uptime && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Uptime:</span>
                        <span className="text-white font-mono">{formatUptime(metrics.uptime)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Status */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="text-yellow-400" />
                    <span className="text-xs font-medium text-gray-300">AI Status</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Active Model:</span>
                      <span className="text-white">
                        {metrics.activeModel === 'local' ? 'Local (Private)' : 'Online (Stronger)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className="text-green-400">Ready</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tasks:</span>
                      <span className="text-white">{metrics.taskCount || 0} active</span>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-blue-400" />
                    <span className="text-xs font-medium text-gray-300">Performance</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Response Time:</span>
                      <span className="text-green-400 font-mono">&lt;150ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Memory Peak:</span>
                      <span className={`font-mono ${metrics.ram > 80 ? 'text-red-400' : metrics.ram > 60 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {metrics.ram}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">CPU Peak:</span>
                      <span className={`font-mono ${metrics.cpu > 80 ? 'text-red-400' : metrics.cpu > 60 ? 'text-yellow-400' : 'text-blue-400'}`}>
                        {metrics.cpu}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
