import { ipc } from './ipc-typed';
import { showToast } from '../state/toastStore';
import { useTabsStore, type ClosedTab } from '../state/tabsStore';

const ensureId = (result: any): string => {
  if (result && typeof result === 'object' && 'id' in result) {
    return String(result.id);
  }
  return typeof result === 'string' ? result : `tab-${Date.now()}`;
};

export async function reopenClosedTab(entry?: ClosedTab) {
  const tabsStore = useTabsStore.getState();
  const target = entry ?? tabsStore.popRecentlyClosed();
  if (!target) {
    showToast('info', 'No recently closed tabs to reopen.');
    return false;
  }

  if (entry) {
    tabsStore.removeRecentlyClosed(entry.closedId);
  }

  try {
    const result = await ipc.tabs.create({
      url: target.url || 'about:blank',
      containerId: target.containerId || undefined,
    });
    const newId = ensureId(result);

    // Delay to allow main process to broadcast new tab details
    setTimeout(() => {
      const store = useTabsStore.getState();
      store.updateTab(newId, {
        appMode: target.appMode,
        containerId: target.containerId,
        containerName: target.containerName,
        containerColor: target.containerColor,
        mode: target.mode,
        title: target.title || store.tabs.find((t) => t.id === newId)?.title,
        url: target.url,
      });
      store.setActive(newId);
    }, 75);

    showToast('success', `Reopened ${target.title || target.url || 'tab'}`);
    return true;
  } catch (error) {
    console.error('Failed to reopen closed tab:', error);
    tabsStore.pushRecentlyClosed(target);
    showToast('error', 'Failed to reopen closed tab.');
    return false;
  }
}

export async function reopenMostRecentClosedTab() {
  return reopenClosedTab();
}

