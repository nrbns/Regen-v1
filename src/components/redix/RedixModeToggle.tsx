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

export function RedixModeToggle({ showLabel = true, compact = false }: RedixModeToggleProps) {
  const [redixEnabled, setRedixEnabled] = useState(false);
  const [config, setConfig] = useState(getRedixConfig());

  useEffect(() => {
    setRedixEnabled(isRedixMode());
    setConfig(getRedixConfig());
  }, []);

  const handleToggle = () => {
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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          redixEnabled
            ? 'bg-purple-600 hover:bg-purple-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
        title={redixEnabled ? 'Disable Redix Mode' : 'Enable Redix Mode'}
      >
        <MemoryStick className="h-4 w-4" />
        {showLabel && <span>{redixEnabled ? 'Redix' : 'Full'}</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
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
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          redixEnabled
            ? 'bg-purple-600 hover:bg-purple-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
      >
        {redixEnabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
}



