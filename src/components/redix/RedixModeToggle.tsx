/**
 * Redix Mode Toggle Component
 * UI control to enable/disable Redix low-RAM mode
 */

import { useState, useEffect } from 'react';
import { MemoryStick, Zap } from 'lucide-react';
import { isRedixMode, toggleRedixMode, getRedixConfig } from '../../lib/redix-mode';
import { toast } from '../../utils/toast';

interface RedixModeToggleProps {
  showLabel?: boolean;
  compact?: boolean;
}

import { isMVPFeatureEnabled } from '../../config/mvpFeatureFlags';

export function RedixModeToggle({ showLabel = true, compact = false }: RedixModeToggleProps) {
  const [redixEnabled, setRedixEnabled] = useState(false);
  const [config, setConfig] = useState(getRedixConfig());

  useEffect(() => {
    setRedixEnabled(isRedixMode());
    setConfig(getRedixConfig());
  }, []);

  const handleToggle = () => {
    // In v1-mode, don't allow toggling Redix to prevent users from changing stability settings
    if (isV1ModeEnabled()) {
      toast.info('Redix mode is managed by the system in v1-mode');
      return;
    }

    const newState = toggleRedixMode();
    setRedixEnabled(newState);
    setConfig(getRedixConfig());

    if (newState) {
      toast.success('Redix mode enabled - Low RAM mode active', { duration: 3000 });
    } else {
      toast.success('Full mode enabled - All features available', { duration: 3000 });
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          redixEnabled
            ? 'bg-purple-600 text-white hover:bg-purple-700'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        title={redixEnabled ? 'Disable Redix Mode' : 'Enable Redix Mode'}
      >
        <MemoryStick className="h-4 w-4" />
        {showLabel && <span>{redixEnabled ? 'Redix' : 'Full'}</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          {redixEnabled ? (
            <MemoryStick className="h-4 w-4 text-purple-400" />
          ) : (
            <Zap className="h-4 w-4 text-blue-400" />
          )}
          <span className="text-sm font-medium text-white">
            {redixEnabled ? 'Redix Mode (Low RAM)' : 'Full Mode'}
          </span>
        </div>
        <p className="text-xs text-gray-400">
          {redixEnabled
            ? `Max ${config.maxTabs} tabs, Monaco disabled, aggressive eviction`
            : 'All features enabled, no restrictions'}
        </p>
      </div>
      <button
        onClick={handleToggle}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          redixEnabled
            ? 'bg-purple-600 text-white hover:bg-purple-700'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        {redixEnabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
}
