import React, { useState } from 'react';
import { X } from 'lucide-react';

interface DiagnosticsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Diagnostics({ isOpen, onClose }: DiagnosticsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-600">
          <h2 className="text-lg font-semibold text-white">Diagnostics</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-700 text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-auto max-h-[60vh]">
          <div className="space-y-6">
            {/* System Info */}
            <div>
              <h3 className="text-sm font-medium text-white mb-2">System Information</h3>
              <div className="bg-slate-700 p-3 rounded text-xs font-mono text-gray-300">
                <div>Browser: {navigator.userAgent}</div>
                <div>Platform: {navigator.platform}</div>
                <div>Language: {navigator.language}</div>
                <div>Online: {navigator.onLine ? 'Yes' : 'No'}</div>
              </div>
            </div>

            {/* Performance */}
            <div>
              <h3 className="text-sm font-medium text-white mb-2">Performance</h3>
              <div className="bg-slate-700 p-3 rounded text-xs font-mono text-gray-300">
                <div>Memory: {performance.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB used` : 'Not available'}</div>
                <div>Timing: {Math.round(performance.now())}ms since load</div>
              </div>
            </div>

            {/* Debug Note */}
            <div className="bg-yellow-900/50 border border-yellow-600 p-3 rounded">
              <p className="text-sm text-yellow-200">
                <strong>Debug Mode:</strong> This panel shows internal system information for troubleshooting.
                All logs, metrics, and system internals are hidden from regular users.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
