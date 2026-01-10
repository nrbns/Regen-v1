import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Play, CheckCircle, XCircle, Loader2, Clock, Sparkles, FileText, Link2, BarChart3, Zap, Eye } from 'lucide-react';
import { taskRunner, type TaskDefinition, type TaskExecution } from '../lib/tasks/TaskRunner';
import { showToast } from '../components/ui/Toast';
import { LiveContextStrip } from '../components/ui/LiveContextStrip';
import { AutomaticSuggestions } from '../components/ui/AutomaticSuggestions';
import { ActivityTimeline } from '../components/ui/ActivityTimeline';
import { useTabsStore } from '../state/tabsStore';
import { workspaceStore } from '../lib/workspace/WorkspaceStore';
import { contextMemory } from '../lib/services/ContextMemory';

export default function TaskRunner() {
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ taskId: string; result: any; timestamp: number } | null>(null);
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
      return `✓ Summary generated`;
    } else if (taskId === 'extract_links') {
      const linkCount = Array.isArray(result) ? result.length : 0;
      return `✓ ${linkCount} links extracted`;
    } else if (taskId === 'analyze_content') {
      return `✓ Topic classified: ${typeof result === 'string' ? result.substring(0, 30) : 'Analysis complete'}`;
    }
    return `✓ Task completed`;
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
      {/* Live Context Strip */}
      <LiveContextStrip />

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
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Live Intelligence
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">Beta</p>
                </div>
              </div>
              {/* Local-first badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">Local-first • Offline-ready</span>
              </div>
            </div>
            <p className="text-slate-400">
              Context-aware actions for the current page. Regen observes and suggests.
            </p>
          </motion.div>

          {/* Automatic Suggestions */}
          <div className="mb-6">
            <AutomaticSuggestions maxSuggestions={3} />
          </div>

          {/* Context Actions */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-200">Context Actions</h2>
              {activeTab && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Eye className="w-3 h-3" />
                  <span>For: {activeTab.title || 'Current Tab'}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task, index) => {
                const Icon = getTaskIcon(task.id);
                const contextualName = getContextualTaskName(task.id, activeTab?.url || '');
                return (
                  <motion.div
                    key={task.id}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg hover:shadow-purple-500/20 transition-all"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Icon className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-200 mb-1">{contextualName}</h3>
                        <p className="text-xs text-slate-400">{task.description}</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => handleExecuteTask(task.id)}
                      disabled={executingTaskId !== null}
                      className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        executingTaskId === task.id
                          ? 'bg-blue-600 text-white cursor-wait'
                          : executingTaskId !== null
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                      whileHover={executingTaskId === null ? { scale: 1.05 } : {}}
                      whileTap={executingTaskId === null ? { scale: 0.95 } : {}}
                    >
                      {executingTaskId === task.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Execute</span>
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Effect Feedback */}
          <AnimatePresence>
            {lastResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-8 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-emerald-400 mb-1">
                      {getEffectMessage(lastResult.taskId, lastResult.result)}
                    </div>
                    <div className="text-xs text-slate-400">
                      Saved to workspace • {new Date(lastResult.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    onClick={() => setLastResult(null)}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
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