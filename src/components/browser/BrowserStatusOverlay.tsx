/**
 * Browser Status Overlay - Never show blank void
 * 
 * REAL-TIME UI REQUIREMENT:
 * - Center panel must never be empty
 * - Show "Idle" / "Waiting for user action" when no tabs and no tasks
 * - Show "Loading page…" / "Executing task…" when tasks are running
 * - Later becomes streaming logs/output
 */

import React, { useState, useEffect } from 'react';
import { listTasks } from '../../core/execution/taskManager';
import { eventBus } from '../../core/execution/eventBus';
import { useTabsStore } from '../../state/tabsStore';

interface BrowserStatusOverlayProps {
  className?: string;
}

export function BrowserStatusOverlay({ className = '' }: BrowserStatusOverlayProps) {
  const { tabs, activeId } = useTabsStore();
  const [hasRunningTasks, setHasRunningTasks] = useState(false);
  const [hasAnyTasks, setHasAnyTasks] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const tasks = listTasks();
      const running = tasks.some(t => t.status === 'RUNNING');
      const any = tasks.length > 0;
      setHasRunningTasks(running);
      setHasAnyTasks(any);
    };

    updateStatus();

    // Listen to task events (NO POLLING)
    const handlers = [
      eventBus.on('task:created', updateStatus),
      eventBus.on('task:updated', updateStatus),
      eventBus.on('task:completed', updateStatus),
      eventBus.on('task:failed', updateStatus),
      eventBus.on('task:cancelled', updateStatus),
    ];

    return () => {
      handlers.forEach(unsub => unsub());
    };
  }, []);

  const hasTabs = tabs.length > 0;
  const hasActiveTab = activeId !== null && tabs.some(t => t.id === activeId);
  const activeTab = hasActiveTab ? tabs.find(t => t.id === activeId) : null;
  const hasContent = hasActiveTab && activeTab && activeTab.url && activeTab.url !== 'about:blank';

  // Only show overlay when there's no visible content AND no tasks running
  // This is a subtle overlay that shows state, not blocking content
  if (!hasContent && !hasRunningTasks) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none bg-slate-950 ${className}`}>
        <div className="text-center px-4">
          <div className="text-sm text-gray-500 mb-1">Waiting for user action</div>
          <div className="text-xs text-gray-600">Enter URL, search, or run command</div>
        </div>
      </div>
    );
  }

  // Show executing state when tasks are running (even if content exists, show subtle indicator)
  if (hasRunningTasks && !hasContent) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none bg-slate-950 ${className}`}>
        <div className="text-center px-4">
          <div className="text-sm text-gray-400 mb-1">Executing task…</div>
          <div className="text-xs text-gray-600">Check task panel for details</div>
        </div>
      </div>
    );
  }

  return null;
}
