import React, { useEffect, useRef } from 'react';
import { Brain, Search, FileText, Zap, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface ThoughtStep {
  id: string;
  type: 'thinking' | 'searching' | 'analyzing' | 'generating' | 'complete' | 'error';
  content: string;
  timestamp: number;
  duration?: number;
}

interface ThoughtStreamProps {
  steps: ThoughtStep[];
  isActive: boolean;
  onStepClick?: (stepId: string) => void;
}

export function ThoughtStream({ steps, isActive, onStepClick }: ThoughtStreamProps) {
  const streamRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new steps arrive
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [steps]);

  const getStepIcon = (type: ThoughtStep['type']) => {
    switch (type) {
      case 'thinking':
        return <Brain size={16} className="text-blue-400" />;
      case 'searching':
        return <Search size={16} className="text-green-400" />;
      case 'analyzing':
        return <FileText size={16} className="text-purple-400" />;
      case 'generating':
        return <Zap size={16} className="text-yellow-400" />;
      case 'complete':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'error':
        return <AlertTriangle size={16} className="text-red-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStepColor = (type: ThoughtStep['type']) => {
    switch (type) {
      case 'thinking':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'searching':
        return 'border-green-500/20 bg-green-500/5';
      case 'analyzing':
        return 'border-purple-500/20 bg-purple-500/5';
      case 'generating':
        return 'border-yellow-500/20 bg-yellow-500/5';
      case 'complete':
        return 'border-green-500/20 bg-green-500/5';
      case 'error':
        return 'border-red-500/20 bg-red-500/5';
      default:
        return 'border-slate-600/20 bg-slate-900/50';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 1000) return 'now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Brain size={48} className="mb-4 opacity-50" />
        <p className="text-sm">Waiting for thought process to begin...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-blue-400" />
          <h3 className="text-sm font-medium text-white">Thought Stream</h3>
          {isActive && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-400">Active</span>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-400">
          {steps.length} step{steps.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Stream content */}
      <div
        ref={streamRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:scale-[1.02] ${getStepColor(step.type)}`}
            onClick={() => onStepClick?.(step.id)}
          >
            <div className="flex items-start gap-3">
              {/* Step icon */}
              <div className="mt-0.5 flex-shrink-0">
                {getStepIcon(step.type)}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-300 capitalize">
                    {step.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(step.timestamp)}
                  </span>
                  {step.duration && (
                    <span className="text-xs text-gray-500">
                      {formatDuration(step.duration)}
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-200 leading-relaxed">
                  {step.content}
                </div>

                {/* Connection line to next step */}
                {index < steps.length - 1 && (
                  <div className="mt-3 flex justify-center">
                    <div className="w-px h-4 bg-slate-600"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Active thinking indicator */}
        {isActive && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
            <Clock size={16} className="text-blue-400 animate-spin" />
            <div className="text-sm text-blue-300">
              Processing...
            </div>
            <div className="flex space-x-1 ml-auto">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with summary */}
      <div className="p-3 border-t border-slate-700 bg-slate-900/50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{steps.length} thoughts processed</span>
          <span>
            {steps.filter(s => s.type === 'complete').length} completed
            {steps.filter(s => s.type === 'error').length > 0 && (
              <span className="text-red-400 ml-2">
                {steps.filter(s => s.type === 'error').length} errors
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
