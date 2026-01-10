/**
 * Recent Activity Feed - Shows user activity statistics
 * Replaces static cards with dynamic, living feed
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Sparkles, Clock, TrendingUp } from 'lucide-react';
import { workspaceStore } from '../../lib/workspace/WorkspaceStore';
import { taskRunner } from '../../lib/tasks/TaskRunner';
import { contextMemory } from '../../lib/services/ContextMemory';

interface ActivityStats {
  summariesToday: number;
  tasksExecutedToday: number;
  workspaceItems: number;
  lastActivity: string | null;
}

export function RecentActivityFeed() {
  const [stats, setStats] = useState<ActivityStats>({
    summariesToday: 0,
    tasksExecutedToday: 0,
    workspaceItems: 0,
    lastActivity: null,
  });

  useEffect(() => {
    const updateStats = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();

      // Count workspace items
      const workspaceItems = workspaceStore.getCount();

      // Count task executions today
      const executions = taskRunner.getExecutions(50);
      const tasksToday = executions.filter(
        (e) => e.completedAt && e.completedAt >= todayStart
      ).length;

      // Count summaries (workspace items with type 'task_result' or containing 'summary')
      const allItems = workspaceStore.getAll();
      const summariesToday = allItems.filter(
        (item) =>
          item.createdAt >= todayStart &&
          (item.type === 'task_result' || item.title.toLowerCase().includes('summary'))
      ).length;

      // Get last activity
      const lastExecution = executions
        .filter((e) => e.completedAt)
        .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0];

      const lastActivity = lastExecution
        ? new Date(lastExecution.completedAt || 0).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
        : null;

      setStats({
        summariesToday,
        tasksExecutedToday: tasksToday,
        workspaceItems,
        lastActivity,
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds

    // Listen for workspace changes
    const handleStorageChange = () => updateStats();
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (stats.summariesToday === 0 && stats.tasksExecutedToday === 0 && stats.workspaceItems === 0) {
    return null; // Don't show if no activity
  }

  return (
    <motion.div
      className="mb-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Recent System Activity
        </span>
      </div>
      <div className="flex items-center gap-6 text-sm">
        {stats.summariesToday > 0 && (
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">
              <span className="text-slate-300">{stats.summariesToday}</span>{' '}
              {stats.summariesToday === 1 ? 'page summarized' : 'pages summarized'}
            </span>
          </div>
        )}
        {stats.tasksExecutedToday > 0 && (
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">
              <span className="text-slate-300">{stats.tasksExecutedToday}</span>{' '}
              {stats.tasksExecutedToday === 1 ? 'action executed' : 'actions executed'}
            </span>
          </div>
        )}
        {stats.workspaceItems > 0 && (
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">
              <span className="text-slate-300">{stats.workspaceItems}</span>{' '}
              {stats.workspaceItems === 1 ? 'item saved to workspace' : 'items saved to workspace'}
            </span>
          </div>
        )}
        {stats.lastActivity && (
          <span className="text-xs text-slate-600 ml-auto">Last activity: {stats.lastActivity}</span>
        )}
      </div>
    </motion.div>
  );
}
