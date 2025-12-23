/**
 * Job Mini Indicator - Compact job status for status bar
 *
 * Shows job count and opens GlobalJobTimeline on click
 */

import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useGlobalJobStatus } from '../../hooks/useGlobalJobStatus';
import { motion } from 'framer-motion';

interface JobMiniIndicatorProps {
  onClick?: () => void;
}

export function JobMiniIndicator({ onClick }: JobMiniIndicatorProps) {
  const { activeJobs, overallStatus } = useGlobalJobStatus();

  if (activeJobs.length === 0) {
    return null;
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-slate-800"
      aria-label={`${activeJobs.length} active job${activeJobs.length > 1 ? 's' : ''}`}
    >
      {overallStatus === 'running' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
      )}
      <span className="text-xs text-slate-300">
        {activeJobs.length} job{activeJobs.length > 1 ? 's' : ''}
      </span>
    </motion.button>
  );
}
