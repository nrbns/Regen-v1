import React, { useState, useEffect } from 'react';
import { Brain, Wifi, Zap, Shield } from 'lucide-react';

export function SignalRail() {
  const [connectionStatus, setConnectionStatus] = useState('online');

  useEffect(() => {
    // Simulate connection monitoring
    const checkConnection = () => {
      // In a real app, this would check actual connectivity
      setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    };

    checkConnection();
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  return (
    <div
      role="toolbar"
      aria-label="Signal rail"
      className="w-48 border-r border-gray-800 bg-gray-900/50 p-2 text-xs"
    >
      <div className="space-y-2">
        <div className="text-gray-300 font-medium text-xs">System</div>
        <div className="text-gray-400 text-xs">
          Stable · Local-first
        </div>
      </div>
    </div>
  );
}

export default SignalRail;
