/**
 * System Behavior Indicator - BATTLE 4
 * 
 * Replaces "Execute" buttons and "Run Task" buttons with passive system state.
 * Users should never feel they need to *operate* Regen.
 * They should feel Regen is already operating.
 * 
 * Requirements:
 * - System state ("Observing", "No action needed")
 * - Status summaries
 * - Passive intelligence
 * - No buttons, no CTAs, no "Execute"
 */

import React from 'react';
import { Eye, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export type SystemState = 
  | 'observing'        // System is observing, no action needed
  | 'ready'            // System is ready, no action needed
  | 'processing'        // System is processing (passive, not user-triggered)
  | 'idle';            // System is idle, no action needed

interface SystemBehaviorIndicatorProps {
  state: SystemState;
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * System Behavior Indicator Component
 * BATTLE 4: Replaces "Execute" buttons with passive system state
 */
export function SystemBehaviorIndicator({
  state,
  message,
  className = '',
  size = 'md',
}: SystemBehaviorIndicatorProps) {
  const getStateConfig = () => {
    switch (state) {
      case 'observing':
        return {
          icon: Eye,
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
          borderColor: 'border-blue-400/20',
          defaultMessage: 'Observing',
        };
      case 'ready':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-400/10',
          borderColor: 'border-emerald-400/20',
          defaultMessage: 'Ready',
        };
      case 'processing':
        return {
          icon: Loader2,
          color: 'text-purple-400',
          bgColor: 'bg-purple-400/10',
          borderColor: 'border-purple-400/20',
          defaultMessage: 'Processing',
        };
      case 'idle':
        return {
          icon: CheckCircle2,
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/10',
          borderColor: 'border-gray-400/20',
          defaultMessage: 'No action needed',
        };
    }
  };

  const config = getStateConfig();
  const Icon = config.icon;
  const displayMessage = message || config.defaultMessage;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2
        rounded-md
        border
        ${config.borderColor}
        ${config.bgColor}
        ${sizeClasses[size]}
        ${className}
      `}
      role="status"
      aria-live="polite"
      aria-label={`System state: ${state}`}
    >
      {state === 'processing' ? (
        <Icon className={`${iconSizes[size]} ${config.color} animate-spin`} />
      ) : (
        <Icon className={`${iconSizes[size]} ${config.color}`} />
      )}
      <span className={`${config.color} font-medium`}>{displayMessage}</span>
    </div>
  );
}

/**
 * System Status Summary Component
 * BATTLE 4: Shows passive intelligence, not actionable buttons
 */
export function SystemStatusSummary({
  states,
  className = '',
}: {
  states: Array<{ label: string; state: SystemState }>;
  className?: string;
}) {
  if (states.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {states.map((item, index) => (
        <SystemBehaviorIndicator
          key={index}
          state={item.state}
          message={item.label}
          size="sm"
        />
      ))}
    </div>
  );
}
