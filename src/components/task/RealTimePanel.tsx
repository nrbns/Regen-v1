import React, { useState } from 'react';
import { useTaskStore } from '../../state/taskStore';
import { IntentBadge } from '../../ui/components/IntentBadge';
import { TaskList } from '../../ui/components/TaskList';
import { StreamingOutput } from '../../ui/components/StreamingOutput';
import { LogPanel } from '../../ui/components/LogPanel';
import { ResourceBar } from '../../ui/components/ResourceBar';

/**
 * Real-Time Panel - The main UI for Regen's real-time AI system
 * Uses individual components for the ASCII layout specified
 */
export function RealTimePanel() {
  const { tasks } = useTaskStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-select the most recent task
  React.useEffect(() => {
    const taskIds = Object.keys(tasks);
    if (taskIds.length > 0 && !selectedTaskId) {
      const mostRecentId = taskIds.reduce((latest, id) =>
        tasks[id].createdAt > tasks[latest].createdAt ? id : latest
      );
      setSelectedTaskId(mostRecentId);
    }
  }, [tasks, selectedTaskId]);

  const selectedTask = selectedTaskId ? tasks[selectedTaskId] : null;

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white hover:bg-slate-700 transition-colors"
        >
          Real-Time AI ({Object.keys(tasks).length})
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
          Real-Time AI
        </h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-slate-400 hover:text-white"
          title="Minimize"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-2 h-full">
          {/* Left Column: Intent Badge + Task List */}
          <div className="border-r border-slate-700 flex flex-col">
            {/* Intent Badge - shows detected intent */}
            <IntentBadge
              intent={selectedTask?.intent.split(':')[0] || 'READY'}
              confidence={0.95} // Would come from intent detection
            />

            {/* Task List - shows all tasks */}
            <div className="flex-1">
              <TaskList />
            </div>
          </div>

          {/* Right Column: Streaming Output + Logs */}
          <div className="flex flex-col">
            {/* Streaming Output - live text generation */}
            <div className="flex-1">
              {selectedTask ? (
                <StreamingOutput task={selectedTask} />
              ) : (
                <div className="p-3 text-slate-500 text-sm text-center">
                  Select a task to see output
                </div>
              )}
            </div>

            {/* Live Logs - decision making */}
            <div className="border-t border-slate-700">
              {selectedTask ? (
                <LogPanel task={selectedTask} />
              ) : (
                <div className="p-3 text-slate-500 text-xs text-center">
                  No logs yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resource Bar - system status */}
      <ResourceBar />
    </div>
  );
}
