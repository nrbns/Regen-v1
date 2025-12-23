/**
 * Resource Monitor Dashboard
 * Shows RAM, active agents, battery status, and optimization tips
 */

import React, { useState, useEffect } from 'react';
import { Activity, Zap, AlertCircle } from 'lucide-react';
import { modelManager } from '../../core/ai/modelManager';
import { agentQueue } from '../../core/agents/agentQueue';

interface ResourceStats {
  ram: {
    used: number;
    total: number;
    percentage: number;
  };
  agents: {
    active: number;
    queued: number;
    max: number;
  };
  battery?: {
    level: number;
    isCharging: boolean;
    isLowPowerMode: boolean;
  };
  model: {
    current: string;
    ramUsage: number;
  };
}

export function ResourceMonitor() {
  const [stats, setStats] = useState<ResourceStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateStats = async () => {
      try {
        // Detect system resources with fallback
        const resources = await modelManager.detectSystemResources();
        const recommendedModel = await modelManager.getRecommendedModel();
        const modelConfig = modelManager.getModelConfig(recommendedModel);
        const queueStatus = agentQueue.getStatus();

        // Get max agents with fallback
        let maxAgents = 4; // Safe default
        try {
          maxAgents = await modelManager.getMaxConcurrentAgents();
        } catch {
          // Fallback if calculation fails
          maxAgents = Math.max(2, Math.floor(resources.totalRAMGB / 2));
        }

        // Get RAM usage (simplified - in production, use actual system metrics)
        // Use conservative estimate if available RAM is not accurate
        const ramUsed = Math.max(
          resources.totalRAMGB - resources.availableRAMGB,
          resources.totalRAMGB * 0.3 // Assume at least 30% used
        );

        setStats({
          ram: {
            used: Math.min(ramUsed, resources.totalRAMGB), // Cap at total
            total: resources.totalRAMGB,
            percentage: Math.min((ramUsed / resources.totalRAMGB) * 100, 100),
          },
          agents: {
            active: queueStatus.running,
            queued: queueStatus.queued,
            max: maxAgents,
          },
          model: {
            current: recommendedModel,
            ramUsage: modelConfig?.ramUsageMB || 2000, // Fallback to 2GB
          },
        });
      } catch (error) {
        // Silent fail in production, log in dev
        if (import.meta.env.DEV) {
          console.error('[ResourceMonitor] Failed to update stats:', error);
        }
        // Set minimal stats on error
        setStats({
          ram: {
            used: 2,
            total: 8,
            percentage: 25,
          },
          agents: {
            active: 0,
            queued: 0,
            max: 4,
          },
          model: {
            current: 'phi3:mini',
            ramUsage: 2000,
          },
        });
      }
    };

    // Initial update
    updateStats();

    // Update every 5 seconds, but only if component is mounted
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return null;
  }

  const ramColor =
    stats.ram.percentage > 80
      ? 'text-red-400'
      : stats.ram.percentage > 60
        ? 'text-yellow-400'
        : 'text-green-400';

  // Hide on mobile to avoid clutter (mobile has MobileDock)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    return null; // Hide ResourceMonitor on mobile - use MobileDock instead
  }

  return (
    <div className="fixed bottom-4 left-4 z-[100] max-w-xs rounded-lg border border-slate-700/50 bg-slate-900/95 shadow-xl backdrop-blur-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800/50"
      >
        <Activity className="h-3.5 w-3.5" />
        <span className="font-medium">Resource Monitor</span>
        {stats.agents.queued > 0 && (
          <span className="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
            {stats.agents.queued} queued
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="space-y-3 border-t border-slate-700/50 p-3">
          {/* RAM Usage */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">RAM Usage</span>
              <span className={ramColor}>
                {stats.ram.used.toFixed(1)}GB / {stats.ram.total.toFixed(1)}GB
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full transition-all ${
                  stats.ram.percentage > 80
                    ? 'bg-red-500'
                    : stats.ram.percentage > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(stats.ram.percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Active Agents */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Active Agents</span>
              <span className="text-slate-200">
                {stats.agents.active} / {stats.agents.max}
              </span>
            </div>
            {stats.agents.queued > 0 && (
              <div className="text-xs text-blue-300">
                {stats.agents.queued} agent{stats.agents.queued > 1 ? 's' : ''} in queue
              </div>
            )}
          </div>

          {/* Current Model */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Model</span>
              <span className="text-slate-200">{stats.model.current}</span>
            </div>
            <div className="text-xs text-slate-500">
              ~{(stats.model.ramUsage / 1024).toFixed(1)}GB RAM per agent
            </div>
          </div>

          {/* Optimization Tips */}
          {stats.ram.percentage > 75 && (
            <div className="flex items-start gap-2 rounded bg-yellow-500/10 p-2 text-xs text-yellow-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <div className="font-medium">High RAM usage</div>
                <div className="text-yellow-400/80">
                  Consider closing unused tabs or reducing concurrent agents
                </div>
              </div>
            </div>
          )}

          {stats.agents.queued > 5 && (
            <div className="flex items-start gap-2 rounded bg-blue-500/10 p-2 text-xs text-blue-300">
              <Zap className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <div className="font-medium">Queue active</div>
                <div className="text-blue-400/80">
                  Agents are processing in parallel. New agents will start automatically.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
