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
    const [preview, setPreview] = useState<{ title: string; url: string; thumbnail?: string } | null>(null);
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
        onClick={(e) => {
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
              className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-[40] w-80 p-4"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'auto' }}
            >
              {preview.thumbnail && (
                <img
                  src={preview.thumbnail}
                  alt={preview.title}
                  className="w-full h-32 object-cover rounded mb-2"
                />
              )}
              <div className="text-sm font-medium text-gray-200 mb-1 truncate">
                {preview.title}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {preview.url}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

TabHoverCardComponent.displayName = 'TabHoverCard';

export const TabHoverCard = TabHoverCardComponent;

