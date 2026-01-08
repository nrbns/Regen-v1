import React from 'react';

interface StatusStripProps {
  status: 'idle' | 'working' | 'recovering';
}

export function StatusStrip({ status }: StatusStripProps) {
  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Status: Idle';
      case 'working':
        return 'Status: Working';
      case 'recovering':
        return 'Status: Recovering';
      default:
        return 'Status: Idle';
    }
  };

  return (
    <div className="px-4 py-1.5 border-t border-slate-700 bg-slate-800 text-xs text-gray-500 flex items-center justify-between">
      <div className="text-gray-400">{getStatusText()}</div>
      <div className="flex items-center gap-4">
        <div className="text-gray-600">Local-first · Offline-ready</div>
        <div className="text-gray-500">Local AI available</div>
      </div>
    </div>
  );
}
