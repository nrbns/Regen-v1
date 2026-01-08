import React, { useEffect, useRef } from 'react';
import { useTaskStore } from '../../state/taskStore';
import { useTaskRealtime } from '../../hooks/useTaskRealtime';

export default function StreamingOutput(): JSX.Element {
  // Connect to real-time task updates
  useTaskRealtime();

  const { getLatestTask } = useTaskStore();
  const outputRef = useRef<HTMLDivElement | null>(null);

  // Get the most recent task (whether active or completed)
  const latestTask = getLatestTask();

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [latestTask?.output]);

  return (
    <div className="p-2">
      <h3 className="text-sm font-semibold mb-2">Streaming Output</h3>
      <div
        ref={outputRef}
        className="max-h-64 overflow-auto bg-black/40 p-3 text-sm font-mono rounded border border-slate-700"
      >
        {latestTask ? (
          latestTask.output.length > 0 ? (
            latestTask.output.map((chunk, i) => (
              <span key={i} className="whitespace-pre-wrap text-slate-200">
                {chunk}
              </span>
            ))
          ) : (
            <div className="text-slate-500 italic">
              {latestTask.status === 'CREATED' && 'Task created, waiting to start...'}
              {latestTask.status === 'RUNNING' && 'Task running...'}
              {latestTask.status === 'PARTIAL' && 'Streaming output...'}
              {latestTask.status === 'DONE' && 'Task completed'}
              {latestTask.status === 'FAILED' && 'Task failed'}
              {latestTask.status === 'CANCELLED' && 'Task cancelled'}
            </div>
          )
        ) : (
          <div className="text-slate-500 italic">No active tasks</div>
        )}
      </div>
    </div>
  );
}
