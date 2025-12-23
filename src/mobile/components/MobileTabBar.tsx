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
  const tabs = useTabsStore(s => s.tabs);
  const activeTabId = useTabsStore(s => s.activeId);
  const setActiveTab = useTabsStore(s => s.setActive);
  const closeTab = useTabsStore(s => s.remove);
  const createTab = useTabsStore(s => s.add);
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
    <div className="mobile-tab-bar safe-top fixed left-0 right-0 top-0 z-50 border-b border-gray-800 bg-gray-900/95 backdrop-blur-md">
      <div
        ref={scrollContainerRef}
        className="scrollbar-hide flex items-center gap-1 overflow-x-auto px-2 py-2"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {tabs.map(tab => {
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
                'group flex min-w-[80px] max-w-[200px] flex-shrink-0 touch-manipulation items-center gap-1.5 rounded-lg px-3 py-2 transition-all',
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
                  className="h-4 w-4 flex-shrink-0"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="h-4 w-4 flex-shrink-0 rounded bg-gray-600" />
              )}

              {/* Title */}
              <span className="flex-1 truncate text-left text-xs font-medium">
                {truncatedTitle}
              </span>

              {/* Close button */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={cn(
                  'rounded p-0.5 opacity-0 transition-opacity hover:bg-gray-700/50 group-hover:opacity-100',
                  isActive && 'opacity-100'
                )}
                aria-label="Close tab"
              >
                <X className="h-3 w-3" />
              </button>
            </button>
          );
        })}

        {/* New Tab Button */}
        <button
          onClick={() =>
            createTab({
              id: `tab-${Date.now()}`,
              title: 'New Tab',
              url: 'about:blank',
              active: true,
            })
          }
          className="flex h-10 w-10 flex-shrink-0 touch-manipulation items-center justify-center rounded-lg bg-gray-800/50 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          aria-label="New tab"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
