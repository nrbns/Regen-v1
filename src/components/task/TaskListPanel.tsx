/**
 * Task List Panel - ALWAYS VISIBLE
 * 
 * REAL-TIME LAUNCH REQUIREMENT:
 * - Always visible (left side)
 * - Shows: type, state, time running, Cancel button (always active)
 * - If user can't stop something → system is unsafe
 */

import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { listTasks, cancelTask, getTask } from '../../core/execution/taskManager';
import type { Task, TaskStatus } from '../../core/execution/task';
import { eventBus } from '../../core/execution/eventBus';

interface TaskListPanelProps {
  onTaskClick?: (taskId: string) => void;
  selectedTaskId?: string | null;
}

export function TaskListPanel({ onTaskClick, selectedTaskId }: TaskListPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [, setTick] = useState(0); // Force re-render for live timer
  const tabs = useTabsStore(state => state.tabs);

  useEffect(() => {
    const updateTasks = () => {
      setTasks(listTasks());
    };

    // Initial load
    updateTasks();

    // Listen to task events (NO POLLING)
    const handlers = [
      eventBus.on('task:created', updateTasks),
      eventBus.on('task:updated', updateTasks),
      eventBus.on('task:completed', updateTasks),
      eventBus.on('task:failed', updateTasks),
      eventBus.on('task:cancelled', updateTasks),
    ];

    // REAL-TIME UI: Update timer every second for running tasks
    const interval = setInterval(() => {
      const hasRunningTasks = listTasks().some(t => t.status === 'RUNNING');
      if (hasRunningTasks) {
        setTick(t => t + 1); // Force re-render to update timers
      }
    }, 1000);

    return () => {
      handlers.forEach(unsub => unsub());
      clearInterval(interval);
    };
  }, []);

  const formatTime = (startedAt: number | null): string => {
    if (!startedAt) return '-';
    const duration = Math.floor((Date.now() - startedAt) / 1000);
    if (duration < 60) return `${duration}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'CREATED':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'RUNNING':
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'DONE':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'CANCELED':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleCancel = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    cancelTask(taskId);
  };

  // Sort: running first, then by creation time (newest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'RUNNING' && b.status !== 'RUNNING') return -1;
    if (b.status === 'RUNNING' && a.status !== 'RUNNING') return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-slate-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Tasks</span>
          <span className="text-xs text-gray-400 bg-slate-800 px-2 py-0.5 rounded">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        {sortedTasks.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No tasks
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {sortedTasks.map((task) => {
              const isRunning = task.status === 'RUNNING';
              const isSelected = selectedTaskId === task.id;
              
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick?.(task.id)}
                  className={`
                    p-3 cursor-pointer transition-colors
                    ${isSelected ? 'bg-slate-800' : 'hover:bg-slate-800/50'}
                  `}
                >
                  <div className="flex items-start gap-2">
                    {/* Status Icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {getStatusIcon(task.status)}
                    </div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-white truncate">
                          {task.type}
                        </div>
                        {/* Tab Reference Badge */}
                        {task.meta?.currentTabId && (() => {
                          const sourceTab = tabs.find(t => t.id === task.meta.currentTabId);
                          if (sourceTab) {
                            const tabIndex = tabs.findIndex(t => t.id === sourceTab.id) + 1;
                            return (
                              <span className="flex-shrink-0 text-xs text-gray-500 bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Globe size={10} />
                                {tabIndex}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${
                          task.status === 'RUNNING' ? 'text-yellow-400' :
                          task.status === 'DONE' ? 'text-green-400' :
                          task.status === 'FAILED' ? 'text-red-400' :
                          task.status === 'CANCELED' ? 'text-gray-400' :
                          'text-blue-400'
                        }`}>
                          {task.status}
                        </span>
                        {isRunning && task.startedAt && (
                          <>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-400">
                              {formatTime(task.startedAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Cancel Button - ALWAYS ACTIVE for running tasks */}
                    {isRunning && (
                      <button
                        onClick={(e) => handleCancel(task.id, e)}
                        className="flex-shrink-0 p-1 hover:bg-red-600/20 rounded transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
