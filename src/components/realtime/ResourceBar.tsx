import React from 'react';
import { useTaskStore } from '../../state/taskStore';
import { useTaskRealtime } from '../../hooks/useTaskRealtime';

export default function ResourceBar(): JSX.Element {
  // Connect to real-time task updates (which includes resource updates)
  useTaskRealtime();

  const { resources } = useTaskStore();

  return (
    <div className="px-3 py-2 bg-slate-900/50 border-t border-slate-700 flex items-center justify-end text-xs">
      <div className="text-slate-500 text-xs">
        Local AI
      </div>
    </div>
  );
}
