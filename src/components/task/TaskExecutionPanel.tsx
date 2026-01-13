/**
 * Task Execution Panel - Always visible task list
 * Shows current state and all tasks
 * NO FAKE STATES - Only truth
 */

import React from 'react';
import { X, Circle, Sparkles, Command, Search } from 'lucide-react';
import { listTasks, getSystemState, cancelTask, getTask } from '../../core/execution/taskManager';
import type { Task } from '../../core/execution/task';

interface TaskExecutionPanelProps {
  onTaskClick?: (taskId: string) => void;
  selectedTaskId?: string | null;
}

export function TaskExecutionPanel({ onTaskClick, selectedTaskId }: TaskExecutionPanelProps) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [systemState, setSystemState] = React.useState<'idle' | 'running'>('idle');

  React.useEffect(() => {
    const updateTasks = () => {
      setTasks(listTasks());
      setSystemState(getSystemState());
    };

    // Update immediately
    updateTasks();

    // Listen to task events from event bus
    let cleanup: (() => void)[] = [];
    
    import('../../core/execution/eventBus').then(({ eventBus }) => {
      const handlers = [
        eventBus.on('task:created', updateTasks),
        eventBus.on('task:updated', updateTasks),
        eventBus.on('task:completed', updateTasks),
        eventBus.on('task:cancelled', updateTasks),
      ];
      
      cleanup = handlers;
    }).catch(() => {
      // Event bus not available, continue with polling only
    });

    // ENFORCEMENT: No polling - only event-driven updates
    // Remove setInterval - UI updates only via eventBus events
    // The event handlers above already call updateTasks on every change

    return () => {
      cleanup.forEach(unsub => unsub());
      // No interval to clear - pure event-driven
    };
  }, []);

  const handleCancel = (taskId: string) => {
    cancelTask(taskId);
    setTasks(listTasks());
    setSystemState(getSystemState());
  };

  const formatDuration = (task: Task): string => {
    if (!task.startedAt) return '-';
    const end = task.endedAt || Date.now();
    const duration = Math.floor((end - task.startedAt) / 1000);
    return `${duration}s`;
  };

  const getStatusColor = (status: Task['status']): string => {
    switch (status) {
      case 'CREATED': return 'text-gray-400';
      case 'RUNNING': return 'text-blue-400';
      case 'DONE': return 'text-green-400';
      case 'FAILED': return 'text-red-400';
      case 'CANCELED': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getTaskIcon = (type: string) => {
    if (type.includes('explain')) return <Sparkles className="w-4 h-4" />;
    if (type.includes('command')) return <Command className="w-4 h-4" />;
    return <Search className="w-4 h-4" />;
  };

  return (
    <div className="w-64 h-full bg-slate-900 border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${systemState === 'running' ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm font-medium text-white">Tasks</span>
        </div>
        <span className="text-xs text-gray-400">{tasks.length}</span>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No tasks
          </div>
        ) : (
          tasks.slice().reverse().map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task.id)}
              className={`bg-slate-800/50 border rounded p-2 text-xs cursor-pointer transition-colors ${
                selectedTaskId === task.id
                  ? 'border-blue-500 bg-slate-800'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`${getStatusColor(task.status)}`}>
                      {getTaskIcon(task.type)}
                    </div>
                    <span className="text-white font-medium truncate">{task.type}</span>
                    <Circle className={`w-2 h-2 ${getStatusColor(task.status)}`} fill="currentColor" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${getStatusColor(task.status)}`}>{task.status}</span>
                    {task.startedAt && (
                      <span className="text-gray-400 text-xs">
                        {formatDuration(task)}
                      </span>
                    )}
                  </div>
                </div>
                {task.status === 'RUNNING' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel(task.id);
                    }}
                    className="text-red-400 hover:text-red-300 p-1 transition-colors"
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
