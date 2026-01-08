import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export interface TaskSummary {
  id: string;
  intent: string;
  status: 'created' | 'running' | 'partial' | 'done' | 'failed' | 'cancelled';
  createdAt: number;
  model: 'local' | 'online';
}

export interface TaskListProps {
  tasks: TaskSummary[];
  onSelectTask?: (taskId: string) => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function TaskList({ tasks, onSelectTask, isMinimized = false, onToggleMinimize }: TaskListProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const getStatusIcon = (status: TaskSummary['status']) => {
    switch (status) {
      case 'created':
        return <Clock size={14} className="text-blue-400" />;
      case 'running':
        return <Clock size={14} className="text-yellow-400 animate-spin" />;
      case 'partial':
        return <AlertTriangle size={14} className="text-orange-400" />;
      case 'done':
        return <CheckCircle size={14} className="text-green-400" />;
      case 'failed':
        return <XCircle size={14} className="text-red-400" />;
      case 'cancelled':
        return <XCircle size={14} className="text-gray-400" />;
      default:
        return <Clock size={14} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: TaskSummary['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} mins ago`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  // Sort tasks by creation time (newest first)
  const sortedTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700 transition-colors"
        onClick={onToggleMinimize}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white">Tasks</h3>
          <span className="text-xs text-gray-400 bg-slate-700 px-2 py-1 rounded">
            {tasks.length}
          </span>
        </div>
        {onToggleMinimize && (
          isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />
        )}
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="max-h-64 overflow-y-auto">
          {sortedTasks.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No tasks yet
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {sortedTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className={`p-3 cursor-pointer hover:bg-slate-700 transition-colors ${
                    selectedTaskId === task.id ? 'bg-slate-700' : ''
                  }`}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    onSelectTask?.(task.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getStatusIcon(task.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">
                        {task.intent}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {getStatusText(task.status)}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          {task.model}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          {formatTime(task.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {sortedTasks.length > 5 && (
                <div className="p-3 text-center text-xs text-gray-500">
                  +{sortedTasks.length - 5} more tasks
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}