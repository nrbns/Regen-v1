/**
 * SSE Connection Status Indicator
 * Phase 1, Day 9: SSE Push for Signals
 */

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { getSSESignalService, type SSEConnectionStatus } from '../../services/realtime/sseSignalService';
import { motion } from 'framer-motion';

interface SSEConnectionStatusProps {
  showDetails?: boolean;
}

export function SSEConnectionStatusIndicator({ showDetails = false }: SSEConnectionStatusProps) {
  const [status, setStatus] = useState<SSEConnectionStatus>(getSSESignalService().getStatus());

  useEffect(() => {
    const service = getSSESignalService();
    const unsubscribe = service.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  const handleReconnect = () => {
    getSSESignalService().reconnect();
  };

  if (!showDetails && status.connected) {
    return null; // Hide when connected if not showing details
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
        status.connected
          ? 'border-green-500/50 bg-green-500/10 text-green-300'
          : status.reconnecting
            ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300'
            : 'border-red-500/50 bg-red-500/10 text-red-300'
      }`}
    >
      {status.connected ? (
        <>
          <Wifi size={14} />
          <span>Connected</span>
        </>
      ) : status.reconnecting ? (
        <>
          <RefreshCw size={14} className="animate-spin" />
          <span>Reconnecting... ({status.reconnectAttempts})</span>
        </>
      ) : (
        <>
          <WifiOff size={14} />
          <span>Disconnected</span>
          <button
            onClick={handleReconnect}
            className="ml-2 rounded px-2 py-0.5 text-[10px] hover:bg-white/10 transition-colors"
          >
            Reconnect
          </button>
        </>
      )}

      {showDetails && status.error && (
        <span className="ml-2 text-[10px] opacity-75">({status.error})</span>
      )}
    </motion.div>
  );
}

