/**
 * TabHoverCard - Preview tab content on hover
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabsStore } from '../../state/tabsStore';

interface TabHoverCardProps {
  tabId: string;
  children: React.ReactElement;
}

const TabHoverCardComponent = React.forwardRef<HTMLDivElement, TabHoverCardProps>(
  ({ tabId, children }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const [preview, setPreview] = useState<{
      title: string;
      url: string;
      thumbnail?: string;
    } | null>(null);
    const tabs = useTabsStore(s => s.tabs);
    const tab = tabs.find(t => t.id === tabId);

    useEffect(() => {
      if (isHovered && tab) {
        // Load preview data
        setPreview({
          title: tab.title || 'New Tab',
          url: tab.url || 'about:blank',
        });
      }
    }, [isHovered, tab]);

    return (
      <div
        ref={ref}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative"
        style={{ pointerEvents: 'auto' }}
        onClick={e => {
          // Don't interfere with child clicks
          if (e.target === e.currentTarget) {
            e.stopPropagation();
          }
        }}
      >
        {children}
        <AnimatePresence>
          {isHovered && preview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-full left-0 z-[40] mb-2 w-80 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-2xl"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              style={{ pointerEvents: 'auto' }}
            >
              {preview.thumbnail && (
                <img
                  src={preview.thumbnail}
                  alt={preview.title}
                  className="mb-2 h-32 w-full rounded object-cover"
                />
              )}
              <div className="mb-1 truncate text-sm font-medium text-gray-200">{preview.title}</div>
              <div className="truncate text-xs text-gray-400">{preview.url}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

TabHoverCardComponent.displayName = 'TabHoverCard';

export const TabHoverCard = TabHoverCardComponent;
