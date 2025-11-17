/**
 * useKeyboardNavigation - Hook for handling keyboard shortcuts
 * Provides consistent keyboard navigation across components
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  handler: () => void;
  description?: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export function useKeyboardNavigation(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey || e.metaKey ? 'cmd+' : ''}${e.shiftKey ? 'shift+' : ''}${e.altKey ? 'alt+' : ''}${e.key.toLowerCase()}`;
      
      const shortcut = shortcuts.find(s => {
        const shortcutKey = s.key.toLowerCase();
        return shortcutKey === key || shortcutKey === e.key.toLowerCase();
      });

      if (shortcut) {
        if (shortcut.preventDefault !== false) {
          e.preventDefault();
        }
        if (shortcut.stopPropagation) {
          e.stopPropagation();
        }
        shortcut.handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Common keyboard shortcuts for browser
 */
export const commonShortcuts = {
  focusSearch: { key: 'cmd+l', handler: () => {}, description: 'Focus search bar' },
  newTab: { key: 'cmd+t', handler: () => {}, description: 'New tab' },
  closeTab: { key: 'cmd+w', handler: () => {}, description: 'Close tab' },
  reload: { key: 'cmd+r', handler: () => {}, description: 'Reload page' },
  escape: { key: 'Escape', handler: () => {}, description: 'Close modal/dialog' },
} as const;

