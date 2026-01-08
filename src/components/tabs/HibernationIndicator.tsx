/**
 * SPRINT 1: Hibernation Indicator Component
 * Shows hibernated tab count and one-tap resume all button
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoonStar, Sun } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import {
  getHibernatedTabCount,
  wakeAllHibernatedTabs,
} from '../../services/tabHibernation/hibernationManager';
import { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';

export function HibernationIndicator() {
  const [hibernatedCount, setHibernatedCount] = useState(0);
  const [isWaking, setIsWaking] = useState(false);

  // Update count when tabs change
  const tabs = useTabsStore(state => state.tabs);
  useEffect(() => {
    const count = getHibernatedTabCount();
    setHibernatedCount(count);
  }, [tabs]);

  const handleWakeAll = async () => {
    if (hibernatedCount === 0 || isWaking) return;

    setIsWaking(true);
    try {
      const wokenCount = await wakeAllHibernatedTabs();
      toast.success(`Woke up ${wokenCount} tab${wokenCount !== 1 ? 's' : ''}`);
      setHibernatedCount(0);
    } catch (error) {
      console.error('[HibernationIndicator] Failed to wake tabs:', error);
      toast.error('Failed to wake tabs');
    } finally {
      setIsWaking(false);
    }
  };

  if (hibernatedCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
      >
        <MoonStar size={14} className="text-amber-400" />
        <span className="font-medium">
          {hibernatedCount} tab{hibernatedCount !== 1 ? 's' : ''} hibernated
        </span>
        <button
          onClick={handleWakeAll}
          disabled={isWaking}
          className="ml-2 flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-100 transition-colors hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          title="Wake all hibernated tabs"
        >
          <Sun size={12} />
          <span>Wake All</span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
