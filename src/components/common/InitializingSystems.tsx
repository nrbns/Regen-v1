import React from 'react';

export function InitializingSystems({ message = 'Initializing systems…' }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-900/90 px-6 py-8 shadow-lg shadow-black/40 backdrop-blur">
        <div className="mb-2 animate-spin text-blue-300">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="#3B82F6"
              strokeWidth="4"
              strokeDasharray="22 22"
            />
          </svg>
        </div>
        <span className="text-lg font-semibold text-white">{message}</span>
        <span className="text-sm text-gray-300">Please wait while core systems start up.</span>
      </div>
    </div>
  );
}
