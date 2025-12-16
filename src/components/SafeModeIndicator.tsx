import React from 'react';
import { AlertTriangle, Shield, X } from 'lucide-react';
import { getSafeModeStatus, disableSafeMode } from '../services/safeMode';

/**
 * Safe Mode Indicator - Shows when safe mode is active
 */
export function SafeModeIndicator() {
  const [status] = React.useState(getSafeModeStatus());

  const handleDisable = () => {
    if (confirm('Exit safe mode? Heavy features will be re-enabled.')) {
      disableSafeMode();
      window.location.reload();
    }
  };

  if (!status.enabled) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-yellow-500 px-4 py-2 text-yellow-900 shadow-lg">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        <span className="font-medium">Safe Mode Active</span>
        <span className="text-sm opacity-80">{status.disabledCount} features disabled</span>
        {status.reason && (
          <span className="rounded bg-yellow-600 px-2 py-1 text-xs text-white">
            {status.reason === 'crash-detected' && 'Multiple crashes detected'}
            {status.reason === 'user-enabled' && 'User enabled'}
            {status.reason === 'performance-issue' && 'Performance issue'}
          </span>
        )}
      </div>

      <button
        onClick={handleDisable}
        className="flex items-center gap-1 rounded bg-yellow-600 px-3 py-1 text-sm text-white transition-colors hover:bg-yellow-700"
      >
        Exit Safe Mode
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Safe Mode Toggle - Button to enable/disable safe mode
 */
export function SafeModeToggle() {
  const [status] = React.useState(getSafeModeStatus());

  const handleToggle = () => {
    if (status.enabled) {
      disableSafeMode();
    } else {
      const { enableSafeMode } = require('../services/safeMode');
      enableSafeMode('user-enabled');
    }
    window.location.reload();
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 rounded px-4 py-2 transition-colors ${
        status.enabled
          ? 'bg-yellow-500 text-yellow-900 hover:bg-yellow-600'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
      title={status.enabled ? 'Disable safe mode' : 'Enable safe mode'}
    >
      {status.enabled ? (
        <>
          <Shield className="h-4 w-4" />
          Safe Mode ON
        </>
      ) : (
        <>
          <AlertTriangle className="h-4 w-4" />
          Safe Mode OFF
        </>
      )}
    </button>
  );
}
