import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Play, CheckCircle, XCircle, Loader2, Clock, Sparkles, FileText, Link2, BarChart3, Zap, Eye } from 'lucide-react';
import { taskRunner, type TaskDefinition, type TaskExecution } from '../lib/tasks/TaskRunner';
import { showToast } from '../components/ui/Toast';
import { AutomaticSuggestions } from '../components/ui/AutomaticSuggestions';
import { ActivityTimeline } from '../components/ui/ActivityTimeline';
import { useTabsStore } from '../state/tabsStore';
import { workspaceStore } from '../lib/workspace/WorkspaceStore';
import { contextMemory } from '../lib/services/ContextMemory';
import { useRegenCore } from '../core/regen-core/regenCore.store';

export default function TaskRunner() {
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ taskId: string; result: any; timestamp: number } | null>(null);
  const { state: regenCoreState, observation, report } = useRegenCore();
  const activeTab = useTabsStore((state) => {
    const tabs = state.tabs;
    return tabs.find((t) => t.id === state.activeTabId);
  });

  useEffect(() => {
    setTasks(taskRunner.getAvailableTasks());
    setExecutions(taskRunner.getExecutions(10));

    const unsubscribe = taskRunner.onExecution((execution) => {
      setExecutions(prev => {
        const filtered = prev.filter(e => e.id !== execution.id);
        return [...filtered, execution].slice(-10);
      });

      if (execution.status === 'completed') {
        setExecutingTaskId(null);
        setLastResult({
          taskId: execution.taskId,
          result: execution.result,
          timestamp: execution.completedAt || Date.now(),
        });
      } else if (execution.status === 'failed') {
        setExecutingTaskId(null);
      }
    });

    return unsubscribe;
  }, []);

  const handleExecuteTask = async (taskId: string) => {
    if (executingTaskId) return; // Prevent concurrent execution

    setExecutingTaskId(taskId);
    try {
      const task = tasks.find(t => t.id === taskId);
      const currentUrl = activeTab?.url || window.location.href;
      
      showToast(`Starting: ${getContextualTaskName(taskId, currentUrl)}`, 'info');
      
      const execution = await taskRunner.executeTask(taskId, { url: currentUrl });
      
      if (execution.status === 'completed' && execution.result) {
        // Show effect feedback
        const effectMessage = getEffectMessage(taskId, execution.result);
        showToast(effectMessage, 'success');
        
        // Record action in context memory
        contextMemory.recordAction(taskId, currentUrl, true);
        
        // Auto-save to workspace
        try {
          workspaceStore.add({
            title: `${task?.name || taskId} - ${new Date().toLocaleDateString()}`,
            content: typeof execution.result === 'string' 
              ? execution.result 
              : JSON.stringify(execution.result, null, 2),
            type: 'task_result',
            metadata: { taskId, url: currentUrl, timestamp: execution.completedAt },
          });
        } catch (error) {
          console.warn('Failed to save to workspace:', error);
        }
      } else if (execution.status === 'failed') {
        // Record failed action
        contextMemory.recordAction(taskId, currentUrl, false);
      }
    } catch (error) {
      const task = tasks.find(t => t.id === taskId);
      showToast(`Failed: ${task?.name || taskId}`, 'error');
      console.error('Task execution failed:', error);
    }
  };

  const getContextualTaskName = (taskId: string, url: string): string => {
    const contextualNames: Record<string, string> = {
      summarize_page: `Summarize this page`,
      extract_links: `Extract links from current tab`,
      analyze_content: `Analyze reading intent`,
    };
    return contextualNames[taskId] || taskId;
  };

  const getEffectMessage = (taskId: string, result: any): string => {
    if (taskId === 'summarize_page') {
      return `RESULT GENERATED: Summary created`;
    } else if (taskId === 'extract_links') {
      const linkCount = Array.isArray(result) ? result.length : 0;
      return `RESULT GENERATED: ${linkCount} links extracted`;
    } else if (taskId === 'analyze_content') {
      return `RESULT GENERATED: Content analyzed — ${typeof result === 'string' ? result.substring(0, 25) : 'Analysis complete'}`;
    }
    return `RESULT GENERATED: Action completed`;
  };

  const getTaskIcon = (taskId: string) => {
    switch (taskId) {
      case 'summarize_page':
        return FileText;
      case 'extract_links':
        return Link2;
      case 'analyze_content':
        return BarChart3;
      default:
        return Sparkles;
    }
  };

  const getStatusIcon = (status: TaskExecution['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      {/* Removed LiveContextStrip - Regen Core (Sentinel Spine) provides global presence */}

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto w-full">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Brain className="w-8 h-8 text-purple-400" />
                </motion.div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-300">
                    Observations
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">Regen Core Log</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 italic">
              Detected patterns, suggested actions, and dismissed insights. This is a transparency view — Regen observes automatically.
            </p>
          </motion.div>

          {/* Regen Core Observations - Show if any observations exist */}
          {regenCoreState !== 'observing' && observation && (
            <motion.div
              className="mb-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-3">
                <div className="w-1 h-full bg-purple-400/40 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm text-slate-300 mb-2 font-medium">
                    {observation.statement}
                  </p>
                  {observation.reasoning && (
                    <p className="text-xs text-slate-500 mb-3 italic">{observation.reasoning}</p>
                  )}
                  {regenCoreState === 'noticing' && observation.action && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-purple-400 font-medium">
                        {observation.actionLabel || 'ACTION AVAILABLE'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Automatic Suggestions */}
          <div className="mb-6">
            <AutomaticSuggestions maxSuggestions={3} />
          </div>

          {/* Detected Patterns & Suggestions */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-slate-300">Available Actions</h2>
              {activeTab && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Eye className="w-3 h-3" />
                  <span>{activeTab.title || 'Current Tab'}</span>
                </div>
              )}
            </div>
            
            {/* Show suggestions first - detect if page should have suggestions */}
            {activeTab && activeTab.url && !activeTab.url.startsWith('about:') && (
              <motion.div
                className="mb-4 p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-400 mb-2">
                      Summary available for this page
                    </p>
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={() => handleExecuteTask('summarize_page')}
                        disabled={executingTaskId !== null}
                        className="text-xs px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={executingTaskId === null ? { scale: 1.02 } : {}}
                        whileTap={executingTaskId === null ? { scale: 0.98 } : {}}
                      >
                        View suggestion
                      </motion.button>
                      <button
                        className="text-xs px-3 py-1.5 text-slate-500 hover:text-slate-400 rounded transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Manual Override - Collapsible section for testing */}
            {tasks.length > 0 && (
              <details className="bg-slate-800/20 border border-slate-700/30 rounded-lg mt-4">
                <summary className="px-4 py-2.5 text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors list-none">
                  Manual override (testing only)
                </summary>
                <div className="p-4 pt-2 border-t border-slate-700/30 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {tasks.map((task, index) => {
                    const Icon = getTaskIcon(task.id);
                    const contextualName = getContextualTaskName(task.id, activeTab?.url || '');
                    return (
                      <motion.button
                        key={task.id}
                        onClick={() => handleExecuteTask(task.id)}
                        disabled={executingTaskId !== null}
                        className={`flex items-center gap-2 px-2.5 py-1.5 text-xs bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/50 rounded text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          executingTaskId === task.id ? 'border-slate-500 bg-slate-700/70' : ''
                        }`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: index * 0.03 }}
                        whileHover={executingTaskId === null ? { scale: 1.01 } : {}}
                        whileTap={executingTaskId === null ? { scale: 0.99 } : {}}
                      >
                        <Icon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="flex-1 text-slate-400">{contextualName}</span>
                        {executingTaskId === task.id && (
                          <Loader2 className="w-3 h-3 animate-spin text-slate-500 flex-shrink-0" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </details>
            )}
          </div>

          {/* Effect Feedback - System report style */}
          <AnimatePresence>
            {lastResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mb-8 bg-slate-800/30 border border-slate-700/50 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-0.5 h-full bg-slate-500 rounded-full" />
                  <div className="flex-1">
                    <div className="text-sm text-slate-300 mb-1 font-medium">
                      {getEffectMessage(lastResult.taskId, lastResult.result)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Result generated • {new Date(lastResult.timestamp).toLocaleTimeString()} • Saved to workspace
                    </div>
                  </div>
                  <button
                    onClick={() => setLastResult(null)}
                    className="text-slate-500 hover:text-slate-400 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Activity Timeline */}
          <div>
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Activity Timeline</h2>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <ActivityTimeline maxItems={10} showDetails={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}