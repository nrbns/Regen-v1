import React, { useEffect, useState } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export function NetworkStatusBanner() {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [showOnline, setShowOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowOnline(true);
      setTimeout(() => setShowOnline(false), 3000);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setShowOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="fixed left-0 top-0 z-[9999] flex w-full animate-pulse items-center justify-center bg-red-700 px-6 py-3 text-white shadow-lg">
        <WifiOff className="mr-2 h-5 w-5" />
        <span className="text-base font-bold tracking-wide">
          You are offline. Changes will be saved and synced when back online.
        </span>
      </div>
    );
  }
  if (showOnline) {
    return (
      <div className="animate-fade-in fixed left-0 top-0 z-[9999] flex w-full items-center justify-center bg-green-600 px-6 py-3 text-white shadow-lg">
        <CheckCircle2 className="mr-2 h-5 w-5" />
        <span className="text-base font-bold tracking-wide">
          Back online! All systems reconnected.
        </span>
      </div>
    );
  }
  return null;
}
