/**
 * Sentinel AI Settings Panel
 * 
 * UI for configuring Sentinel AI thresholds and interventions
 */

import React, { useState, useEffect } from 'react';
import { Settings, Eye, Search, Scroll, Clock, AlertTriangle, X, Check } from 'lucide-react';
import { getRegenCoreConfig, updateRegenCoreConfig, type RegenCoreConfig } from '../../core/regen-core/regenCore.config';

export function SentinelSettingsPanel() {
  const [config, setConfig] = useState<RegenCoreConfig>(getRegenCoreConfig());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Reload config when it changes externally
    const interval = setInterval(() => {
      const current = getRegenCoreConfig();
      setConfig(current);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = (updates: Partial<RegenCoreConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    updateRegenCoreConfig(updates);
  };

  const formatTime = (ms: number) => {
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
    return `${Math.floor(ms / 3600000)}h`;
  };

  const parseTime = (str: string): number => {
    const match = str.match(/(\d+)([smh])/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === 's') return value * 1000;
    if (unit === 'm') return value * 60000;
    if (unit === 'h') return value * 3600000;
    return 0;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-lg transition-colors"
        title="Configure Sentinel AI"
      >
        <Settings className="w-5 h-5 text-slate-300" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
      <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Sentinel AI Settings</h2>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-white">Enable Sentinel AI</div>
            <div className="text-xs text-slate-400">Master switch for all pattern detection</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => handleUpdate({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Tab Redundancy */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-semibold text-white">Tab Redundancy Detection</h3>
          </div>
          <div className="space-y-2 pl-6">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">Threshold</label>
              <input
                type="number"
                min="2"
                max="10"
                value={config.tabRedundancyThreshold}
                onChange={(e) => handleUpdate({ tabRedundancyThreshold: parseInt(e.target.value) || 3 })}
                className="w-20 px-2 py-1 bg-slate-700 text-white text-xs rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Auto-close duplicates</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoCloseDuplicates}
                  onChange={(e) => handleUpdate({ autoCloseDuplicates: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Search Loop */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Search Loop Detection</h3>
          </div>
          <div className="space-y-2 pl-6">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">Enable</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableSearchLoopDetection}
                  onChange={(e) => handleUpdate({ enableSearchLoopDetection: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">Threshold</label>
              <input
                type="number"
                min="2"
                max="10"
                value={config.searchLoopThreshold}
                onChange={(e) => handleUpdate({ searchLoopThreshold: parseInt(e.target.value) || 3 })}
                className="w-20 px-2 py-1 bg-slate-700 text-white text-xs rounded"
              />
            </div>
          </div>
        </div>

        {/* Long Scroll */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Scroll className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-white">Long Scroll Detection</h3>
          </div>
          <div className="space-y-2 pl-6">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">Enable</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableLongScrollDetection}
                  onChange={(e) => handleUpdate({ enableLongScrollDetection: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">Scroll Depth (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={config.scrollDepthThreshold}
                onChange={(e) => handleUpdate({ scrollDepthThreshold: parseInt(e.target.value) || 80 })}
                className="w-20 px-2 py-1 bg-slate-700 text-white text-xs rounded"
              />
            </div>
          </div>
        </div>

        {/* Idle Detection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Idle Detection</h3>
          </div>
          <div className="space-y-2 pl-6">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">Enable</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableIdleDetection}
                  onChange={(e) => handleUpdate({ enableIdleDetection: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">Idle Time</label>
              <input
                type="text"
                value={formatTime(config.idleThreshold)}
                onChange={(e) => {
                  const ms = parseTime(e.target.value);
                  if (ms > 0) handleUpdate({ idleThreshold: ms });
                }}
                className="w-20 px-2 py-1 bg-slate-700 text-white text-xs rounded"
                placeholder="22m"
              />
            </div>
          </div>
        </div>

        {/* Error Detection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-white">Error Detection</h3>
          </div>
          <div className="space-y-2 pl-6">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">Enable</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableErrorDetection}
                  onChange={(e) => handleUpdate({ enableErrorDetection: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">Error Threshold</label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.errorThreshold}
                onChange={(e) => handleUpdate({ errorThreshold: parseInt(e.target.value) || 3 })}
                className="w-20 px-2 py-1 bg-slate-700 text-white text-xs rounded"
              />
            </div>
          </div>
        </div>

        {/* Intervention Confidence */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-white">Intervention Confidence</h3>
          </div>
          <div className="pl-6">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">Minimum Confidence</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config.minInterventionConfidence}
                onChange={(e) => handleUpdate({ minInterventionConfidence: parseFloat(e.target.value) || 0.7 })}
                className="w-20 px-2 py-1 bg-slate-700 text-white text-xs rounded"
              />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {(config.minInterventionConfidence * 100).toFixed(0)}% confidence required for interventions
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => {
            const defaultConfig = getRegenCoreConfig();
            // Reset to defaults (this will reload from DEFAULT_CONFIG)
            updateRegenCoreConfig({
              tabRedundancyThreshold: 3,
              autoCloseDuplicates: false,
              searchLoopThreshold: 3,
              enableSearchLoopDetection: true,
              scrollDepthThreshold: 80,
              enableLongScrollDetection: true,
              idleThreshold: 22 * 60 * 1000,
              enableIdleDetection: true,
              errorThreshold: 3,
              enableErrorDetection: true,
              minInterventionConfidence: 0.7,
            });
            setConfig(getRegenCoreConfig());
          }}
          className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
