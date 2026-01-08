import React, { useState, useEffect, useRef } from 'react';
import { FileText, AlertTriangle, CheckCircle, Clock, Info, X } from 'lucide-react';

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: number;
  source?: string;
  taskId?: string;
}

interface LogPanelProps {
  logs: LogEntry[];
  isVisible: boolean;
  onClose: () => void;
  onLogClick?: (logId: string) => void;
  calmMode?: boolean; // CALM MODE: Hide logs by default
}

// RULE: Logs are append-only, no hidden operations
// Must show intent decisions, agent steps, errors, resource throttles
// No silent failures, no modals
export function LogPanel({ logs, isVisible, onClose, onLogClick, calmMode = false }: LogPanelProps) {
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(!calmMode); // CALM MODE: Collapse by default
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return <Info size={14} className="text-blue-400" />;
      case 'warn':
        return <AlertTriangle size={14} className="text-yellow-400" />;
      case 'error':
        return <AlertTriangle size={14} className="text-red-400" />;
      case 'debug':
        return <Clock size={14} className="text-gray-400" />;
      default:
        return <Info size={14} className="text-gray-400" />;
    }
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'text-blue-300';
      case 'warn':
        return 'text-yellow-300';
      case 'error':
        return 'text-red-300';
      case 'debug':
        return 'text-gray-300';
      default:
        return 'text-gray-300';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredLogs = logs.filter(log => {
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesSearch = !searchTerm ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.source && log.source.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesLevel && matchesSearch;
  });

  const getLogLevelCounts = () => {
    const counts = { all: logs.length, info: 0, warn: 0, error: 0 };
    logs.forEach(log => {
      counts[log.level] = (counts[log.level] || 0) + 1;
    });
    return counts;
  };

  const counts = getLogLevelCounts();

  if (!isVisible) return null;

  return (
    <div className="fixed right-4 top-20 w-96 h-96 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-400" />
          <h3 className="text-sm font-medium text-white">Live Logs</h3>
          {calmMode && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title={isExpanded ? 'Collapse logs' : 'Expand logs'}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <span className="text-xs text-gray-400 bg-slate-700 px-2 py-0.5 rounded">
            {logs.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Filters */}
      <div className="p-3 border-b border-slate-700 space-y-2">
        {/* Level filters */}
        <div className="flex gap-1">
          <button
            onClick={() => setFilterLevel('all')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              filterLevel === 'all'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setFilterLevel('info')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              filterLevel === 'info'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            Info ({counts.info})
          </button>
          <button
            onClick={() => setFilterLevel('warn')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              filterLevel === 'warn'
                ? 'bg-yellow-600 text-white'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            Warn ({counts.warn})
          </button>
          <button
            onClick={() => setFilterLevel('error')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              filterLevel === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            Error ({counts.error})
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
        />
      </div>

      {/* Log entries - CALM MODE: Collapsed by default */}
      {isExpanded && (
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-3 space-y-1"
        >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText size={24} className="mb-2 opacity-50" />
            <p className="text-xs mb-1">
              {logs.length === 0 ? 'No activity yet' : 'No logs match your filters'}
            </p>
            {logs.length === 0 && (
              <p className="text-xs text-gray-400">Start a task to see logs here</p>
            )}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`p-2 rounded text-xs cursor-pointer hover:bg-slate-800 transition-colors border-l-2 ${
                log.level === 'error' ? 'border-red-500 bg-red-500/5' :
                log.level === 'warn' ? 'border-yellow-500 bg-yellow-500/5' :
                log.level === 'info' ? 'border-blue-500 bg-blue-500/5' :
                'border-gray-500 bg-gray-500/5'
              }`}
              onClick={() => onLogClick?.(log.id)}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex-shrink-0">
                  {getLogIcon(log.level)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-mono ${getLogColor(log.level)} break-words`}>
                    {log.message}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-gray-500">
                    <span className="text-xs">{formatTimestamp(log.timestamp)}</span>
                    {log.source && (
                      <>
                        <span>•</span>
                        <span className="text-xs">{log.source}</span>
                      </>
                    )}
                    {log.taskId && (
                      <>
                        <span>•</span>
                        <span className="text-xs">Task: {log.taskId.slice(0, 8)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-700 bg-slate-900/50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Showing {filteredLogs.length} of {logs.length} logs</span>
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
            Live
          </span>
        </div>
      </div>
    </div>
  );
}
