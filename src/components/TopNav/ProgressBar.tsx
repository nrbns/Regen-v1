/**
 * ProgressBar - Animated loading indicator under omnibox
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIPCEvent } from '../../lib/use-ipc-event';

export function ProgressBar() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Listen for tab progress events
  useIPCEvent<{ tabId: string; progress: number }>('tabs:progress', (data) => {
    if (data.progress !== undefined) {
      setProgress(data.progress);
      setIsLoading(data.progress > 0 && data.progress < 100);
    }
  }, []);

  // Also listen for navigation state changes
  useIPCEvent<{ tabId: string; isLoading: boolean }>('tabs:navigation-state', (data) => {
    if (data.isLoading !== undefined) {
      setIsLoading(data.isLoading);
      if (!data.isLoading) {
        // Navigation complete - fade out progress bar
        setTimeout(() => {
          setProgress(0);
          setIsLoading(false);
        }, 300);
      } else {
        setProgress(0); // Reset when starting new load
      }
    }
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0 }}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 origin-left"
          style={{ scaleX: progress / 100 }}
        />
      )}
    </AnimatePresence>
  );
}

