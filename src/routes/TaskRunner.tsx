import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Play, CheckCircle, XCircle, Loader2, Clock, Sparkles } from 'lucide-react';
import { taskRunner, type TaskDefinition, type TaskExecution } from '../lib/tasks/TaskRunner';
import { showToast } from '../components/ui/Toast';

export default function TaskRunner() {
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);

  useEffect(() => {
    setTasks(taskRunner.getAvailableTasks());
    setExecutions(taskRunner.getExecutions(10));

    const unsubscribe = taskRunner.onExecution((execution) => {
      setExecutions(prev => {
        const filtered = prev.filter(e => e.id !== execution.id);
        return [...filtered, execution].slice(-10);
      });

      if (execution.status === 'completed' || execution.status === 'failed') {
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
      showToast(`Starting task: ${task?.name || taskId}`, 'info');
      await taskRunner.executeTask(taskId);
      showToast(`Task completed: ${task?.name || taskId}`, 'success');
    } catch (error) {
      const task = tasks.find(t => t.id === taskId);
      showToast(`Task failed: ${task?.name || taskId}`, 'error');
      console.error('Task execution failed:', error);
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
    <div className="h-full flex flex-col bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-3 mb-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Bot className="w-8 h-8 text-purple-400" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Task Runner (Preview)
            </h1>
          </div>
          <p className="text-slate-400">
            Execute single-run, user-triggered AI tasks. No background automation.
          </p>
        </motion.div>

        {/* Available Tasks */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Available Tasks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg hover:shadow-purple-500/20 transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <h3 className="font-semibold text-slate-200 mb-2">{task.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{task.description}</p>
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
                      <span>Run Task</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Execution History */}
        {executions.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Recent Executions</h2>
            <div className="space-y-2">
              {executions.map((execution) => {
                const task = tasks.find(t => t.id === execution.taskId);
                return (
                  <div
                    key={execution.id}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <div className="font-medium text-slate-200">
                          {task?.name || execution.taskId}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(execution.startedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm">
                      {execution.status === 'completed' && execution.result && (
                        <span className="text-green-400">Completed</span>
                      )}
                      {execution.status === 'failed' && execution.error && (
                        <span className="text-red-400">{execution.error}</span>
                      )}
                      {execution.status === 'running' && (
                        <span className="text-blue-400">Running...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}