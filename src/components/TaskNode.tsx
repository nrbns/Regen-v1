import React, { useState, useEffect } from 'react';
import { Brain, Clock, CheckCircle, XCircle, AlertTriangle, X, Expand } from 'lucide-react';

interface Task {
  id: string;
  intent: string;
  status: 'created' | 'running' | 'partial' | 'done' | 'failed' | 'cancelled';
  model: 'local' | 'online';
  createdAt: number;
  progress?: number;
}

interface TaskNodeProps {
  task: Task;
  onExpand: (taskId: string) => void;
  onClose: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onRetry?: (taskId: string) => void;
  onSwitchModel?: (taskId: string, model: 'local' | 'online') => void;
  position: { x: number; y: number };
  isMinimized?: boolean;
}

export function TaskNode({
  task,
  onExpand,
  onClose,
  onCancel,
  onRetry,
  onSwitchModel,
  position,
  isMinimized = false
}: TaskNodeProps) {
  const [isHovered, setIsHovered] = useState(false);

  // RULE: If something is running, it MUST be visible
  // Pulse animation for running tasks - must be noticeable but not annoying
  const pulseIntensity = task.status === 'running' ? 'animate-pulse' : '';

  // RULE: Status colors must reflect reality
  const getRealStatusColor = () => {
    switch (task.status) {
      case 'created':
        return 'border-blue-500/30 bg-blue-500/5'; // Just created, waiting
      case 'running':
        return 'border-yellow-500/40 bg-yellow-500/8 shadow-yellow-500/20 shadow-lg'; // Actively running
      case 'partial':
        return 'border-orange-500/40 bg-orange-500/8'; // Partial results
      case 'done':
        return 'border-green-500/30 bg-green-500/5'; // Successfully completed
      case 'failed':
        return 'border-red-500/30 bg-red-500/5'; // Failed - neutral red, no alerts
      case 'cancelled':
        return 'border-gray-500/30 bg-gray-500/5'; // Cancelled by user
      default:
        return 'border-slate-600/30 bg-slate-900/50'; // Unknown state
    }
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case 'created':
        return <Clock size={12} className="text-blue-400" />;
      case 'running':
        return <Clock size={12} className="text-yellow-400 animate-spin" />;
      case 'partial':
        return <AlertTriangle size={12} className="text-orange-400" />;
      case 'done':
        return <CheckCircle size={12} className="text-green-400" />;
      case 'failed':
        return <XCircle size={12} className="text-red-400" />;
      case 'cancelled':
        return <XCircle size={12} className="text-gray-400" />;
      default:
        return <Brain size={12} className="text-gray-400" />;
    }
  };

  // Use real status colors - no faking
  const getStatusColor = getRealStatusColor;

  const getModelBadge = () => {
    return task.model === 'local' ? (
      <span className="text-xs text-green-400 font-medium">L</span>
    ) : (
      <span className="text-xs text-blue-400 font-medium">O</span>
    );
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);

    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  if (isMinimized) {
    return (
      <div
        className={`fixed w-3 h-3 rounded-full ${getStatusColor()} ${pulseIntensity} cursor-pointer transition-all duration-300 hover:scale-125`}
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)'
        }}
        onClick={() => onExpand(task.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isHovered && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {task.intent}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`fixed ${getStatusColor()} backdrop-blur-sm rounded-lg border transition-all duration-300 hover:scale-105 cursor-pointer group`}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Node content */}
      <div className="p-3 min-w-48">
        <div className="flex items-start gap-3">
          {/* Status indicator */}
          <div className="mt-0.5">
            {getStatusIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white font-medium truncate">
              {task.intent}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {getModelBadge()}
              <span className="text-xs text-gray-400">
                {formatTime(task.createdAt)}
              </span>
            </div>

            {/* Progress bar for running tasks */}
            {task.status === 'running' && task.progress !== undefined && (
              <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
                <div
                  className={`h-full transition-all duration-500 ${
                    task.progress > 80 ? 'bg-red-500' :
                    task.progress > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Actions - ABSOLUTE USER CONTROL */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand(task.id);
              }}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Expand"
            >
              <Expand size={12} />
            </button>

            {/* Cancel - only show for running tasks */}
            {task.status === 'running' && onCancel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(task.id);
                  // Show immediate feedback
                  const btn = e.currentTarget as HTMLButtonElement;
                  const originalText = btn.innerHTML;
                  btn.innerHTML = '⏸️';
                  btn.title = 'Stopping...';
                  setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.title = 'Cancel';
                  }, 1000);
                }}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                title="Cancel"
              >
                <X size={12} />
              </button>
            )}

            {/* Retry - only show for failed tasks */}
            {task.status === 'failed' && onRetry && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry(task.id);
                }}
                className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                title="Retry"
              >
                ↻
              </button>
            )}

            {/* Model Switch - show for running/created tasks */}
            {(task.status === 'running' || task.status === 'created') && onSwitchModel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newModel = task.model === 'local' ? 'online' : 'local';
                  onSwitchModel(task.id, newModel);
                }}
                className="p-1 text-gray-400 hover:text-yellow-400 transition-colors text-xs"
                title={`Switch to ${task.model === 'local' ? 'Online' : 'Local'} model`}
              >
                {task.model === 'local' ? 'O' : 'L'}
              </button>
            )}

            {/* Close */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(task.id);
              }}
              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
              title="Close"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Subtle pulse for running tasks */}
      {task.status === 'running' && (
        <div className="absolute inset-0 rounded-lg border border-yellow-500/20 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
