import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, Pause, Play, ChevronDown, ChevronUp, Cpu, HardDrive, Wifi, Zap } from 'lucide-react';

export interface Task {
  id: string;
  intent: string;
  status: 'created' | 'running' | 'partial' | 'done' | 'failed' | 'cancelled';
  model: 'local' | 'online';
  output: string[];
  logs: string[];
  createdAt: number;
  error?: string;
}

export interface AIPanelProps {
  task: Task | null;
  onCancel: () => void;
  onRetry: () => void;
  onClose: () => void;
  isVisible: boolean;
  resources?: {
    cpu: number;
    ram: number;
    network: boolean;
  };
}

export function AIPanel({ task, onCancel, onRetry, onClose, isVisible, resources }: AIPanelProps) {
  const [expandedLogs, setExpandedLogs] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [task?.output]);

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'created':
        return 'text-blue-400';
      case 'running':
        return 'text-yellow-400';
      case 'partial':
        return 'text-orange-400';
      case 'done':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'cancelled':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getModelDisplay = (model: Task['model']) => {
    return model === 'local'
      ? 'Local (Fast, Private)'
      : 'Online (Stronger Reasoning)';
  };

  if (!isVisible || !task) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-700 shadow-xl z-40 transform transition-transform duration-300 ease-in-out">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-col h-full">
        {/* Task Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-400">Task</div>
              <div className="text-white font-medium">{task.intent}</div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">Status</div>
                <div className={`text-sm font-medium ${getStatusColor(task.status)}`}>
                  {task.status.toUpperCase()}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-400">Model</div>
                <div className="text-sm text-gray-300">{getModelDisplay(task.model)}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {task.status === 'running' && (
                <button
                  onClick={onCancel}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  Cancel
                </button>
              )}

              {task.status === 'failed' && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  <RotateCcw size={14} className="inline mr-1" />
                  Retry
                </button>
              )}

              <button
                onClick={onClose}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Streaming Output */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-slate-700">
            <h3 className="text-sm font-medium text-gray-300">Output</h3>
          </div>

          <div
            ref={outputRef}
            className="flex-1 p-4 overflow-y-auto text-sm text-gray-200 font-mono bg-slate-950"
          >
            {task.output.length === 0 ? (
              <div className="text-gray-500 italic">Waiting for response...</div>
            ) : (
              <div className="space-y-1">
                {task.output.map((line, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {line}
                  </div>
                ))}
                {task.status === 'running' && (
                  <div className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1"></div>
                )}
              </div>
            )}

            {task.error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300">
                <div className="font-medium mb-1">Error:</div>
                <div>{task.error}</div>
              </div>
            )}
          </div>
        </div>

        {/* Live Logs (Collapsible) */}
        <div className="border-t border-slate-700">
          <button
            onClick={() => setExpandedLogs(!expandedLogs)}
            className="w-full px-4 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors"
          >
            <h3 className="text-sm font-medium text-gray-300">Live Logs</h3>
            {expandedLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {expandedLogs && (
            <div className="px-4 pb-4 max-h-48 overflow-y-auto">
              <div className="space-y-1 text-xs font-mono text-gray-400 bg-slate-950 p-3 rounded">
                {task.logs.length === 0 ? (
                  <div className="italic">No logs yet...</div>
                ) : (
                  task.logs.map((log, index) => (
                    <div key={index} className="whitespace-pre-wrap">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Resource Bar */}
        {resources && (
          <div className="border-t border-slate-700 p-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Cpu size={12} />
                  <span>CPU {resources.cpu}%</span>
                </div>

                <div className="flex items-center gap-1">
                  <HardDrive size={12} />
                  <span>RAM {resources.ram}%</span>
                </div>

                <div className="flex items-center gap-1">
                  <Wifi size={12} className={resources.network ? 'text-green-400' : 'text-red-400'} />
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Zap size={12} className="text-yellow-400" />
                <span>{getModelDisplay(task.model)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
