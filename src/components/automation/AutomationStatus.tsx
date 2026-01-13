/**
 * Automation Status Component - LAYER 4: Visible
 * 
 * Shows running automations with cancel button
 * Displays automation status in UI for user visibility
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { automationEngine, type AutomationExecution } from '../../core/automation/engine';

export function AutomationStatus() {
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Initial load
    setExecutions(automationEngine.getExecutions());

    // Subscribe to updates
    const unsubscribe = automationEngine.onExecutionsChange((execs) => {
      setExecutions(execs);
    });

    return unsubscribe;
  }, []);

  const runningExecutions = executions.filter(e => e.status === 'running');
  const hasRunning = runningExecutions.length > 0;

  const handleCancel = (executionId: string) => {
    automationEngine.cancelExecution(executionId);
  };

  const formatDuration = (startTime: number, endTime?: number) => {
    const duration = (endTime || Date.now()) - startTime;
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const getStatusIcon = (status: AutomationExecution['status']) => {
    switch (status) {
      case 'running':
        return <Clock className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      case 'timeout':
        return <AlertCircle className="w-4 h-4 text-orange-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: AutomationExecution['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (!hasRunning && executions.length === 0) {
    return null; // Don't show if no automations
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-white">Automations</span>
            {hasRunning && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                {runningExecutions.length} running
              </span>
            )}
          </div>
          {hasRunning && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              {formatDuration(runningExecutions[0].startTime)}
            </div>
          )}
        </div>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-700"
            >
              <div className="max-h-64 overflow-y-auto p-2 space-y-2">
                {executions.length === 0 ? (
                  <div className="text-center py-4 text-sm text-slate-400">
                    No automations
                  </div>
                ) : (
                  executions.map((execution) => (
                    <motion.div
                      key={execution.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getStatusIcon(execution.status)}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white truncate">
                            {execution.action.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-slate-400">
                            {getStatusText(execution.status)} • {formatDuration(execution.startTime, execution.endTime)}
                          </div>
                        </div>
                      </div>
                      {execution.status === 'running' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(execution.id);
                          }}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                          title="Cancel automation"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
