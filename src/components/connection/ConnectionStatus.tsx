import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { getSocketClient } from '../../services/realtime/socketClient';

interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: number;
  reconnectAttempts: number;
  error?: string;
  offlineQueueSize: number;
  sessionRestored: boolean;
}

/**
 * Connection Status Component
 * Shows real-time connection status with offline queue info
 * Provides manual reconnect option and status details
 */
export function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
    offlineQueueSize: 0,
    sessionRestored: false,
  });

  const [showDetails, setShowDetails] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const client = getSocketClient();

    // Subscribe to connection status changes
    const unsubscribe = client.onConnectionStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Get initial status
    const initialStatus = client.getConnectionStatus();
    setStatus(initialStatus);

    return unsubscribe;
  }, []);

  const handleManualReconnect = async () => {
    setIsReconnecting(true);
    try {
      const client = getSocketClient();
      await client.connect();
    } catch (error) {
      console.error('Manual reconnect failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  const getStatusIcon = () => {
    if (status.connected) {
      return <CheckCircle size={16} className="text-green-400" />;
    }
    if (status.reconnecting) {
      return <RefreshCw size={16} className="text-yellow-400 animate-spin" />;
    }
    return <WifiOff size={16} className="text-red-400" />;
  };

  const getStatusText = () => {
    if (status.connected) {
      return status.sessionRestored ? 'Connected (Session Restored)' : 'Connected';
    }
    if (status.reconnecting) {
      return `Reconnecting (${status.reconnectAttempts})`;
    }
    return 'Offline';
  };

  const getStatusColor = () => {
    if (status.connected) return 'text-green-400';
    if (status.reconnecting) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatLastConnected = () => {
    if (!status.lastConnected) return 'Never';
    const ago = Date.now() - status.lastConnected;
    const minutes = Math.floor(ago / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="relative">
      {/* Status Indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-slate-700 ${
          status.connected ? 'bg-green-900/20' : 'bg-red-900/20'
        }`}
        title={status.connected ? 'Connection healthy' : 'Connection issues'}
      >
        {getStatusIcon()}
        <span className={getStatusColor()}>
          {getStatusText()}
        </span>
        {status.offlineQueueSize > 0 && (
          <span className="bg-yellow-600 text-white text-xs px-1.5 py-0.5 rounded-full">
            {status.offlineQueueSize}
          </span>
        )}
      </button>

      {/* Detailed Status Panel */}
      {showDetails && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Wifi size={16} />
              Connection Status
            </h3>
            <button
              onClick={() => setShowDetails(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Connection Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Status</span>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className={`text-sm ${getStatusColor()}`}>
                  {status.connected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {status.lastConnected && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Last Connected</span>
                <span className="text-gray-400 text-sm">{formatLastConnected()}</span>
              </div>
            )}

            {status.reconnectAttempts > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Reconnect Attempts</span>
                <span className="text-yellow-400 text-sm">{status.reconnectAttempts}</span>
              </div>
            )}

            {status.offlineQueueSize > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Queued Messages</span>
                <span className="text-yellow-400 text-sm">{status.offlineQueueSize}</span>
              </div>
            )}

            {status.sessionRestored && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Session</span>
                <span className="text-green-400 text-sm">Restored</span>
              </div>
            )}

            {status.error && (
              <div className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-red-400 text-sm">
                    <div className="font-medium">Connection Error</div>
                    <div className="mt-1">{status.error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              {!status.connected && !status.reconnecting && (
                <button
                  onClick={handleManualReconnect}
                  disabled={isReconnecting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isReconnecting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Reconnecting...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Reconnect
                    </>
                  )}
                </button>
              )}

              {status.offlineQueueSize > 0 && (
                <div className="flex-1 bg-yellow-600/20 border border-yellow-600 text-yellow-400 text-sm py-2 px-4 rounded-lg text-center">
                  {status.offlineQueueSize} messages queued
                </div>
              )}
            </div>
          </div>

          {/* Connection Tips */}
          {!status.connected && (
            <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
              <div className="text-xs text-gray-400">
                <div className="font-medium text-gray-300 mb-1">Troubleshooting:</div>
                <ul className="space-y-1">
                  <li>• Check your internet connection</li>
                  <li>• Messages will be sent when reconnected</li>
                  <li>• Session data is automatically restored</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
