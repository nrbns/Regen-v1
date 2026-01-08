/**
 * Global AI Status Bar
 * Always-visible indicator showing realtime system state
 *
 * Shows:
 * - Connection status (Online/Offline/Connecting)
 * - Active job count
 * - Streaming indicator
 * - AI source (Local/Web/Hybrid)
 */

import { useEffect, useState, useRef } from 'react';
import { eventBus } from '../../core/state/eventBus';
import { Activity, Cloud, Zap, AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface GlobalAIStatusBarProps {
  className?: string;
}

interface StatusState {
  isConnected: boolean;
  isConnecting: boolean;
  activeJobs: number;
  isStreaming: boolean;
  aiSource: 'local' | 'web' | 'hybrid';
  lastUpdate: number;
}

export function GlobalAIStatusBar({ className = '' }: GlobalAIStatusBarProps) {
  const statusRef = useRef<StatusState>({
    isConnected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConnecting: false,
    activeJobs: 0,
    isStreaming: false,
    aiSource: 'local',
    lastUpdate: Date.now(),
  });
  const [, forceUpdate] = useState(0);

  const [showDetails, setShowDetails] = useState(false);

  // Listen to socket client events
  useEffect(() => {
    // Hydrate from eventBus
    const update = () => forceUpdate(x => x + 1);
    const handleStatus = (data: Partial<StatusState>) => {
      statusRef.current = { ...statusRef.current, ...data, lastUpdate: Date.now() };
      update();
    };
    const offStatus = eventBus.on('ai:status', handleStatus);
    const offStreaming = eventBus.on('ai:streaming', (isStreaming: boolean) => {
      statusRef.current.isStreaming = isStreaming;
      statusRef.current.lastUpdate = Date.now();
      update();
    });
    const offSource = eventBus.on('ai:source', (aiSource: 'local' | 'web' | 'hybrid') => {
      statusRef.current.aiSource = aiSource;
      statusRef.current.lastUpdate = Date.now();
      update();
    });
    const offJobCount = eventBus.on('ai:job:count', (activeJobs: number) => {
      statusRef.current.activeJobs = activeJobs;
      statusRef.current.lastUpdate = Date.now();
      update();
    });
    const offConnection = eventBus.on('connection:status', (isConnected: boolean) => {
      statusRef.current.isConnected = isConnected;
      statusRef.current.lastUpdate = Date.now();
      update();
    });
    // Listen to online/offline
    const handleOnline = () => {
      statusRef.current.isConnected = true;
      statusRef.current.lastUpdate = Date.now();
      update();
    };
    const handleOffline = () => {
      statusRef.current.isConnected = false;
      statusRef.current.lastUpdate = Date.now();
      update();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      offStatus();
      offStreaming();
      offSource();
      offJobCount();
      offConnection();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Determine indicator color + icon
  const status = statusRef.current;
  const getStatusColor = () => {
    if (status.isConnecting) return 'bg-blue-500/10 border-blue-400';
    if (!status.isConnected) return 'bg-red-500/10 border-red-400';
    return status.isStreaming
      ? 'bg-green-500/10 border-green-400'
      : 'bg-slate-500/10 border-slate-400';
  };

  const getStatusIcon = () => {
    if (status.isConnecting) return <Zap className="h-4 w-4 animate-pulse text-blue-400" />;
    if (!status.isConnected) return <WifiOff className="h-4 w-4 text-red-400" />;
    if (status.isStreaming) return <Activity className="h-4 w-4 animate-pulse text-green-400" />;
    return <Wifi className="h-4 w-4 text-slate-400" />;
  };

  const getStatusText = () => {
    if (status.isConnecting) return 'Connecting...';
    if (!status.isConnected) return 'Offline';
    if (status.isStreaming)
      return `Streaming (${status.activeJobs} job${status.activeJobs !== 1 ? 's' : ''})`;
    return status.activeJobs > 0
      ? `${status.activeJobs} job${status.activeJobs !== 1 ? 's' : ''} running`
      : 'Ready';
  };

  return (
    <div className={`${className}`}>
      {/* Minimal bar version */}
      <div
        className={`flex h-9 cursor-pointer items-center gap-2 border-b px-3 transition-all ${getStatusColor()} hover:bg-opacity-20`}
        onClick={() => setShowDetails(!showDetails)}
        title={`Realtime System • ${getStatusText()}`}
      >
        {/* Icon */}
        <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
          {getStatusIcon()}
        </div>

        {/* Text */}
        <span className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">
          {getStatusText()}
        </span>

        {/* Source badge */}
        {status.isConnected && (
          <div className="ml-auto flex items-center gap-1 rounded-full bg-slate-200/50 px-2 py-0.5 dark:bg-slate-700/50">
            <Cloud className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {status.aiSource === 'local' ? 'Local' : status.aiSource === 'web' ? 'Web' : 'Hybrid'}
            </span>
          </div>
        )}

        {!status.isConnected && (
          <div className="ml-auto">
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          </div>
        )}
      </div>

      {/* Expanded details panel */}
      {showDetails && (
        <div className="space-y-2 border-b bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Connection</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {status.isConnecting ? 'Connecting...' : status.isConnected ? 'Online' : 'Offline'}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Active Jobs</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">{status.activeJobs}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">AI Source</span>
              <p className="font-medium capitalize text-slate-900 dark:text-slate-100">
                {status.aiSource}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Streaming</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {status.isStreaming ? 'Live' : 'Ready'}
              </p>
            </div>
          </div>
          <div className="border-t pt-1 text-slate-400 dark:text-slate-500">
            Last update: {new Date(status.lastUpdate).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default GlobalAIStatusBar;
