import React from 'react';
import IntentBadge from './IntentBadge';
import TaskList from './TaskList';
import StreamingOutput from './StreamingOutput';
import LogPanel from './LogPanel';
import ResourceBar from './ResourceBar';

export default function RealtimeTaskPanel(): JSX.Element {
  return (
    <div className="w-96 bg-slate-900 border-l border-slate-700 flex flex-col h-full">
      {/* Intent Badge - Top */}
      <IntentBadge />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* Tasks and Streaming Output - Side by side */}
        <div className="flex h-2/3 border-b border-slate-700">
          {/* Tasks Panel - Left */}
          <div className="w-1/2 border-r border-slate-700">
            <TaskList />
          </div>

          {/* Streaming Output - Right */}
          <div className="w-1/2">
            <StreamingOutput />
          </div>
        </div>

        {/* Live Logs - Bottom */}
        <div className="h-1/3">
          <LogPanel />
        </div>
      </div>

      {/* Resource Bar - Bottom */}
      <ResourceBar />
    </div>
  );
}
