import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../../state/taskStore';
import { Task } from '../../../core/execution/task';
import { TaskService } from '../../services/taskService';
import { offlineAgent } from '../../../core/ai/offline/offlineAgent';
import { SystemBehaviorIndicator } from '../system/SystemBehaviorIndicator';

/**
 * Real-time Task Panel showing tasks, streaming output, logs, and resources
 * Layout follows the ASCII specification from the plan
 */
export function TaskPanel() {
  const {
    tasks,
    resources,
    isConnected,
    getAllTasks,
    clearCompletedTasks
  } = useTaskStore();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [useOnlineModel, setUseOnlineModel] = useState(false);

  const allTasks = getAllTasks();
  const activeTasks = allTasks.filter(task =>
    !['DONE', 'FAILED', 'CANCELLED'].includes(task.status)
  );
  const selectedTask = selectedTaskId ? tasks[selectedTaskId] : null;

  // Auto-select latest task
  useEffect(() => {
    if (allTasks.length > 0 && !selectedTaskId) {
      const latestTask = allTasks[allTasks.length - 1];
      setSelectedTaskId(latestTask.id);
    }
  }, [allTasks, selectedTaskId]);

  const handleCancelTask = async (taskId: string) => {
    try {
      await TaskService.cancelTask(taskId);
    } catch (error) {
      console.error('[TaskPanel] Failed to cancel task:', error);
    }
  };

  const handlePauseTask = async (taskId: string) => {
    try {
      await TaskService.pauseTask(taskId);
    } catch (error) {
      console.error('[TaskPanel] Failed to pause task:', error);
    }
  };

  const handleResumeTask = async (taskId: string) => {
    try {
      await TaskService.resumeTask(taskId);
    } catch (error) {
      console.error('[TaskPanel] Failed to resume task:', error);
    }
  };

  const handleRetryTask = async (intent: string) => {
    try {
      // Create a new task with the same intent
      const task = await TaskService.processUserInput(intent);
      setSelectedTaskId(task.id);
    } catch (error) {
      console.error('[TaskPanel] Failed to retry task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREATED': return 'text-gray-400';
      case 'RUNNING': return 'text-blue-400';
      case 'PARTIAL': return 'text-yellow-400';
      case 'PAUSED': return 'text-orange-400';
      case 'DONE': return 'text-green-400';
      case 'FAILED': return 'text-red-400';
      case 'CANCELLED': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CREATED': return '⏳';
      case 'RUNNING': return '🔄';
      case 'PARTIAL': return '📝';
      case 'PAUSED': return '⏸️';
      case 'DONE': return '✅';
      case 'FAILED': return '❌';
      case 'CANCELLED': return '🚫';
      default: return '❓';
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white hover:bg-slate-700 transition-colors"
        >
          Tasks ({activeTasks.length})
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <span>⚡</span>
          Real-time Tasks
          {!isConnected && <span className="text-yellow-400 text-xs">(Offline)</span>}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={clearCompletedTasks}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded"
            title="Clear completed tasks"
          >
            🧹
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-slate-400 hover:text-white"
            title="Minimize"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-2 h-full">
          {/* Left Column: Tasks List */}
          <div className="border-r border-slate-700 p-3 overflow-y-auto">
            <div className="space-y-2">
              {allTasks.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-4">
                  No tasks yet
                </div>
              ) : (
                allTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      selectedTaskId === task.id
                        ? 'bg-slate-700 border border-slate-600'
                        : 'hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{getStatusIcon(task.status)}</span>
                      <span className={`text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 truncate">
                      {task.intent}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(task.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Streaming Output */}
          <div className="p-3 overflow-y-auto">
            {selectedTask ? (
              <div className="space-y-3">
                {/* Intent Badge */}
                <div className="bg-slate-800 rounded px-2 py-1">
                  <div className="text-xs text-slate-400 mb-1">Intent</div>
                  <div className="text-sm text-white font-medium">
                    {selectedTask.intent}
                  </div>
                </div>

                {/* Streaming Output */}
                <div className="bg-slate-800 rounded p-2 min-h-20">
                  <div className="text-xs text-slate-400 mb-2">Output</div>
                  <div className="text-sm text-green-400 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {selectedTask.output.join('\n') || 'No output yet...'}
                  </div>
                </div>

                {/* Live Logs */}
                <div className="bg-slate-800 rounded p-2 min-h-20">
                  <div className="text-xs text-slate-400 mb-2">Logs</div>
                  <div className="text-xs text-blue-400 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {selectedTask.logs.join('\n') || 'No logs yet...'}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex gap-2">
                  {(selectedTask.status === 'RUNNING' || selectedTask.status === 'PARTIAL') && (
                    <>
                      <button
                        onClick={() => handlePauseTask(selectedTask.id)}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs py-2 rounded transition-colors"
                      >
                        Pause
                      </button>
                      <button
                        onClick={() => handleCancelTask(selectedTask.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {selectedTask.status === 'PAUSED' && (
                    <SystemBehaviorIndicator
                      state="idle"
                      message="Paused - No action needed"
                      size="sm"
                      className="w-full"
                    />
                  )}
                  {(selectedTask.status === 'FAILED' || selectedTask.status === 'CANCELLED') && (
                    <SystemBehaviorIndicator
                      state="idle"
                      message="Completed - No action needed"
                      size="sm"
                      className="w-full"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-sm text-center py-8">
                Select a task to view details
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resource Bar */}
      <div className="border-t border-slate-700 p-3 bg-slate-800">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span>CPU</span>
              <div className="w-8 h-2 bg-slate-600 rounded overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${resources.cpu}%` }}
                />
              </div>
              <span className="text-slate-400">{resources.cpu}%</span>
            </div>
            <div className="flex items-center gap-1">
              <span>RAM</span>
              <div className="w-8 h-2 bg-slate-600 rounded overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${resources.ram}%` }}
                />
              </div>
              <span className="text-slate-400">{resources.ram}%</span>
            </div>
            <div className="flex items-center gap-1">
              <span>AI</span>
              <button
                onClick={() => setUseOnlineModel(!useOnlineModel)}
                className={`px-1 rounded text-[10px] transition-colors ${
                  useOnlineModel
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : offlineAgent.isReady()
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-yellow-600 text-white'
                }`}
                title={useOnlineModel ? 'Switch to local AI' : 'Switch to online AI'}
              >
                {useOnlineModel ? 'Online' : offlineAgent.isReady() ? 'Local' : 'Loading'}
              </button>
            </div>
          </div>
          <div className="text-slate-400">
            {isConnected ? '🟢 Online' : '🔴 Offline'}
          </div>
        </div>
      </div>
    </div>
  );
}
