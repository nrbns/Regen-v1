/**
 * Context Strip - Persistent Context Awareness
 *
 * Shows active intent, involved documents/tabs, and memory scope
 * persistently across all modes. Always visible to maintain context continuity.
 *
 * UI/UX Fix: Ensures users always know what Regen is aware of.
 */

import React from 'react';
import { FileText, Globe, Brain, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../state/appStore';
import { useEffect, useState } from 'react';
import { eventBus, EVENTS } from '../../core/state/eventBus';
import { useActiveContext } from '../../hooks/useActiveContext';

interface ContextItem {
  id: string;
  type: 'intent' | 'tab' | 'document' | 'memory';
  label: string;
  value: string;
  icon?: React.ReactNode;
  removable?: boolean;
}

export function ContextStrip(props: ContextStripProps) {
  const { mode: _mode } = useAppStore();
  // Local tab state, updated via event bus
  const [tabs, setTabs] = useState<any[]>([]);

  useEffect(() => {
    // Initial fetch: try to get from Zustand (for now, fallback to empty)
    if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
      setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
    }

    // Listen for all tab events that could change the tab list
    const offOpened = eventBus.on(EVENTS.TAB_OPENED, () => {
      if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
        setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
      }
    });
    const offClosed = eventBus.on(EVENTS.TAB_CLOSED, () => {
      if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
        setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
      }
    });
    const offUpdated = eventBus.on('tab:updated', () => {
      if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
        setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
      }
    });
    const offActivated = eventBus.on(EVENTS.TAB_ACTIVATED, () => {
      if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
        setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
      }
    });

    return () => {
      offOpened();
      offClosed();
      offUpdated();
      offActivated();
    };
  }, []);

  // Use hook to get context if not provided
  const hookContext = useActiveContext();
  const {
    activeIntent = hookContext.activeIntent,
    activeTabIds = hookContext.activeTabIds,
    activeDocuments = hookContext.activeDocuments,
    memoryScope = hookContext.memoryScope,
    onRemoveItem,
  } = props || {};

  // Build context items
  const contextItems: ContextItem[] = [];

  // Add active intent
  if (activeIntent) {
    contextItems.push({
      id: 'intent',
      type: 'intent',
      label: 'Intent',
      value: activeIntent,
      icon: <Zap size={12} className="text-amber-400" />,
    });
  }

  // Add active tabs
  activeTabIds.forEach(tabId => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      contextItems.push({
        id: `tab-${tabId}`,
        type: 'tab',
        label: tab.title || 'Untitled',
        value: tab.url || '',
        icon: <Globe size={12} className="text-blue-400" />,
        removable: true,
      });
    }
  });

  // Add active documents
  activeDocuments.forEach((docId, index) => {
    contextItems.push({
      id: `doc-${docId}`,
      type: 'document',
      label: `Document ${index + 1}`,
      value: docId,
      icon: <FileText size={12} className="text-emerald-400" />,
      removable: true,
    });
  });

  // Add memory scope
  if (memoryScope) {
    contextItems.push({
      id: 'memory',
      type: 'memory',
      label: 'Memory',
      value: memoryScope,
      icon: <Brain size={12} className="text-purple-400" />,
    });
  }

  if (contextItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-[32px] left-0 right-0 z-[140] border-t border-slate-700/50 bg-slate-900/30 backdrop-blur-sm">
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2">
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Context:
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <AnimatePresence mode="popLayout">
            {contextItems.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -10 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 ${
                  item.type === 'intent'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    : item.type === 'tab'
                      ? 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                      : item.type === 'document'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        : 'border-purple-500/30 bg-purple-500/10 text-purple-200'
                } `}
              >
                {item.icon}
                <span className="max-w-[200px] truncate text-xs font-medium" title={item.value}>
                  {item.label}
                </span>
                {item.removable && onRemoveItem && (
                  <button
                    onClick={() => onRemoveItem(item)}
                    className="ml-1 rounded p-0.5 transition-colors hover:bg-white/10"
                    aria-label={`Remove ${item.label}`}
                  >
                    <X size={10} className="text-current opacity-70 hover:opacity-100" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Mode indicator - hidden for cleaner UI */}
        {/* <div className="flex-shrink-0 px-2 text-xs text-slate-500">{mode}</div> */}
      </div>
    </div>
  );
}
