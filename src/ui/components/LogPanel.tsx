import React, { useEffect, useRef } from 'react';
import { Task } from '../../../core/execution/task';

interface LogPanelProps {
  task: Task;
}

/**
 * Log Panel - Shows internal logs and decision-making
 */
export function LogPanel({ task }: LogPanelProps) {
  const logRef = useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [task.logs]);

  return (
    <div className="p-3 bg-slate-900 rounded border border-slate-700">
      <div className="text-xs text-slate-400 mb-2">Logs</div>
      <div
        ref={logRef}
        className="text-xs text-blue-400 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto space-y-1"
      >
        {task.logs.length === 0 ? (
          <div className="text-slate-500 italic">No logs yet</div>
        ) : (
          task.logs.map((log, index) => (
            <div key={index} className="leading-tight">
              • {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

