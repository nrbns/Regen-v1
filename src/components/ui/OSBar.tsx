import React from 'react';

export function OSBar() {
  // Minimal OS bar used in AppShell for dev purposes
  return (
    <div role="toolbar" aria-label="OS Authority Bar" className="w-full border-b border-gray-700 bg-gray-900 px-4 py-1 text-xs text-gray-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">System • v1-mode</div>
        <div className="text-gray-400">Uptime: --</div>
      </div>
    </div>
  );
}

export default OSBar;