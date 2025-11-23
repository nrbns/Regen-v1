/**
 * Session Restore Modal - Tier 1
 * Shows prompt to restore last session on app load
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { loadSession, clearSession, getSessionSummary } from '../services/session';
import { useTabsStore } from '../state/tabsStore';
import { useAppStore } from '../state/appStore';
import { ipc } from '../lib/ipc-typed';
import { formatDistanceToNow } from 'date-fns';
import { log } from '../utils/logger';

export default function SessionRestoreModal() {
  const [show, setShow] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<{
    tabCount: number;
    savedAt: number | null;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const tabsStore = useTabsStore();
  const appStore = useAppStore();

  useEffect(() => {
    // Check for session on mount
    const summary = getSessionSummary();
    if (summary && summary.tabCount > 0) {
      setSessionSummary(summary);
      setShow(true);
      log.info('Session restore modal: session found', summary);
    }
  }, []);

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const session = loadSession();
      if (!session) {
        log.error('Session restore: no session data found');
        return;
      }

      log.info('Restoring session', { tabCount: session.tabs.length, mode: session.mode });

      // Restore mode
      if (session.mode) {
        await appStore.setMode(session.mode);
      }

      // Restore tabs
      if (session.tabs.length > 0) {
        // Clear existing tabs first
        const currentTabs = tabsStore.tabs;
        for (const tab of currentTabs) {
          try {
            await ipc.tabs.close({ id: tab.id });
          } catch (error) {
            log.warn('Failed to close tab during restore', error);
          }
        }

        // Create restored tabs
        for (const tab of session.tabs) {
          try {
            const url = tab.url || 'about:blank';
            const newTab = await ipc.tabs.create(url);
            const tabId =
              typeof newTab === 'object' && newTab && 'id' in newTab
                ? newTab.id
                : typeof newTab === 'string'
                  ? newTab
                  : null;

            // Update tab with restored data
            if (tabId && typeof tabId === 'string') {
              tabsStore.updateTab(tabId, {
                title: tab.title,
                appMode: tab.appMode,
                url: tab.url,
              });
            }
          } catch (error) {
            log.warn('Failed to restore tab', error);
          }
        }

        // Set active tab
        if (session.activeTabId) {
          const restoredTab = tabsStore.tabs.find(t => t.id === session.activeTabId);
          if (restoredTab) {
            tabsStore.setActive(session.activeTabId);
            await ipc.tabs.activate({ id: session.activeTabId });
          }
        }
      }

      log.info('Session restored successfully');
      setShow(false);
    } catch (error) {
      log.error('Failed to restore session', error);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDismiss = () => {
    clearSession();
    setShow(false);
    log.info('Session restore dismissed');
  };

  if (!show || !sessionSummary) return null;

  const savedAgo = sessionSummary.savedAt
    ? formatDistanceToNow(new Date(sessionSummary.savedAt), { addSuffix: true })
    : 'recently';

  return (
    <AnimatePresence>
      {show && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => {
            // Don't interfere with button clicks
            const target = e.target as HTMLElement;
            if (target.closest('button')) {
              return; // Let button handle it
            }
            // Close on backdrop click only
            if (e.target === e.currentTarget) {
              handleDismiss();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl max-w-md w-full mx-4"
            onClick={e => {
              // Don't interfere with button clicks
              const target = e.target as HTMLElement;
              if (target.closest('button')) {
                return; // Let button handle it
              }
              // Prevent clicks on modal from bubbling to backdrop
              e.stopPropagation();
            }}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-100 mb-1">
                    Restore your last browsing session?
                  </h3>
                  <p className="text-sm text-gray-400">
                    Last saved {savedAgo} • {sessionSummary.tabCount} tab
                    {sessionSummary.tabCount === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e as any).stopImmediatePropagation();
                    setTimeout(() => {
                      handleDismiss();
                    }, 0);
                  }}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label="Dismiss"
                  style={{ pointerEvents: 'auto', zIndex: 10001 }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e as any).stopImmediatePropagation();
                    setTimeout(() => {
                      handleRestore();
                    }, 0);
                  }}
                  disabled={isRestoring}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-blue-500/60 bg-blue-600/20 px-4 py-2.5 text-sm font-medium text-blue-100 transition-colors hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ pointerEvents: isRestoring ? 'none' : 'auto', zIndex: 10001 }}
                >
                  {isRestoring ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} />
                      Restore
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e as any).stopImmediatePropagation();
                    setTimeout(() => {
                      handleDismiss();
                    }, 0);
                  }}
                  disabled={isRestoring}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700/80 disabled:opacity-50"
                  style={{ pointerEvents: isRestoring ? 'none' : 'auto', zIndex: 10001 }}
                >
                  Start Fresh
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
