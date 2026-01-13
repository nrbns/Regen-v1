/**
 * Megan - System Guide (NOT an executor)
 * 
 * STRICT RULES:
 * - Never starts tasks
 * - Never runs in background
 * - Never hides uncertainty
 * - Never anthropomorphizes
 * - Always mirrors system truth
 * 
 * ROLE: Explains, previews, warns, summarizes
 * NEVER: Executes, acts, decides
 */

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { getTask } from '../../core/execution/taskManager';
import { eventBus } from '../../core/execution/eventBus';
import type { Task } from '../../core/execution/task';
import { useTabsStore } from '../../state/tabsStore';

interface MeganProps {
  className?: string;
  position?: 'right' | 'bottom';
}

type MeganState = 
  | { type: 'idle' }
  | { type: 'text-selected'; text: string }
  | { type: 'preview'; action: string; description: string }
  | { type: 'task-running'; taskId: string }
  | { type: 'task-completed'; taskId: string }
  | { type: 'task-failed'; taskId: string; reason?: string }
  | { type: 'task-canceled'; taskId: string }
  | { type: 'offline-blocked'; action: string };

export function Megan({ className = '', position = 'bottom' }: MeganProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [state, setState] = useState<MeganState>({ type: 'idle' });

  useEffect(() => {
    // Listen to task events (reacts, never controls)
    const handlers = [
      eventBus.on('task:created', (task: Task) => {
        setState({ type: 'task-running', taskId: task.id });
        setIsExpanded(true);
      }),
      eventBus.on('task:updated', (task: Task) => {
        if (task.status === 'RUNNING') {
          setState({ type: 'task-running', taskId: task.id });
        }
      }),
      eventBus.on('task:completed', (task: Task) => {
        setState({ type: 'task-completed', taskId: task.id });
      }),
      eventBus.on('task:failed', (task: Task) => {
        const taskObj = getTask(task.id);
        setState({ 
          type: 'task-failed', 
          taskId: task.id,
          reason: taskObj?.logs[taskObj.logs.length - 1] || undefined
        });
      }),
      eventBus.on('task:cancelled', (task: Task) => {
        setState({ type: 'task-canceled', taskId: task.id });
      }),
    ];

    return () => {
      handlers.forEach(unsub => unsub());
    };
  }, []);

  // Separate effect for text selection (user-initiated only)
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()?.toString().trim();
      if (selection && selection.length > 0) {
        setState(prev => prev.type === 'idle' || prev.type === 'text-selected' 
          ? { type: 'text-selected', text: selection }
          : prev); // Don't override task states
        setIsExpanded(true);
      } else {
        setState(prev => prev.type === 'text-selected' 
          ? { type: 'idle' }
          : prev);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, []);

  const renderContent = () => {
    switch (state.type) {
      case 'idle':
        return null; // Don't show anything when idle

      case 'text-selected':
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-300">
              You have selected text.
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <div>Available actions:</div>
              <div className="ml-4 space-y-0.5">
                <div>• Explain selection</div>
                <div>• Extract key points</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 pt-2 border-t border-slate-700">
              No data will be sent unless you confirm.
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-300">
              This action will:
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <div>• {state.description}</div>
            </div>
            <div className="text-xs text-gray-500 pt-2 border-t border-slate-700">
              Proceed?
            </div>
          </div>
        );

      case 'task-running': {
        const task = getTask(state.taskId);
        if (!task) return null;
        const sourceTab = task.meta?.currentTabId 
          ? tabs.find(t => t.id === task.meta.currentTabId)
          : null;
        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-300">
              Task running: {task.type}
            </div>
            {sourceTab && (
              <div className="text-sm text-gray-400">
                Source: {sourceTab.title || sourceTab.url || 'Active tab'}
              </div>
            )}
            <div className="text-sm text-gray-400">
              Status: Processing locally
            </div>
            <div className="text-xs text-gray-500 pt-2 border-t border-slate-700">
              You can cancel this task at any time.
            </div>
          </div>
        );
      }

      case 'task-completed': {
        const task = getTask(state.taskId);
        if (!task) return null;
        const duration = task.startedAt && task.endedAt 
          ? ((task.endedAt - task.startedAt) / 1000).toFixed(1)
          : '-';
        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-300">
              Task completed.
            </div>
            {task.meta?.selectedText && (
              <div className="text-sm text-gray-400">
                Summary generated from selected text.
              </div>
            )}
            <div className="text-xs text-gray-500 space-y-0.5 pt-2 border-t border-slate-700">
              <div>Execution time: {duration} seconds</div>
              <div>Mode: Local</div>
            </div>
          </div>
        );
      }

      case 'task-failed': {
        const task = getTask(state.taskId);
        return (
          <div className="space-y-2">
            <div className="text-sm text-red-400">
              Task failed.
            </div>
            {state.reason && (
              <div className="text-sm text-gray-400">
                Reason: {state.reason}
              </div>
            )}
            <div className="text-xs text-gray-500 pt-2 border-t border-slate-700">
              No data was sent.
            </div>
          </div>
        );
      }

      case 'task-canceled':
        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-300">
              Task canceled.
            </div>
            <div className="text-xs text-gray-500 pt-2 border-t border-slate-700">
              Execution stopped immediately.
            </div>
          </div>
        );

      case 'offline-blocked':
        return (
          <div className="space-y-2">
            <div className="text-sm text-amber-400">
              This action requires network access.
            </div>
            <div className="text-sm text-gray-400">
              Current mode: Local only
            </div>
            <div className="text-xs text-gray-500 pt-2 border-t border-slate-700">
              Switch to Online mode to proceed.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Don't render when idle (no content to show)
  if (state.type === 'idle' && !isExpanded) {
    return null;
  }

  const content = renderContent();
  if (!content) return null;

  // Bottom position (above System Bar)
  if (position === 'bottom') {
    return (
      <div className={`border-t border-slate-700 bg-slate-900 ${className}`}>
        <div className="flex items-start justify-between p-3">
          <div className="flex-1 min-w-0 pr-2">
            {content}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            <button
              onClick={() => {
                setState({ type: 'idle' });
                setIsExpanded(false);
              }}
              className="text-gray-400 hover:text-white transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Right position (collapsible panel)
  return (
    <div className={`absolute right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-700 flex flex-col ${className}`}>
      <div className="h-12 border-b border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
        <div className="text-sm font-medium text-white">Megan</div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4">
          {content}
        </div>
      )}
    </div>
  );
}
