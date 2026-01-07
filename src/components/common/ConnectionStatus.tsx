/**
 * Connection Status Component
 * Shows the status of AI, API, and browser connections
 */

import { useEffect, useState } from 'react';
import { WifiOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getInitializationStatus, isAppInitialized } from '../../lib/initialize-app';
import { isBackendAvailable } from '../../lib/backend-status';

export function ConnectionStatus() {
  const [status, setStatus] = useState(getInitializationStatus());
  const [backendStatus, setBackendStatus] = useState(isBackendAvailable());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check status periodically
    const interval = setInterval(() => {
      setStatus(getInitializationStatus());
      setBackendStatus(isBackendAvailable());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const allConnected = isAppInitialized() && backendStatus;
  const hasWarnings = !allConnected;

  if (!hasWarnings) {
    return null; // Don't show if everything is connected
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 p-3 shadow-lg"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-2">
          {allConnected ? (
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-400" />
          )}
          <span className="text-sm text-gray-300">
            {allConnected ? 'All systems connected' : 'Connection issues'}
          </span>
        </div>

        {showDetails && (
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              {status.agentClient ? (
                <CheckCircle2 className="h-3 w-3 text-green-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-400" />
              )}
              <span className="text-gray-400">Agent Client</span>
            </div>
            <div className="flex items-center gap-2">
              {status.apiClient ? (
                <CheckCircle2 className="h-3 w-3 text-green-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-400" />
              )}
              <span className="text-gray-400">API Client</span>
            </div>
            <div className="flex items-center gap-2">
              {backendStatus ? (
                <CheckCircle2 className="h-3 w-3 text-green-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-400" />
              )}
              <span className="text-gray-400">Backend Server</span>
            </div>
            <div className="flex items-center gap-2">
              {status.browserIntegration ? (
                <CheckCircle2 className="h-3 w-3 text-green-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-400" />
              )}
              <span className="text-gray-400">Browser Integration</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
