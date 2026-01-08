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

interface IntelligenceNodeProps {
  task: Task;
  onExpand: (taskId: string) => void;
  onClose: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onRetry?: (taskId: string) => void;
  onSwitchModel?: (model: 'local' | 'online') => void;
  position: { x: number; y: number };
  isMinimized?: boolean;
  // Thought stream for real execution visibility
  steps?: Array<{
    id: string;
    type: 'thinking' | 'analyzing' | 'generating' | 'error';
    content: string;
    timestamp: number;
    duration?: number;
  }>;
  // Context peek - shows what input was used
  context?: {
    inputType: 'selected_text' | 'page_content' | 'command';
    wordCount: number;
    readingTime: number;
    source: string;
    url?: string;
  };
}

export function IntelligenceNode({
  task,
  onExpand,
  onClose,
  onCancel,
  onRetry,
  onSwitchModel,
  position,
  isMinimized = false,
  steps = [],
  context
}: IntelligenceNodeProps) {
  const [isHovered, setIsHovered] = useState(false);

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

  const getStatusColor = () => {
    switch (task.status) {
      case 'created':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'running':
        return 'border-yellow-500/30 bg-yellow-500/5 shadow-yellow-500/20 shadow-lg';
      case 'partial':
        return 'border-orange-500/30 bg-orange-500/5';
      case 'done':
        return 'border-green-500/30 bg-green-500/5';
      case 'failed':
        return 'border-red-500/30 bg-red-500/5';
      case 'cancelled':
        return 'border-gray-500/30 bg-gray-500/5';
      default:
        return 'border-slate-600/30 bg-slate-900/50';
    }
  };

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
        className={`fixed w-3 h-3 rounded-full ${getStatusColor()} cursor-pointer transition-all duration-300 hover:scale-125`}
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

            {/* Context Peek - Shows what input was used */}
            {context && (
              <div className="mt-1 text-xs text-gray-400 space-y-0.5">
                <div>• {context.inputType === 'selected_text' ? 'Selected text' :
                             context.inputType === 'page_content' ? 'Page content' : 'Command input'}</div>
                <div>• {context.wordCount} words ({context.readingTime} min read)</div>
                <div>• {context.source}</div>
              </div>
            )}

            {/* Thought Stream - Real execution visibility */}
            {steps.length > 0 && (
              <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                {steps.slice(-3).map((step) => (
                  <div key={step.id} className="text-xs text-gray-300 flex items-center gap-1">
                    <div className={`w-1 h-1 rounded-full ${
                      step.type === 'thinking' ? 'bg-blue-400' :
                      step.type === 'analyzing' ? 'bg-yellow-400' :
                      step.type === 'generating' ? 'bg-green-400' :
                      'bg-red-400'
                    }`} />
                    <span className="truncate">{step.content}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mt-1">
              {getModelBadge()}
              <span className="text-xs text-gray-400">
                {formatTime(task.createdAt)}
              </span>
            </div>
          </div>

          {/* Interrupt Controls - Every task must have these */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Cancel - only for running tasks */}
            {task.status === 'running' && onCancel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(task.id);
                }}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                title="Cancel"
              >
                <X size={12} />
              </button>
            )}

            {/* Retry - for failed/cancelled tasks */}
            {(task.status === 'failed' || task.status === 'cancelled') && onRetry && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry(task.id);
                }}
                className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                title="Retry"
              >
                <Clock size={12} />
              </button>
            )}

            {/* Expand - for detailed view */}
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
