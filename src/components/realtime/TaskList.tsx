import React from 'react';
import { useTaskStore } from '../../state/taskStore';
import { useTaskRealtime } from '../../hooks/useTaskRealtime';

export default function TaskList(): JSX.Element {
  // Connect to real-time task updates
  useTaskRealtime();

  const { tasks } = useTaskStore();

  // Sort by creation time (newest first)
  const sortedTasks = Object.values(tasks).sort((a, b) => b.createdAt - a.createdAt);

  const handleCancelTask = async (taskId: string) => {
    try {
      if (window.regen && window.regen.cancelTask) {
        await window.regen.cancelTask(taskId);
      }
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  return (
    <div className="p-2">
      <h3 className="text-sm font-semibold mb-2">Tasks</h3>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {sortedTasks.length === 0 ? (
          <div className="text-xs text-slate-500 py-2">No tasks yet</div>
        ) : (
          sortedTasks.map((task) => {
            const isActive = ['CREATED', 'RUNNING', 'PARTIAL'].includes(task.status);
            const canCancel = ['CREATED', 'RUNNING', 'PARTIAL'].includes(task.status);

            const statusColor = {
              CREATED: 'bg-blue-600',
              RUNNING: 'bg-yellow-600',
              PARTIAL: 'bg-green-600',
              DONE: 'bg-gray-600',
              FAILED: 'bg-red-600',
              CANCELLED: 'bg-orange-600',
            }[task.status] || 'bg-gray-600';

            return (
              <div key={task.id} className="flex items-center gap-2 py-1 px-2 rounded bg-slate-800/50">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{task.intent}</div>
                  <div className="text-xs text-slate-400">{task.id.slice(0, 8)}</div>
                </div>

                <div className="flex items-center gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                    {task.status}
                  </span>

                  {canCancel && (
                    <button
                      onClick={() => handleCancelTask(task.id)}
                      className="w-5 h-5 rounded bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors text-white font-bold"
                      title="Cancel task"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
