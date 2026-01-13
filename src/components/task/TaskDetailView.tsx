/**
 * Task Detail View - Transparency Zone
 * 
 * Shows when task is running or clicked
 * 
 * Displays:
 * - Task name
 * - Input (what user provided)
 * - Execution details (Processor, Started, Status)
 * - Output (streaming)
 * - Cancel button
 */

import React, { useState, useEffect } from 'react';
import { X, Clock, Cpu, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getTask, cancelTask, listTasks } from '../../core/execution/taskManager';
import type { Task } from '../../core/execution/task';

interface TaskDetailViewProps {
  taskId: string | null;
  onClose: () => void;
}

export function TaskDetailView({ taskId, onClose }: TaskDetailViewProps) {
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }

    const updateTask = () => {
      const t = getTask(taskId);
      setTask(t || null);
    };

    updateTask();

    // Listen to task updates
    import('../../core/execution/eventBus').then(({ eventBus }) => {
      const handlers = [
        eventBus.on('task:updated', (updatedTask: Task) => {
          if (updatedTask.id === taskId) updateTask();
        }),
        eventBus.on('task:completed', (completedTask: Task) => {
          if (completedTask.id === taskId) updateTask();
        }),
        eventBus.on('task:cancelled', (cancelledTask: Task) => {
          if (cancelledTask.id === taskId) updateTask();
        }),
      ];

      return () => {
        handlers.forEach(unsub => unsub());
      };
    }).catch(() => {});

    // ENFORCEMENT: No polling - update only via eventBus
    // Event handlers above already call updateTask on changes
    // No interval needed - pure event-driven
  }, [taskId]);

  if (!task) return null;

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = () => {
    if (!task.startedAt) return '-';
    const end = task.endedAt || Date.now();
    const duration = Math.floor((end - task.startedAt) / 1000);
    return `${duration}s`;
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case 'RUNNING':
        return <Clock className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'DONE':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'CANCELED':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleCancel = () => {
    if (task.status === 'RUNNING') {
      cancelTask(task.id);
    }
  };

  return (
    <div className="fixed top-12 right-0 w-96 h-[calc(100vh-12px-32px)] bg-slate-900 border-l border-slate-700 z-40 flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-slate-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-white">{task.type}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Reason */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2">REASON</h3>
          <div className="bg-slate-800 rounded p-3 text-sm text-gray-300">
            {task.meta?.reason || 'User action'}
          </div>
        </div>

        {/* Input */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2">INPUT</h3>
          <div className="bg-slate-800 rounded p-3 text-sm text-gray-300">
            {task.meta?.input ? (
              <div>
                <div className="text-gray-400 text-xs mb-1">Input</div>
                <div className="whitespace-pre-wrap break-words">{task.meta.input}</div>
              </div>
            ) : task.meta?.selectedText ? (
              <div>
                <div className="text-gray-400 text-xs mb-1">Selected text ({task.meta.selectedText.length} chars)</div>
                <div className="whitespace-pre-wrap break-words">{task.meta.selectedText}</div>
              </div>
            ) : task.meta?.command ? (
              <div>
                <div className="text-gray-400 text-xs mb-1">Command</div>
                <div className="break-words">{task.meta.command}</div>
              </div>
            ) : (
              <div className="text-gray-500">No input</div>
            )}
            {task.meta?.currentUrl && (
              <div className="mt-2 text-xs text-gray-400">
                URL: <span className="text-gray-300 break-all">{task.meta.currentUrl}</span>
              </div>
            )}
          </div>
        </div>

        {/* Execution */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2">EXECUTION</h3>
          <div className="bg-slate-800 rounded p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Processor:</span>
              <span className="text-white">Local</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Started:</span>
              <span className="text-white">{formatTime(task.startedAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Duration:</span>
              <span className="text-white">{formatDuration()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={`${
                task.status === 'RUNNING' ? 'text-blue-400' :
                task.status === 'DONE' ? 'text-green-400' :
                task.status === 'FAILED' ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {task.status}
              </span>
            </div>
          </div>
        </div>

        {/* Logs */}
        {task.logs.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-400 mb-2">LOGS</h3>
            <div className="bg-slate-800 rounded p-3 max-h-32 overflow-y-auto">
              <div className="space-y-1 text-xs font-mono text-gray-400">
                {task.logs.map((log, i) => (
                  <div key={i} className="truncate">{log}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Output */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2">OUTPUT</h3>
          <div className="bg-slate-800 rounded p-3 min-h-[100px] max-h-[300px] overflow-y-auto">
            {task.output.length > 0 ? (
              <div className="text-sm text-gray-300 whitespace-pre-wrap">
                {task.output.join('')}
              </div>
            ) : task.status === 'RUNNING' ? (
              <div className="text-gray-500 text-sm">Processing...</div>
            ) : (
              <div className="text-gray-500 text-sm">No output yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="h-12 border-t border-slate-700 flex items-center justify-end px-4">
        {task.status === 'RUNNING' && (
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            Cancel Task
          </button>
        )}
      </div>
    </div>
  );
}
