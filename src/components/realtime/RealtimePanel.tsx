import React from 'react';
import IntentBadge from './IntentBadge';
import TaskList from './TaskList';
import StreamingOutput from './StreamingOutput';
import LogPanel from './LogPanel';
import ResourceBar from './ResourceBar';

export default function RealtimePanel(): JSX.Element {
  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-white">
      {/* Intent Badge - Instant acknowledgement */}
      <IntentBadge />

      <div className="flex gap-2 p-2 border-b border-slate-800">
        <div className="w-1/4">
          <TaskList />
        </div>
        <div className="flex-1">
          <StreamingOutput />
        </div>
        <div className="w-1/4">
          <LogPanel />
        </div>
      </div>

      {/* Resource truth */}
      <div className="border-t border-slate-800 p-2">
        <ResourceBar />
      </div>
    </div>
  );
}
