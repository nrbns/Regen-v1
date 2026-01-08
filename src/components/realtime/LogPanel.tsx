import React, { useEffect, useRef } from 'react';
import { useTaskStore } from '../../state/taskStore';
import { useTaskRealtime } from '../../hooks/useTaskRealtime';

export default function LogPanel(): JSX.Element {
  // Connect to real-time task updates
  useTaskRealtime();

  const { getLatestTask } = useTaskStore();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Get the most recent task for logs
  const latestTask = getLatestTask();

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [latestTask?.logs]);

  return (
    <div className="p-2">
      <h3 className="text-sm font-semibold mb-2">Live Logs</h3>
      <div
        ref={containerRef}
        className="max-h-40 overflow-auto bg-black/30 p-2 text-xs font-mono rounded border border-slate-700"
      >
        {latestTask ? (
          latestTask.logs.length > 0 ? (
            latestTask.logs.map((log, i) => (
              <div key={i} className="text-slate-300 py-0.5">
                {log}
              </div>
            ))
          ) : (
            <div className="text-slate-500 italic">No logs yet...</div>
          )
        ) : (
          <div className="text-slate-500 italic">No active tasks</div>
        )}
      </div>
    </div>
  );
}
