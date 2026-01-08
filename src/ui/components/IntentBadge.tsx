import React from 'react';
import { Zap } from 'lucide-react';

interface IntentBadgeProps {
  intent: string;
  confidence?: number;
}

/**
 * Intent Badge - Shows detected intent with confidence
 */
export function IntentBadge({ intent, confidence }: IntentBadgeProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700">
      <Zap className="w-4 h-4 text-yellow-400" />
      <span className="text-sm font-medium text-white">
        Intent: {intent}
        {confidence && (
          <span className="ml-2 text-xs text-slate-400">
            ({Math.round(confidence * 100)}%)
          </span>
        )}
      </span>
    </div>
  );
}
