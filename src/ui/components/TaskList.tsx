import React from 'react';
import { useTaskStore } from '../../state/taskStore';
import { TaskService } from '../../services/taskService';
import { Task } from '../../../core/execution/task';

/**
 * Task List - Shows all active and recent tasks
 */
export function TaskList() {
  const { tasks, getAllTasks } = useTaskStore();
  const allTasks = getAllTasks();

  // Sort by creation time, newest first
  const sortedTasks = [...allTasks].sort((a, b) => b.createdAt - a.createdAt);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREATED': return 'text-gray-400';
      case 'RUNNING': return 'text-blue-400';
      case 'PARTIAL': return 'text-yellow-400';
      case 'PAUSED': return 'text-orange-400';
      case 'DONE': return 'text-green-400';
      case 'FAILED': return 'text-red-400';
      case 'CANCELLED': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CREATED': return '⏳';
      case 'RUNNING': return '🔄';
      case 'PARTIAL': return '📝';
      case 'PAUSED': return '⏸️';
      case 'DONE': return '✅';
      case 'FAILED': return '❌';
      case 'CANCELLED': return '🚫';
      default: return '❓';
    }
  };

  const handleCancelTask = async (taskId: string) => {
    await TaskService.cancelTask(taskId);
  };

  return (
    <div className="space-y-2 p-3 overflow-y-auto max-h-64">
      {sortedTasks.length === 0 ? (
        <div className="text-slate-500 text-sm text-center py-4">
          No tasks yet. Try selecting text or entering a command.
        </div>
      ) : (
        sortedTasks.map((task) => (
          <div
            key={task.id}
            className="p-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-750 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{getStatusIcon(task.status)}</span>
                <span className={`text-xs font-medium ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>
              {(task.status === 'RUNNING' || task.status === 'PARTIAL') && (
                <button
                  onClick={() => handleCancelTask(task.id)}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded"
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="text-xs text-slate-300 truncate">
              {task.intent}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {new Date(task.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
