/**
 * SessionRestorePrompt Component
 * Prompts user to restore previous session after crash or restart
 */

import { useState, useEffect } from 'react';
import { ipc } from '../lib/ipc-typed';
import { useTabsStore } from '../state/tabsStore';
import { useAppStore } from '../state/appStore';
import { X, RotateCcw, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SessionSnapshot {
  version: number;
  tabs: Array<{
    id: string;
    url: string;
    title: string;
    active: boolean;
    mode?: string;
    containerId?: string;
  }>;
  mode: string;
  activeTabId: string | null;
  timestamp: number;
}

export function SessionRestorePrompt() {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const { setActive } = useTabsStore();
  const { setMode } = useAppStore();

  useEffect(() => {
    // Check for restore availability
    const checkRestore = async () => {
      try {
        const result = await ipc.session.checkRestore();
        if (result.available && result.snapshot) {
          // Get full snapshot
          const fullSnapshot = await ipc.session.getSnapshot();
          if (fullSnapshot) {
            setSnapshot(fullSnapshot);
          }
        }
      } catch (error) {
        console.error('[SessionRestorePrompt] Failed to check restore:', error);
      }
    };

    checkRestore();

    // Also listen for IPC event from main process
    if (window.ipc?.on) {
      const handleRestoreAvailable = (
        _event: any,
        _data: { tabCount: number; timestamp: number }
      ) => {
        checkRestore();
      };

      window.ipc.on?.('session:restore-available', handleRestoreAvailable);

      return () => {
        if (window.ipc?.removeListener) {
          window.ipc.removeListener('session:restore-available', handleRestoreAvailable);
        }
      };
    }
  }, []);

  const handleRestore = async () => {
    if (!snapshot) return;

    setIsRestoring(true);

    try {
      // Restore tabs
      for (const tab of snapshot.tabs) {
        const newTab = await ipc.tabs.create({
          url: tab.url,
          mode: (tab.mode as 'normal' | 'ghost' | 'private') || 'normal',
          containerId: tab.containerId,
          fromSessionRestore: true,
        });

        if (newTab && typeof newTab === 'object' && 'id' in newTab) {
          const tabId = typeof newTab.id === 'string' ? newTab.id : null;
          if (tabId && (tab.active || tab.id === snapshot.activeTabId)) {
            setActive(tabId);
          }
        }
      }

      // Restore mode
      if (snapshot.mode) {
        setMode(snapshot.mode as any);
      }

      // Dismiss restore
      await ipc.session.dismissRestore();
      setSnapshot(null);
    } catch (error) {
      console.error('[SessionRestorePrompt] Failed to restore:', error);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await ipc.session.dismissRestore();
      setSnapshot(null);
    } catch (error) {
      console.error('[SessionRestorePrompt] Failed to dismiss:', error);
    }
  };

  if (!snapshot) return null;

  const tabCount = snapshot.tabs.length;
  const lastSaved = new Date(snapshot.timestamp);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-200">Restore Previous Session?</h2>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-400 mb-4 text-sm">
          We found a session snapshot from your last session. Would you like to restore it?
        </p>

        <div className="bg-gray-800 rounded p-3 mb-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Tabs</span>
            <span className="text-gray-200 font-medium">{tabCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Mode</span>
            <span className="text-gray-200 font-medium capitalize">{snapshot.mode}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Last saved</span>
            <span className="text-gray-200 font-medium">
              {formatDistanceToNow(lastSaved, { addSuffix: true })}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isRestoring ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Restore
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            disabled={isRestoring}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
}
