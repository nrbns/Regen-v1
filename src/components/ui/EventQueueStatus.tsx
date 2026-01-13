/**
 * Event Queue Status Component
 * 
 * Displays the status of the event queue (queued events, online/offline status)
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Database, AlertCircle } from 'lucide-react';
import { eventQueue, type EventQueueStats } from '../../core/events/eventQueue';

export function EventQueueStatus() {
  const [stats, setStats] = useState<EventQueueStats>(eventQueue.getStats());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Subscribe to stats updates
    const unsubscribe = eventQueue.onStatsChange((newStats) => {
      setStats(newStats);
    });

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check periodically
    const interval = setInterval(() => {
      setIsOnline(navigator.onLine);
      setStats(eventQueue.getStats());
    }, 2000);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Don't show if no queued events and online
  if (stats.queued === 0 && isOnline) {
    return null;
  }

  const formatAge = (ms: number) => {
    if (ms < 1000) return `${Math.floor(ms)}ms`;
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
    return `${Math.floor(ms / 3600000)}h`;
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs font-medium text-white">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {stats.queued > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <Database className="w-3 h-3 text-yellow-400" />
              <span className="text-slate-300">
                {stats.queued} event{stats.queued !== 1 ? 's' : ''} queued
              </span>
            </div>
            {stats.oldestEventAge > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <AlertCircle className="w-3 h-3" />
                <span>Oldest: {formatAge(stats.oldestEventAge)}</span>
              </div>
            )}
            {!isOnline && (
              <div className="text-xs text-yellow-400 mt-1">
                Events will be processed when connection is restored
              </div>
            )}
          </div>
        )}

        {isOnline && stats.queued === 0 && (
          <div className="text-xs text-green-400">
            All events processed
          </div>
        )}
      </div>
    </div>
  );
}
