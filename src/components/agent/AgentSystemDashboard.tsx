/**
 * Agent System Dashboard
 * Real-time monitoring of agent performance, safety, and learning metrics
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { agentExecutor } from '../../core/agent/executor';
import { agentMemory } from '../../core/agent/memory';

interface SystemMetrics {
  totalRuns: number;
  successRate: number;
  averageRunTime: number;
  blockedAttempts: number;
  consentsRequested: number;
  consentsGranted: number;
  topDomains: Array<{ domain: string; count: number }>;
  averageToolsPerRun: number;
  riskDistribution: { low: number; medium: number; high: number };
}

export function AgentSystemDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshMetrics();
    const interval = setInterval(refreshMetrics, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const refreshMetrics = () => {
    setRefreshing(true);
    try {
      const auditMap = agentExecutor.getAllAudits();
      const auditArray = Array.from(auditMap.values()).flat();
      const history = agentMemory.getTaskHistory();

      let successCount = 0;
      let totalTime = 0;
      let blockedCount = 0;
      let consentsRequested = 0;
      let consentsGranted = 0;
      const riskCounts = { low: 0, medium: 0, high: 0 };

      auditArray.forEach(entry => {
        if (entry.allowed) {
          successCount++;
        } else {
          blockedCount++;
        }

        if (entry.consentRequired) {
          consentsRequested++;
          if (entry.consentGranted) consentsGranted++;
        }

        const risk = entry.risk.toLowerCase();
        if (risk === 'low') riskCounts.low++;
        else if (risk === 'medium') riskCounts.medium++;
        else if (risk === 'high') riskCounts.high++;
      });

      history.forEach(entry => {
        if (typeof entry.value === 'object' && entry.value !== null) {
          const val = entry.value as any;
          if (val.duration) {
            totalTime += val.duration;
          }
        }
      });

      const metrics: SystemMetrics = {
        totalRuns: auditMap.size,
        successRate: auditArray.length > 0 ? successCount / (successCount + blockedCount) : 0,
        averageRunTime: history.length > 0 ? totalTime / history.length : 0,
        blockedAttempts: blockedCount,
        consentsRequested,
        consentsGranted,
        topDomains: extractTopDomains(auditArray),
        averageToolsPerRun: auditMap.size > 0 ? successCount / auditMap.size : 0,
        riskDistribution: riskCounts,
      };

      setMetrics(metrics);
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-slate-400">
        <Activity size={16} className="animate-spin" />
        <span className="ml-2">Loading agent metrics...</span>
      </div>
    );
  }

  const consentRate =
    metrics.consentsRequested > 0
      ? Math.round((metrics.consentsGranted / metrics.consentsRequested) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
          Agent System Metrics
        </h3>
        <button
          onClick={refreshMetrics}
          disabled={refreshing}
          className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50"
        >
          {refreshing ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      {/* Top metrics row */}
      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard
          label="Total Runs"
          value={metrics.totalRuns}
          icon={Activity}
          color="blue"
          trend={`${metrics.averageToolsPerRun.toFixed(1)} tools/run`}
        />
        <MetricCard
          label="Success Rate"
          value={`${Math.round(metrics.successRate * 100)}%`}
          icon={CheckCircle2}
          color="emerald"
          trend={`${metrics.blockedAttempts} blocked`}
        />
        <MetricCard
          label="Avg Runtime"
          value={`${metrics.averageRunTime.toFixed(0)}ms`}
          icon={Zap}
          color="amber"
          trend={`per task`}
        />
        <MetricCard
          label="Consent Rate"
          value={`${consentRate}%`}
          icon={AlertTriangle}
          color="purple"
          trend={`${metrics.consentsGranted}/${metrics.consentsRequested}`}
        />
      </div>

      {/* Risk distribution */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Risk Distribution
          </div>
          <div className="mt-3 space-y-2">
            <RiskBar label="Low" count={metrics.riskDistribution.low} color="emerald" />
            <RiskBar label="Medium" count={metrics.riskDistribution.medium} color="amber" />
            <RiskBar label="High" count={metrics.riskDistribution.high} color="red" />
          </div>
        </div>

        {/* Top domains */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Top Domains
          </div>
          <div className="mt-3 space-y-1">
            {metrics.topDomains.slice(0, 3).map((domain, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <span className="truncate text-slate-300">{domain.domain}</span>
                <span className="ml-2 text-slate-500">{domain.count}x</span>
              </div>
            ))}
            {metrics.topDomains.length === 0 && (
              <div className="text-[11px] text-slate-500">No domain activity</div>
            )}
          </div>
        </div>

        {/* Health indicator */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            System Health
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <HealthIndicator
              label="Execution"
              status={metrics.successRate > 0.8 ? 'healthy' : 'ok'}
            />
            <HealthIndicator
              label="Safety"
              status={metrics.blockedAttempts < 5 ? 'healthy' : 'ok'}
            />
            <HealthIndicator
              label="Performance"
              status={metrics.averageRunTime < 5000 ? 'healthy' : 'ok'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
  trend: string;
}) {
  const colorMap = {
    blue: 'border-blue-500/30 bg-blue-500/10',
    emerald: 'border-emerald-500/30 bg-emerald-500/10',
    amber: 'border-amber-500/30 bg-amber-500/10',
    purple: 'border-purple-500/30 bg-purple-500/10',
  };

  const textColorMap = {
    blue: 'text-blue-200',
    emerald: 'text-emerald-200',
    amber: 'text-amber-200',
    purple: 'text-purple-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border ${colorMap[color]} ${textColorMap[color]} p-3`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest opacity-75">
            {label}
          </div>
          <div className="mt-2 text-lg font-bold">{value}</div>
          <div className="mt-1 text-[10px] opacity-60">{trend}</div>
        </div>
        <Icon size={16} className="mt-1 opacity-50" />
      </div>
    </motion.div>
  );
}

function RiskBar({ label, count, color }: { label: string; count: number; color: string }) {
  const colorClasses = {
    emerald: 'bg-emerald-500/60',
    amber: 'bg-amber-500/60',
    red: 'bg-red-500/60',
  };

  const percentage = Math.min(100, (count / 10) * 100); // Normalize to 10 as max

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-8 font-mono text-slate-400">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-slate-700/30">
        <div
          className={`h-full ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-6 text-right text-slate-500">{count}</span>
    </div>
  );
}

function HealthIndicator({ label, status }: { label: string; status: 'healthy' | 'ok' }) {
  const statusColor = status === 'healthy' ? 'text-emerald-400' : 'text-amber-400';
  const dotColor = status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400';

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span className="text-slate-300">{label}</span>
      <span className={`ml-auto font-mono ${statusColor}`}>{status}</span>
    </div>
  );
}

function extractTopDomains(auditEntries: Array<any>): Array<{ domain: string; count: number }> {
  const domainMap = new Map<string, number>();

  auditEntries.forEach((entry: any) => {
    // Extract domain from tool input if available
    if (entry.inputPreview) {
      const urlMatch = entry.inputPreview.match(/https?:\/\/([^\/]+)/);
      if (urlMatch) {
        const domain = urlMatch[1];
        domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
      }
    }
  });

  return Array.from(domainMap.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
