/**
 * ShieldsButton - Per-site shields toggle with live counters
 */

import { useState, useEffect } from 'react';
import { Shield, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabsStore } from '../../state/tabsStore';
import { ShieldsCounters } from '../../lib/ipc-events';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { ipc } from '../../lib/ipc-typed';

interface ShieldsConfig {
  ads: boolean;
  cookies: 'all' | '3p' | 'none';
  httpsOnly: boolean;
  fingerprinting: boolean;
  scripts: 'all' | '3p' | 'none';
  webrtc: boolean;
}

export function ShieldsButton() {
  const { activeId } = useTabsStore();
  const [open, setOpen] = useState(false);
  const [counters, setCounters] = useState<ShieldsCounters | null>(null);
  const [config, setConfig] = useState<ShieldsConfig>({
    ads: true,
    cookies: '3p',
    httpsOnly: false,
    fingerprinting: true,
    scripts: 'all',
    webrtc: true,
  });
  const [totalBlocked, setTotalBlocked] = useState(0);

  // Listen for shields counters
  useIPCEvent<ShieldsCounters>('shields:counters', (data) => {
    if (data.tabId === activeId) {
      setCounters(data);
      setTotalBlocked(data.ads + data.trackers + data.cookiesBlocked);
    }
  }, [activeId]);

  // Load shields config for current site
  useEffect(() => {
    if (activeId) {
      // Would fetch from IPC
      // ipc.shields.getConfig(activeId).then(setConfig).catch(() => {});
    }
  }, [activeId]);

  const updateConfig = async (key: keyof ShieldsConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    // Would update via IPC
    // await ipc.shields.setConfig(activeId, newConfig);
  };

  return (
    <div className="relative">
      <motion.button
        data-shields-button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          relative flex items-center gap-2 px-3 py-1.5 rounded-lg
          bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50
          text-gray-300 hover:text-gray-100 transition-colors
        `}
      >
        <Shield size={16} className={totalBlocked > 0 ? 'text-blue-400' : 'text-gray-500'} />
        {totalBlocked > 0 && (
          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded">
            {totalBlocked}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 mt-2 w-80 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl z-50"
            >
              <div className="p-4 border-b border-gray-800/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-200">Shields</h3>
                  {counters && (
                    <div className="text-xs text-gray-400">
                      {counters.ads} ads · {counters.trackers} trackers · {counters.httpsUpgrades} upgraded
                    </div>
                  )}
                </div>

                {/* Live Counters */}
                {counters && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-gray-800/40 rounded p-2 text-center">
                      <div className="text-lg font-bold text-red-400">{counters.ads}</div>
                      <div className="text-xs text-gray-500">Ads Blocked</div>
                    </div>
                    <div className="bg-gray-800/40 rounded p-2 text-center">
                      <div className="text-lg font-bold text-orange-400">{counters.trackers}</div>
                      <div className="text-xs text-gray-500">Trackers</div>
                    </div>
                    <div className="bg-gray-800/40 rounded p-2 text-center">
                      <div className="text-lg font-bold text-green-400">{counters.httpsUpgrades}</div>
                      <div className="text-xs text-gray-500">HTTPS</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="p-4 space-y-3">
                {[
                  { key: 'ads' as const, label: 'Block ads & trackers', icon: Shield },
                  { key: 'fingerprinting' as const, label: 'Anti-fingerprinting', icon: Shield },
                  { key: 'webrtc' as const, label: 'Block WebRTC leaks', icon: Shield },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{label}</span>
                    <button
                      onClick={() => updateConfig(key, !config[key])}
                      className={`
                        relative w-11 h-6 rounded-full transition-colors
                        ${config[key] ? 'bg-blue-600' : 'bg-gray-700'}
                      `}
                    >
                      <motion.div
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
                        animate={{ x: config[key] ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                ))}

                {/* Cookie blocking */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">3rd-party cookies</span>
                  <select
                    value={config.cookies}
                    onChange={(e) => updateConfig('cookies', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
                  >
                    <option value="all">Allow</option>
                    <option value="3p">Block 3P</option>
                    <option value="none">Block All</option>
                  </select>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

