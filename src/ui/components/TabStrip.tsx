/**
 * TabStrip Component
 * Horizontal tab container with keyboard navigation and grouping
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { useTokens } from '../useTokens';

export interface Tab {
  id: string;
  label: string;
  url?: string;
  icon?: React.ReactNode;
  pinned?: boolean;
  groupId?: string;
  active?: boolean;
}

export interface TabGroup {
  id: string;
  label: string;
  tabs: Tab[];
  collapsed?: boolean;
}

export interface TabStripProps {
  tabs: Tab[];
  groups?: TabGroup[];
  activeTabId?: string;
  onTabClick?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabNew?: () => void;
  onTabPin?: (tabId: string, pinned: boolean) => void;
  className?: string;
  compact?: boolean;
}

/**
 * TabStrip - Horizontal tab container
 *
 * Keyboard shortcuts:
 * - Ctrl+T / Cmd+T: New tab
 * - Ctrl+W / Cmd+W: Close tab
 * - Ctrl+Tab / Ctrl+PageDown: Next tab
 * - Ctrl+Shift+Tab / Ctrl+PageUp: Previous tab
 * - Ctrl+1-9: Switch to tab by number
 */
export function TabStrip({
  tabs,
  groups: _groups,
  activeTabId,
  onTabClick,
  onTabClose,
  onTabNew,
  onTabPin: _onTabPin,
  className = '',
  compact = false,
}: TabStripProps) {
  const tokens = useTokens();
  const stripRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabId && tabRefs.current.has(activeTabId)) {
      const tabElement = tabRefs.current.get(activeTabId);
      tabElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTabId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+T / Cmd+T: New tab
        if (e.key === 't') {
          e.preventDefault();
          onTabNew?.();
          return;
        }

        // Ctrl+W / Cmd+W: Close active tab
        if (e.key === 'w') {
          e.preventDefault();
          if (activeTabId) {
            onTabClose?.(activeTabId);
          }
          return;
        }

        // Ctrl+1-9: Switch to tab by number
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          e.preventDefault();
          const tab = tabs[num - 1];
          if (tab) {
            onTabClick?.(tab.id);
          }
          return;
        }

        // Ctrl+Tab / Ctrl+PageDown: Next tab
        if (e.key === 'Tab' || e.key === 'PageDown') {
          e.preventDefault();
          const currentIndex = tabs.findIndex(t => t.id === activeTabId);
          const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          onTabClick?.(tabs[nextIndex]?.id);
          return;
        }

        // Ctrl+Shift+Tab / Ctrl+PageUp: Previous tab
        if (e.key === 'PageUp' || (e.key === 'Tab' && e.shiftKey)) {
          e.preventDefault();
          const currentIndex = tabs.findIndex(t => t.id === activeTabId);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          onTabClick?.(tabs[prevIndex]?.id);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, onTabClick, onTabClose, onTabNew]);

  const handleTabClick = useCallback(
    (tabId: string) => {
      onTabClick?.(tabId);
    },
    [onTabClick]
  );

  const handleTabClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      onTabClose?.(tabId);
    },
    [onTabClose]
  );

  return (
    <div
      ref={stripRef}
      className={`
        flex items-center gap-1 overflow-x-auto overflow-y-hidden
        bg-[var(--surface-panel)] border-b border-[var(--surface-border)]
        ${className}
      `}
      role="tablist"
      aria-label="Tabs"
      style={{
        height: compact ? '36px' : '40px',
        padding: `0 ${tokens.spacing(2)}`,
      }}
      onWheel={e => {
        // Horizontal scroll with mouse wheel
        if (e.deltaY !== 0) {
          e.currentTarget.scrollLeft += e.deltaY;
        }
      }}
    >
      {/* New Tab Button */}
      <button
        onClick={onTabNew}
        className={`
          flex items-center justify-center
          rounded-md
          text-[var(--text-muted)] hover:text-[var(--text-primary)]
          hover:bg-[var(--surface-hover)]
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
        `}
        style={{
          width: compact ? '28px' : '32px',
          height: compact ? '28px' : '32px',
        }}
        aria-label="New tab"
        title="New tab (Ctrl+T)"
      >
        <Plus size={compact ? 14 : 16} />
      </button>

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <AnimatePresence mode="popLayout">
          {tabs.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <motion.button
                key={tab.id}
                ref={el => {
                  if (el) {
                    tabRefs.current.set(tab.id, el);
                  } else {
                    tabRefs.current.delete(tab.id);
                  }
                }}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  group relative flex items-center gap-2 px-3 py-1.5
                  rounded-t-md
                  transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
                  ${
                    isActive
                      ? 'bg-[var(--surface-root)] text-[var(--text-primary)] border-t-2 border-t-[var(--color-primary-500)]'
                      : 'bg-[var(--surface-panel)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }
                  ${tab.pinned ? 'pl-2' : ''}
                  ${compact ? 'px-2 py-1' : ''}
                `}
                style={{
                  fontSize: compact ? tokens.fontSize.xs : tokens.fontSize.sm,
                  minWidth: tab.pinned ? '32px' : '120px',
                  maxWidth: tab.pinned ? '32px' : '240px',
                }}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                title={tab.url || tab.label}
              >
                {/* Pinned indicator */}
                {tab.pinned && (
                  <div className="w-1 h-1 rounded-full bg-[var(--color-primary-500)]" />
                )}

                {/* Tab icon */}
                {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}

                {/* Tab label */}
                {!tab.pinned && <span className="truncate flex-1 text-left">{tab.label}</span>}

                {/* Close button */}
                {!tab.pinned && (
                  <button
                    onClick={e => handleTabClose(e, tab.id)}
                    className={`
                      flex-shrink-0 p-0.5 rounded
                      opacity-0 group-hover:opacity-100
                      text-[var(--text-muted)] hover:text-[var(--text-primary)]
                      hover:bg-[var(--surface-active)]
                      transition-all
                      focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)]
                    `}
                    aria-label={`Close ${tab.label}`}
                    title="Close tab (Ctrl+W)"
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <X size={12} />
                  </button>
                )}

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="active-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-500)]"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
