/**
 * NetworkButton - Proxy/Tor/VPN/DoH status with controls
 */

import { useState, useEffect } from 'react';
import { Network, ChevronDown, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NetworkStatus } from '../../lib/ipc-events';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { ipc } from '../../lib/ipc-typed';

export function NetworkButton() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<NetworkStatus>({
    doh: { enabled: false, provider: 'cloudflare' },
  });

  // Listen for network status updates
  useIPCEvent<NetworkStatus>('net:status', (data) => {
    setStatus(data);
  }, []);

  // Load initial status (wait for IPC)
  useEffect(() => {
    const loadStatus = async () => {
      // Wait for IPC to be ready
      if (!window.ipc || typeof window.ipc.invoke !== 'function') {
        // Retry after a delay
        setTimeout(loadStatus, 500);
        return;
      }
      
      try {
        const s = await ipc.dns.status();
        setStatus(prev => ({ ...prev, doh: s as any }));
      } catch {
        // Silently handle - will retry if needed
      }
    };
    
    // Delay initial load to allow IPC to initialize
    setTimeout(loadStatus, 300);
  }, []);

  const handleNewTorIdentity = async () => {
    try {
      await ipc.tor.newIdentity();
    } catch (error) {
      console.error('Failed to get new Tor identity:', error);
    }
  };

  const hasActiveConnection = status.tor?.circuitEstablished || status.vpn?.connected || status.proxy?.enabled;

  return (
    <div className="relative">
      <motion.button
        data-network-button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          relative flex items-center gap-2 px-3 py-1.5 rounded-lg
          bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50
          text-gray-300 hover:text-gray-100 transition-colors
        `}
      >
        <Network size={16} className={hasActiveConnection ? 'text-green-400' : 'text-gray-500'} />
        {hasActiveConnection && (
          <motion.div
            className="w-2 h-2 bg-green-400 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
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
              className="absolute top-full right-0 mt-2 w-72 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl z-50"
            >
              <div className="p-4 space-y-4">
                {/* Tor */}
                {status.tor && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Network size={16} className="text-purple-400" />
                        <span className="text-sm font-medium text-gray-200">Tor</span>
                      </div>
                      {status.tor.circuitEstablished ? (
                        <CheckCircle size={16} className="text-green-400" />
                      ) : (
                        <XCircle size={16} className="text-red-400" />
                      )}
                    </div>
                    {status.tor.enabled && status.tor.circuitEstablished && (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-400">Identity: {status.tor.identity.slice(0, 8)}...</div>
                        <button
                          onClick={handleNewTorIdentity}
                          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-xs text-purple-300 transition-colors"
                        >
                          <RefreshCw size={14} />
                          New Identity
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* VPN */}
                {status.vpn && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Network size={16} className="text-blue-400" />
                        <span className="text-sm font-medium text-gray-200">VPN</span>
                      </div>
                      {status.vpn.connected ? (
                        <CheckCircle size={16} className="text-green-400" />
                      ) : (
                        <XCircle size={16} className="text-gray-500" />
                      )}
                    </div>
                    {status.vpn.provider && (
                      <div className="text-xs text-gray-400">Provider: {status.vpn.provider}</div>
                    )}
                  </div>
                )}

                {/* Proxy */}
                {status.proxy && status.proxy.enabled && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Network size={16} className="text-cyan-400" />
                        <span className="text-sm font-medium text-gray-200">Proxy</span>
                      </div>
                      <CheckCircle size={16} className="text-green-400" />
                    </div>
                    {status.proxy.host && (
                      <div className="text-xs text-gray-400">{status.proxy.type.toUpperCase()}: {status.proxy.host}</div>
                    )}
                  </div>
                )}

                {/* DNS-over-HTTPS */}
                {status.doh && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Network size={16} className="text-green-400" />
                        <span className="text-sm font-medium text-gray-200">DNS-over-HTTPS</span>
                      </div>
                      {status.doh.enabled ? (
                        <CheckCircle size={16} className="text-green-400" />
                      ) : (
                        <XCircle size={16} className="text-gray-500" />
                      )}
                    </div>
                    {status.doh.enabled && (
                      <div className="text-xs text-gray-400">Provider: {status.doh.provider}</div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

