/**
 * AI Offline Indicator
 * Shows clear status when AI backend is unavailable
 * Core browser features remain available
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Wifi, WifiOff, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isBackendAvailable, onBackendStatusChange } from '../../lib/backend-status';
import { showToast } from './Toast';

export type AIBackendStatus = 'online' | 'offline' | 'checking';

export interface AIOfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
}

export function AIOfflineIndicator({
  className = '',
  showDetails = true,
  position = 'bottom-right',
}: AIOfflineIndicatorProps) {
  const [status, setStatus] = useState<AIBackendStatus>('checking');
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastCheck, setLastCheck] = useState<number>(Date.now());

  useEffect(() => {
    // Initial check
    const available = isBackendAvailable();
    setStatus(available ? 'online' : 'offline');
    setLastCheck(Date.now());

    // Listen for backend status changes
    const unsubscribe = onBackendStatusChange((online) => {
      const prevStatus = status;
      const newStatus: AIBackendStatus = online ? 'online' : 'offline';
      
      setStatus(newStatus);
      setLastCheck(Date.now());

      // Show toast notification when backend goes offline
      if (!online && prevStatus === 'online') {
        showToast('AI backend is offline. Core browser features remain available.', 'warning');
      }
    });

    // Also do periodic async check for more accurate status
    const checkBackendHealth = async () => {
      try {
        const { backendService } = await import('../../lib/backend/BackendService');
        const asyncAvailable = await backendService.checkHealth();
        setStatus(asyncAvailable ? 'online' : 'offline');
        setLastCheck(Date.now());
      } catch {
        // Fallback to sync check result
        setStatus('offline');
        setLastCheck(Date.now());
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkBackendHealth, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [status]);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-left': 'top-4 left-4',
  };

  const statusConfig = {
    online: {
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      message: 'AI Backend Online',
      details: 'All AI features available',
    },
    offline: {
      icon: WifiOff,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      message: 'AI Backend Offline',
      details: 'Core browser features available. AI features unavailable.',
    },
    checking: {
      icon: Wifi,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      message: 'Checking AI Backend...',
      details: 'Verifying backend availability',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (status === 'online') {
    // Only show when offline or checking
    return null;
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className={`${config.bg} ${config.border} border rounded-lg p-3 shadow-lg backdrop-blur-sm max-w-xs`}
        >
          <div className="flex items-start gap-2">
            <Icon className={`${config.color} mt-0.5`} size={16} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-medium ${config.color}`}>{config.message}</p>
                {showDetails && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                  >
                    {isExpanded ? (
                      <X size={14} />
                    ) : (
                      <AlertCircle size={14} />
                    )}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {isExpanded && showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 pt-2 border-t border-slate-700/50"
                  >
                    <p className="text-xs text-slate-400">{config.details}</p>
                    {status === 'offline' && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-slate-300">Available features:</p>
                        <ul className="text-xs text-slate-400 space-y-0.5 ml-3 list-disc">
                          <li>Navigation</li>
                          <li>Tab management</li>
                          <li>Downloads</li>
                          <li>Session restore</li>
                        </ul>
                        <p className="text-xs font-medium text-slate-300 mt-2">Unavailable features:</p>
                        <ul className="text-xs text-slate-400 space-y-0.5 ml-3 list-disc">
                          <li>Search & Summarize</li>
                          <li>Research mode</li>
                          <li>AI queries</li>
                          <li>Text analysis</li>
                        </ul>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      Last checked: {new Date(lastCheck).toLocaleTimeString()}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
