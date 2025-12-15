/**
 * Workflow Analytics Dashboard
 * Insights into workflow performance, usage patterns, and recommendations
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  BarChart3,
  Clock,
  Zap,
  Target,
  Lightbulb,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useWorkflowStore } from '../../core/agent/workflows';
import { useBatchStore } from '../../core/agent/batch';
import { useOptimizerStore } from '../../core/agent/optimizer';
import { WorkflowOptimizerPanel } from './WorkflowOptimizerPanel';
import { useOptimizerStore } from '../../core/agent/optimizer';
import { WorkflowOptimizerPanel } from './WorkflowOptimizerPanel';

interface WorkflowMetric {
  workflowId: string;
  name: string;
  usageCount: number;
  avgDuration?: number;
  successRate: number;
  lastUsed?: number;
}

interface Recommendation {
  id: string;
  type: 'optimization' | 'trending' | 'underutilized';
  workflowId: string;
  workflowName: string;
  title: string;
  description: string;
  action?: string;
  confidence: number; // 0-1
}

export function WorkflowAnalyticsDashboard() {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const templates = useWorkflowStore(state => state.templates);
  const jobs = useBatchStore(state => state.jobs);
  const generateSuggestions = useOptimizerStore(state => state.generateSuggestions);

  // Calculate metrics
  const metrics = useMemo(() => {
    return templates.map(template => {
      const templateJobs = jobs.filter(job =>
        job.tasks.some(task => task.goal.includes(template.name) || task.goal.includes(template.id))
      );

      const completedJobs = templateJobs.filter(job => job.status === 'completed');
      const totalDuration = completedJobs.reduce((sum, job) => sum + (job.totalDuration || 0), 0);
      const avgDuration = completedJobs.length > 0 ? totalDuration / completedJobs.length : 0;

      return {
        workflowId: template.id,
        name: template.name,
        usageCount: template.usageCount,
        avgDuration: Math.round(avgDuration / 1000), // Convert to seconds
        successRate: completedJobs.length > 0 ? (completedJobs.length / templateJobs.length) * 100 : 0,
        lastUsed: Math.max(...completedJobs.map(j => j.completedAt || 0), 0),
      } as WorkflowMetric;
    });
  }, [templates, jobs]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];

    // Underutilized templates
    const avgUsage = metrics.reduce((sum, m) => sum + m.usageCount, 0) / (metrics.length || 1);
    metrics.forEach(metric => {
      if (metric.usageCount < avgUsage * 0.5 && metric.usageCount > 0) {
        recs.push({
          id: `underutilized-${metric.workflowId}`,
          type: 'underutilized',
          workflowId: metric.workflowId,
          workflowName: metric.name,
          title: `"${metric.name}" is underutilized`,
          description: `This workflow has been used ${metric.usageCount} times, but similar templates are used more frequently.`,
          action: 'Consider consolidating workflows or improving visibility',
          confidence: 0.7,
        });
      }
    });

    // Most trending (recently used)
    const recentThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    const recentMetrics = metrics.filter(m => (m.lastUsed || 0) > recentThreshold && m.usageCount >= 3);
    recentMetrics.slice(0, 2).forEach(metric => {
      recs.push({
        id: `trending-${metric.workflowId}`,
        type: 'trending',
        workflowId: metric.workflowId,
        workflowName: metric.name,
        title: `"${metric.name}" is trending`,
        description: `Frequently used recently with ${metric.usageCount} executions and ${Math.round(metric.successRate)}% success rate.`,
        action: 'Consider promoting this workflow or creating similar templates',
        confidence: Math.min(metric.usageCount / 10, 1),
      });
    });

    // Optimization opportunities
    metrics.forEach(metric => {
      if (metric.successRate < 80 && metric.usageCount >= 2) {
        recs.push({
          id: `optimize-${metric.workflowId}`,
          type: 'optimization',
          workflowId: metric.workflowId,
          workflowName: metric.name,
          title: `Optimize "${metric.name}"`,
          description: `Success rate is ${Math.round(metric.successRate)}%. Review failed executions to identify issues.`,
          action: 'Review last execution details in batch processor',
          confidence: 0.8,
        });
      }

      if (metric.avgDuration && metric.avgDuration > 300) {
        recs.push({
          id: `slowness-${metric.workflowId}`,
          type: 'optimization',
          workflowId: metric.workflowId,
          workflowName: metric.name,
          title: `"${metric.name}" is slow`,
          description: `Average execution time is ${metric.avgDuration}s. Consider breaking into smaller workflows.`,
          action: 'Split into sub-workflows or optimize step sequence',
          confidence: 0.75,
        });
      }
    });

    return recs.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }, [metrics]);

  // Overall stats
  const totalExecutions = metrics.reduce((sum, m) => sum + m.usageCount, 0);
  const avgSuccessRate = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length
    : 0;
  const avgDuration = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + (m.avgDuration || 0), 0) / metrics.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-300 mb-1">
          <BarChart3 size={14} />
          <span>Analytics</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Workflow Analytics</h2>
        <p className="text-sm text-slate-400 mt-1">Performance insights and optimization recommendations</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Zap}
          label="Total Executions"
          value={totalExecutions}
          unit="runs"
          color="emerald"
        />
        <StatCard
          icon={CheckCircle}
          label="Avg Success Rate"
          value={Math.round(avgSuccessRate)}
          unit="%"
          color="blue"
        />
        <StatCard
          icon={Clock}
          label="Avg Duration"
          value={Math.round(avgDuration)}
          unit="s"
          color="purple"
        />
        <StatCard
          icon={Target}
          label="Active Workflows"
          value={metrics.filter(m => m.usageCount > 0).length}
          unit={`of ${metrics.length}`}
          color="orange"
        />
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} className="text-yellow-400" />
              <h3 className="font-semibold text-slate-200">Recommendations</h3>
            </div>
            <button
              onClick={() => {
                // Generate optimizer suggestions from top workflows
                const topWorkflows = metrics
                  .filter(m => m.usageCount > 0)
                  .sort((a, b) => b.usageCount - a.usageCount)
                  .slice(0, 5);
                
                topWorkflows.forEach(metric => {
                  const template = templates.find(t => t.id === metric.workflowId);
                  if (template) {
                    generateSuggestions(template, {
                      avgDuration: (metric.avgDuration || 0) * 1000,
                      successRate: metric.successRate,
                      usageCount: metric.usageCount,
                    });
                  }
                });
                
                setShowOptimizer(true);
              }}
              className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              <Zap size={12} />
              Generate Optimizations
            </button>
          </div>
          <div className="space-y-2">
            {recommendations.map(rec => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Top Workflows */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-emerald-400" />
          <h3 className="font-semibold text-slate-200">Top Workflows</h3>
        </div>
        {metrics.length === 0 ? (
          <p className="text-xs text-slate-500">No workflow executions yet. Create and run workflows to see analytics.</p>
        ) : (
          <div className="space-y-2">
            {metrics
              .sort((a, b) => b.usageCount - a.usageCount)
              .slice(0, 5)
              .map((metric, idx) => (
                <motion.div
                  key={metric.workflowId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-3 cursor-pointer hover:bg-slate-800/50 transition-colors"
                  onClick={() => setSelectedMetric(metric.workflowId)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-100 truncate">{metric.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {metric.usageCount} runs • {Math.round(metric.successRate)}% success
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-semibold text-emerald-300">{metric.usageCount}x</div>
                        <div className="text-xs text-slate-500">{metric.avgDuration || 0}s avg</div>
                      </div>
                    </div>
                  </div>

                  {/* Success rate bar */}
                  <div className="h-1.5 w-full rounded-full bg-slate-700/30 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.successRate}%` }}
                      transition={{ delay: idx * 0.05 + 0.2, duration: 0.6 }}
                      className={`h-full rounded-full ${
                        metric.successRate >= 80
                          ? 'bg-emerald-500'
                          : metric.successRate >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                    />
                  </div>
                </motion.div>
              ))}
          </div>
        )}
      </div>

      {/* Detailed Metrics */}
      {selectedMetric && (
        <DetailedMetricsCard
          metric={metrics.find(m => m.workflowId === selectedMetric)}
          onClose={() => setSelectedMetric(null)}
        />
      )}

      {/* Optimizer Panel */}
      {showOptimizer && (
        <div className="rounded-lg border border-blue-500/50 bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-6">
          <WorkflowOptimizerPanel />
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ComponentType<{ size: number }>;
  label: string;
  value: number | string;
  unit: string;
  color: 'emerald' | 'blue' | 'purple' | 'orange';
}) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
    orange: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border ${colorClasses[color]} p-3`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{label}</div>
          <div className="text-xl font-bold text-white">{value}</div>
          <div className="text-[10px] text-slate-500">{unit}</div>
        </div>
        <div className="ml-2 opacity-50">
          <Icon size={20} />
        </div>
      </div>
    </motion.div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const typeColors = {
    optimization: 'border-blue-700/30 bg-blue-900/10 text-blue-200',
    trending: 'border-emerald-700/30 bg-emerald-900/10 text-emerald-200',
    underutilized: 'border-orange-700/30 bg-orange-900/10 text-orange-200',
  };

  const icons = {
    optimization: <AlertCircle size={14} />,
    trending: <TrendingUp size={14} />,
    underutilized: <Clock size={14} />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-lg border ${typeColors[recommendation.type]} p-3`}
    >
      <div className="flex gap-2">
        <div className="flex-shrink-0 mt-0.5">{icons[recommendation.type]}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{recommendation.title}</div>
          <p className="text-xs mt-1 opacity-80">{recommendation.description}</p>
          {recommendation.action && (
            <div className="text-xs mt-2 opacity-60 italic">💡 {recommendation.action}</div>
          )}
          <div className="text-[10px] mt-2 opacity-50">Confidence: {Math.round(recommendation.confidence * 100)}%</div>
        </div>
      </div>
    </motion.div>
  );
}

function DetailedMetricsCard({ metric, onClose }: { metric?: WorkflowMetric; onClose: () => void }) {
  if (!metric) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-slate-700/50 bg-slate-800/20 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-200">{metric.name} - Detailed Metrics</h3>
        <button
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
        <div className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-2">
          <div className="text-slate-500 mb-1">Total Runs</div>
          <div className="text-lg font-bold text-emerald-300">{metric.usageCount}</div>
        </div>
        <div className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-2">
          <div className="text-slate-500 mb-1">Success Rate</div>
          <div className="text-lg font-bold text-blue-300">{Math.round(metric.successRate)}%</div>
        </div>
        <div className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-2">
          <div className="text-slate-500 mb-1">Avg Duration</div>
          <div className="text-lg font-bold text-purple-300">{metric.avgDuration || 0}s</div>
        </div>
        <div className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-2">
          <div className="text-slate-500 mb-1">Last Used</div>
          <div className="text-lg font-bold text-orange-300">
            {metric.lastUsed ? formatTimeAgo(metric.lastUsed) : 'Never'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return 'Never';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
