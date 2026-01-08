import React, { useEffect, useRef } from 'react';
import { Task } from '../../../core/execution/task';

interface StreamingOutputProps {
  task: Task;
}

/**
 * Streaming Output - Shows live streaming text output
 */
export function StreamingOutput({ task }: StreamingOutputProps) {
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [task.output]);

  return (
    <div className="p-3 bg-slate-900 rounded border border-slate-700">
      <div className="text-xs text-slate-400 mb-2">Output</div>
      <div
        ref={outputRef}
        className="text-sm text-green-400 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed"
      >
        {task.output.length === 0 ? (
          <span className="text-slate-500 italic">
            {task.status === 'RUNNING' ? 'Generating response...' : 'No output yet'}
          </span>
        ) : (
          task.output.join('')
        )}
      </div>
    </div>
  );
}
