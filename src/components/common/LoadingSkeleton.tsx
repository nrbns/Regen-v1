import React from 'react';

export function AIThinkingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-slate-700 rounded-full animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-700 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-slate-700 rounded animate-pulse w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-700 rounded animate-pulse w-full" />
        <div className="h-3 bg-slate-700 rounded animate-pulse w-4/5" />
        <div className="h-3 bg-slate-700 rounded animate-pulse w-3/5" />
      </div>
    </div>
  );
}