import { useTabsStore } from '../state/tabsStore';
import { ipcEvents } from './ipc-events';

type FallbackOptions = {
  url?: string;
  title?: string;
  activate?: boolean;
  mode?: 'normal' | 'ghost' | 'private';
};

export function createFallbackTab(options: FallbackOptions = {}) {
  const store = typeof useTabsStore?.getState === 'function' ? useTabsStore.getState() : null;
  if (!store) {
    return null;
  }

  const {
    url = 'about:blank',
    title,
    activate = true,
    mode = 'normal',
  } = options;

  const existingTabs = Array.isArray(store.tabs) ? store.tabs : [];
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const nextTabs = existingTabs.map((tab) => ({
    ...tab,
    active: activate ? false : Boolean(tab.active),
  }));

  const newTab = {
    id,
    title: title || url,
    url,
    active: activate,
    mode,
  };

  nextTabs.push(newTab);

  // Update the zustand store
  store.setAll(nextTabs);

  // Emit the update so any listeners (e.g., TabStrip) stay in sync
  try {
    ipcEvents.emit('tabs:updated', nextTabs);
  } catch {
    // Ignore emit errors in non-Electron contexts
  }

  return newTab;
}


