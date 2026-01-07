/**
 * RouterHealthBar - Shows the health status of AI providers (Ollama + Hugging Face)
 * Displays in the UI to inform users about provider availability
 */

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import {
  checkRouterHealth,
  startHealthPolling,
  stopHealthPolling,
  type RouterHealth,
} from '../../services/routerHealth';
import { motion } from 'framer-motion';
import { toast } from '../../utils/toast';

interface RouterHealthBarProps {
  className?: string;
  showDetails?: boolean;
  position?: 'top' | 'bottom' | 'inline';
}

export function RouterHealthBar({
  className = '',
  showDetails = false,
  position = 'top',
}: RouterHealthBarProps) {
  const [health, setHealth] = useState<RouterHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [_lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    // Initial check
    checkRouterHealth()
      .then(setHealth)
      .catch((err: Error) => {
        console.error('[RouterHealthBar] Initial health check failed', err);
        setLastError(err.message);
      })
      .finally(() => setLoading(false));

    // Start polling
    startHealthPolling((newHealth: RouterHealth) => {
      const wasOk = health?.ok;
      setHealth(newHealth);

      // Show toast on status change
      if (wasOk !== undefined && wasOk !== newHealth.ok) {
        if (newHealth.ok) {
          toast.success('AI engine online');
        } else {
          toast.warning('AI engine offline — using static search');
        }
      }

      // Show toast on provider fallback
      if (newHealth.metrics?.requests.fallbacks && newHealth.metrics.requests.fallbacks > 0) {
        toast.info('Switched to cloud model');
      }
    });

    return () => {
      stopHealthPolling();
    };
  }, []);

  if (loading && !health) {
    return (
      <div className={`flex items-center gap-2 text-xs ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
        <span className="text-gray-400">Checking AI engine...</span>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const ollamaStatus = health.ollama.available;
  const hfStatus = health.hf.available;
  const overallOk = health.ok;

  const StatusIcon = overallOk ? CheckCircle2 : XCircle;
  const statusColor = overallOk ? 'text-emerald-400' : 'text-red-400';

  if (position === 'inline') {
    // Compact inline version for status bars
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {overallOk ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        ) : (
          <XCircle className="w-3 h-3 text-red-400" />
        )}
        {ollamaStatus && <Wifi className="w-3 h-3 text-emerald-400" />}
        {hfStatus && <Wifi className="w-3 h-3 text-blue-400" />}
      </div>
    );
  }

  if (!showDetails && position === 'top') {
    // Compact top bar
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 ${className}`}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-4 h-4 ${statusColor}`} />
            <span className="text-xs text-gray-300">
              {overallOk ? 'AI Engine Online' : 'AI Engine Offline'}
            </span>
            {health.ollama.avgLatencyMs && (
              <span className="text-xs text-gray-500">Ollama: {health.ollama.avgLatencyMs}ms</span>
            )}
            {health.hf.avgLatencyMs && (
              <span className="text-xs text-gray-500">HF: {health.hf.avgLatencyMs}ms</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {ollamaStatus ? (
              <Wifi className="w-3 h-3 text-emerald-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-gray-500" />
            )}
            {hfStatus ? (
              <Wifi className="w-3 h-3 text-blue-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-gray-500" />
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Detailed view
  return (
    <div className={`rounded-lg border border-slate-800 bg-slate-900/50 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${statusColor}`} />
          <h3 className="text-sm font-semibold text-white">AI Engine Status</h3>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
      </div>

      <div className="space-y-2">
        {/* Ollama Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {ollamaStatus ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs text-gray-300">Ollama (Local)</span>
          </div>
          <div className="flex items-center gap-2">
            {health.ollama.avgLatencyMs !== null && (
              <span className="text-xs text-gray-500">{health.ollama.avgLatencyMs}ms</span>
            )}
            <span className={`text-xs ${ollamaStatus ? 'text-emerald-400' : 'text-red-400'}`}>
              {ollamaStatus ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Hugging Face Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hfStatus ? (
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs text-gray-300">Hugging Face (Cloud)</span>
          </div>
          <div className="flex items-center gap-2">
            {health.hf.avgLatencyMs !== null && (
              <span className="text-xs text-gray-500">{health.hf.avgLatencyMs}ms</span>
            )}
            <span className={`text-xs ${hfStatus ? 'text-blue-400' : 'text-red-400'}`}>
              {hfStatus ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Metrics */}
        {health.metrics && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Total Requests:</span>
                <span className="ml-2 text-gray-300">{health.metrics.requests.total}</span>
              </div>
              <div>
                <span className="text-gray-500">Fallbacks:</span>
                <span className="ml-2 text-yellow-400">{health.metrics.requests.fallbacks}</span>
              </div>
              <div>
                <span className="text-gray-500">Ollama:</span>
                <span className="ml-2 text-emerald-400">{health.metrics.requests.ollama}</span>
              </div>
              <div>
                <span className="text-gray-500">Hugging Face:</span>
                <span className="ml-2 text-blue-400">{health.metrics.requests.hf}</span>
              </div>
            </div>
          </div>
        )}

        {/* Redis Status */}
        {health.redis && (
          <div className="mt-2 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              {health.redis === 'connected' ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3 h-3 text-yellow-400" />
              )}
              <span className="text-xs text-gray-500">Cache: {health.redis}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
