/**
 * Global Status Bar - System Truth Layer
 *
 * Always-visible status bar that communicates:
 * - Network status (Online/Offline/Reconnecting)
 * - AI status (Local/Web)
 * - Job status (Running/Paused/Idle)
 * - Recovery notifications
 * - Layer status
 *
 * This is the single source of truth for system state.
 */

import React, { useEffect, useState } from 'react';
import {
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2 as _CheckCircle2,
  Loader2,
  Pause,
  RefreshCw,
  Brain,
  Cloud,
  Server,
  Zap as _Zap,
} from 'lucide-react';
import { useLayer } from '../../hooks/useLayer';
import { motion, AnimatePresence } from 'framer-motion';
import { JobMiniIndicator } from '../jobs/JobMiniIndicator';
import { useGlobalJobStatus } from '../../hooks/useGlobalJobStatus';

interface GlobalStatusBarProps {
  className?: string;
}

export function GlobalStatusBar({ className = '' }: GlobalStatusBarProps) {
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'reconnecting'>(
    'online'
  );
  const [aiProvider, setAiProvider] = useState<'local' | 'web' | 'none'>('none');
  const [recoveryBanner, setRecoveryBanner] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const layer = useLayer();

  // Use centralized job status hook
  const { activeJobs, totalProgress, overallStatus: jobStatus } = useGlobalJobStatus();

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    };

    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  // Monitor Socket.IO connection status
  useEffect(() => {
    const checkSocket = async () => {
      try {
        const { getSocketClient } = await import('../../services/realtime/socketClient');
        const client = getSocketClient();
        setSocketConnected(client.isReady());
      } catch {
        setSocketConnected(false);
      }
    };

    checkSocket();
    const interval = setInterval(checkSocket, 2000);
    return () => clearInterval(interval);
  }, []);

  // Monitor AI provider status
  useEffect(() => {
    const checkAI = async () => {
      // Create abort controller for timeout compatibility
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      try {
        // Check if Ollama is available (local AI)
        const response = await fetch('http://localhost:11434/api/tags', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          setAiProvider('local');
          return;
        }
      } catch {
        clearTimeout(timeoutId);
        // Ollama not available, fall through to check web AI
      }

      // Check if web AI is available
      if (networkStatus === 'online') {
        setAiProvider('web');
      } else {
        setAiProvider('none');
      }
    };

    checkAI();
    const interval = setInterval(checkAI, 5000);
    return () => clearInterval(interval);
  }, [networkStatus]);

  // Monitor recovery events
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const { jobId, action } = event.detail;
      if (action === 'resumed' || action === 'restarted') {
        setRecoveryBanner(`Job ${jobId.slice(0, 8)}... recovered from interruption`);
        setTimeout(() => setRecoveryBanner(null), 5000);
      }
    };

    window.addEventListener('job:recovered', handler as EventListener);
    return () => window.removeEventListener('job:recovered', handler as EventListener);
  }, []);

  return (
    <>
      {/* Recovery Banner */}
      <AnimatePresence>
        {recoveryBanner && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed left-0 right-0 top-0 z-[200] bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white shadow-lg"
          >
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span>{recoveryBanner}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Status Bar */}
      <div
        className={`w-full border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-sm ${className}`}
      >
        <div className="flex items-center justify-between px-4 py-2 text-xs">
          {/* Left: System Status */}
          <div className="flex items-center gap-4">
            {/* Network Status */}
            <div className="flex items-center gap-1.5">
              {networkStatus === 'online' ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-slate-300">Online</span>
                </>
              ) : networkStatus === 'reconnecting' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                  <span className="text-amber-300">Reconnecting...</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-amber-300">Offline Mode</span>
                  <span className="text-xs text-slate-500">• Local AI</span>
                </>
              )}
            </div>

            {/* AI Provider */}
            <div className="flex items-center gap-1.5">
              {aiProvider === 'local' ? (
                <>
                  <Brain className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-slate-300">Local AI</span>
                </>
              ) : aiProvider === 'web' ? (
                <>
                  <Cloud className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-slate-300">Web AI</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-amber-300">No AI</span>
                </>
              )}
            </div>

            {/* Socket.IO Status (only in L2/L3) */}
            {(layer === 'L2' || layer === 'L3') && (
              <div className="flex items-center gap-1.5">
                {socketConnected ? (
                  <>
                    <Server className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-slate-300">Connected</span>
                  </>
                ) : (
                  <>
                    <Server className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-amber-300">Connecting...</span>
                  </>
                )}
              </div>
            )}

            {/* Layer Indicator - Hidden per UI audit (removes confusion) */}
            {/* <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-slate-300">Layer {layer}</span>
            </div> */}
          </div>

          {/* Right: Job Status */}
          <div className="flex items-center gap-4">
            {jobStatus !== 'idle' ? (
              <>
                {/* Job Status Icon */}
                <div className="flex items-center gap-1.5">
                  {jobStatus === 'running' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                      <span className="text-slate-300">Running</span>
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-amber-300">Paused</span>
                    </>
                  )}
                </div>

                {/* Job Progress */}
                {activeJobs.length > 0 && (
                  <div className="flex min-w-[120px] items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${totalProgress}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-slate-400">{totalProgress}%</span>
                  </div>
                )}

                {/* Job Mini Indicator (clickable) */}
                <JobMiniIndicator
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('job-timeline:toggle'));
                  }}
                />

                {/* Job Step (if single job) */}
                {activeJobs.length === 1 && activeJobs[0].step && (
                  <span
                    className="max-w-[200px] truncate text-xs text-slate-400"
                    title={activeJobs[0].step}
                  >
                    {activeJobs[0].step}
                  </span>
                )}
              </>
            ) : // Job status: Idle - Hidden per UI audit (removes redundancy)
            // Only show when there's actual job activity
            null}
          </div>
        </div>
      </div>
    </>
  );
}
