import React, { useEffect, useState } from 'react';
import { getSocketClient } from '../services/socket';

interface ConnectionBannerProps {
  className?: string;
}

// Banner that reflects socket and offline status, and hints queued actions
export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [socketState, setSocketState] = useState<'connected' | 'connecting' | 'disconnected'>(
    'disconnected'
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      const socket = getSocketClient();
      const unsubConnect = socket.on('socket:connected', () => {
        setSocketState('connected');
        setAttempt(0);
      });
      const unsubDisconnect = socket.on('socket:disconnected', () => {
        setSocketState('disconnected');
      });
      const unsubReconnecting = socket.on('socket:reconnecting', (data: any) => {
        setSocketState('connecting');
        setAttempt(data.attempt || 0);
      });
      if (socket.isReady()) {
        setSocketState('connected');
      }
      return () => {
        unsubConnect?.();
        unsubDisconnect?.();
        unsubReconnecting?.();
      };
    } catch {
      // Socket not initialized yet
      return;
    }
  }, []);

  if (isOnline && socketState === 'connected') {
    return null;
  }

  const text = !isOnline
    ? 'Offline mode: Actions will queue until connectivity is restored.'
    : socketState === 'connecting'
      ? `Reconnecting… attempt ${attempt || 1}`
      : 'Realtime connection lost. Retrying shortly.';

  return (
    <div
      className={`w-full rounded border border-amber-700 bg-amber-900/60 px-3 py-2 text-xs text-amber-100 ${className}`}
    >
      {text}
    </div>
  );
};

export default ConnectionBanner;
