/**
 * AI Status Dot
 * Subtle status indicator for AI backend (replaces loud banner)
 * Shows: Online (green), Offline (amber), Checking (blue)
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, WifiOff, Wifi, AlertCircle } from 'lucide-react';
import { isBackendAvailable, onBackendStatusChange } from '../../lib/backend-status';

export type AIStatus = 'online' | 'offline' | 'checking';

export interface AIStatusDotProps {
  className?: string;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AIStatusDot({
  className = '',
  showTooltip = true,
  size = 'md',
}: AIStatusDotProps) {
  const [status, setStatus] = useState<AIStatus>('checking');
  const [showTooltipState, setShowTooltipState] = useState(false);

  useEffect(() => {
    // Initial check
    const available = isBackendAvailable();
    setStatus(available ? 'online' : 'offline');

    // Listen for backend status changes
    const unsubscribe = onBackendStatusChange((online) => {
      setStatus(online ? 'online' : 'offline');
    });

    // Periodic async check
    const checkBackendHealth = async () => {
      try {
        setStatus('checking');
        const { backendService } = await import('../../lib/backend/BackendService');
        const asyncAvailable = await backendService.checkHealth();
        setStatus(asyncAvailable ? 'online' : 'offline');
      } catch {
        setStatus('offline');
      }
    };

    const interval = setInterval(checkBackendHealth, 30000); // Every 30 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const statusConfig = {
    online: {
      color: 'bg-emerald-400',
      icon: CheckCircle,
      tooltip: 'AI Backend Online',
      details: 'All AI features available',
    },
    offline: {
      color: 'bg-amber-400',
      icon: WifiOff,
      tooltip: 'AI Backend Offline',
      details: 'Running locally. Remote AI unavailable.',
    },
    checking: {
      color: 'bg-blue-400',
      icon: Wifi,
      tooltip: 'Checking AI Backend...',
      details: 'Verifying backend availability',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => showTooltip && setShowTooltipState(true)}
      onMouseLeave={() => setShowTooltipState(false)}
    >
      {/* Status Dot */}
      <motion.div
        className={`${sizeClasses[size]} ${config.color} rounded-full`}
        animate={{
          scale: status === 'checking' ? [1, 1.2, 1] : 1,
          opacity: status === 'checking' ? [1, 0.7, 1] : 1,
        }}
        transition={{
          duration: 2,
          repeat: status === 'checking' ? Infinity : 0,
        }}
        title={config.tooltip}
      />

      {/* Tooltip */}
      {showTooltip && showTooltipState && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-lg text-xs whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Icon className={`w-3 h-3 ${config.color.replace('bg-', 'text-')}`} />
              <div>
                <div className="text-slate-200 font-medium">{config.tooltip}</div>
                <div className="text-slate-400 text-xs mt-0.5">{config.details}</div>
              </div>
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
              <div className="w-2 h-2 bg-slate-800 border-r border-b border-slate-700 transform rotate-45"></div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
