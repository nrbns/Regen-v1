/**
 * Activity Timeline Component
 * Visual timeline of all actions showing how intelligence builds over time
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, FileText, Link2, BarChart3, Brain, Sparkles } from 'lucide-react';
import { taskRunner, type TaskExecution } from '../../lib/tasks/TaskRunner';
import { workspaceStore } from '../../lib/workspace/WorkspaceStore';

export interface ActivityItem {
  id: string;
  type: 'task' | 'workspace' | 'command';
  title: string;
  description?: string;
  timestamp: number;
  status: 'completed' | 'failed' | 'pending';
  icon: React.ComponentType<{ className?: string }>;
  result?: any;
}

export interface ActivityTimelineProps {
  className?: string;
  maxItems?: number;
  showDetails?: boolean;
}

export function ActivityTimeline({
  className = '',
  maxItems = 20,
  showDetails = true,
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    // Load task executions
    const executions = taskRunner.getExecutions(maxItems);
    const taskActivities: ActivityItem[] = executions.map((exec) => {
      const task = taskRunner.getTask(exec.taskId);
      let icon = Brain;
      if (exec.taskId === 'summarize_page') icon = FileText;
      else if (exec.taskId === 'extract_links') icon = Link2;
      else if (exec.taskId === 'analyze_content') icon = BarChart3;

      return {
        id: exec.id,
        type: 'task',
        title: task?.name || exec.taskId,
        description: task?.description,
        timestamp: exec.startedAt,
        status: exec.status === 'completed' ? 'completed' : exec.status === 'failed' ? 'failed' : 'pending',
        icon,
        result: exec.result,
      };
    });

    // Load workspace items (recent)
    const workspaceItems = workspaceStore.getAll()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, Math.floor(maxItems / 2))
      .map((item) => ({
        id: item.id,
        type: 'workspace' as const,
        title: item.title,
        description: item.type,
        timestamp: item.createdAt,
        status: 'completed' as const,
        icon: FileText,
        result: item.content.substring(0, 100),
      }));

    // Combine and sort by timestamp
    const allActivities = [...taskActivities, ...workspaceItems]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxItems);

    setActivities(allActivities);

    // Listen for new task executions
    const unsubscribe = taskRunner.onExecution((execution) => {
      const task = taskRunner.getTask(execution.taskId);
      let icon = Brain;
      if (execution.taskId === 'summarize_page') icon = FileText;
      else if (execution.taskId === 'extract_links') icon = Link2;
      else if (execution.taskId === 'analyze_content') icon = BarChart3;

      const newActivity: ActivityItem = {
        id: execution.id,
        type: 'task',
        title: task?.name || execution.taskId,
        description: task?.description,
        timestamp: execution.startedAt,
        status: execution.status === 'completed' ? 'completed' : execution.status === 'failed' ? 'failed' : 'pending',
        icon,
        result: execution.result,
      };

      setActivities((prev) => [newActivity, ...prev].slice(0, maxItems));
    });

    return unsubscribe;
  }, [maxItems]);

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getStatusIcon = (status: ActivityItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-blue-400 animate-spin" />;
    }
  };

  if (activities.length === 0) {
    return (
      <div className={`text-center py-8 text-slate-400 ${className}`}>
        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity yet</p>
        <p className="text-xs mt-1">Your actions will appear here</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-700" />

        {/* Timeline items */}
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = activity.icon;
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative flex items-start gap-4"
              >
                {/* Timeline dot */}
                <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-slate-800 border-2 border-slate-700 rounded-full">
                  <Icon className="w-5 h-5 text-purple-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-slate-200 truncate">
                          {activity.title}
                        </h4>
                        {getStatusIcon(activity.status)}
                      </div>
                      {activity.description && (
                        <p className="text-xs text-slate-400">{activity.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {formatTime(activity.timestamp)}
                    </span>
                  </div>

                  {showDetails && activity.result && activity.status === 'completed' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-2 p-2 bg-slate-800/50 rounded text-xs text-slate-300 border border-slate-700"
                    >
                      {typeof activity.result === 'string'
                        ? activity.result.substring(0, 150) + (activity.result.length > 150 ? '...' : '')
                        : JSON.stringify(activity.result).substring(0, 150) + '...'}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
