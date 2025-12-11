/**
 * Mobile Tab Bar Component
 * Horizontal scrolling tab bar optimized for mobile devices
 */

import { useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { cn } from '../../lib/utils';
import { useMobileDetection } from '../hooks/useMobileDetection';

export function MobileTabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, createTab } = useTabsStore();
  const { isMobile } = useMobileDetection();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current && isMobile) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTabId, isMobile]);

  // Don't render on desktop
  if (!isMobile) return null;

  return (
    <div className="mobile-tab-bar fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 safe-top">
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1 overflow-x-auto px-2 py-2 scrollbar-hide"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const displayTitle = tab.title || 'New Tab';
          const truncatedTitle =
            displayTitle.length > 15 ? `${displayTitle.slice(0, 15)}...` : displayTitle;

          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'group flex items-center gap-1.5 px-3 py-2 rounded-lg min-w-[80px] max-w-[200px] flex-shrink-0 transition-all touch-manipulation',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800'
              )}
            >
              {/* Favicon */}
              {tab.favicon ? (
                <img
                  src={tab.favicon}
                  alt=""
                  className="w-4 h-4 flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-4 h-4 flex-shrink-0 rounded bg-gray-600" />
              )}

              {/* Title */}
              <span className="text-xs font-medium truncate flex-1 text-left">{truncatedTitle}</span>

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={cn(
                  'opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-700/50',
                  isActive && 'opacity-100'
                )}
                aria-label="Close tab"
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          );
        })}

        {/* New Tab Button */}
        <button
          onClick={() => createTab('about:blank')}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors flex-shrink-0 touch-manipulation"
          aria-label="New tab"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

