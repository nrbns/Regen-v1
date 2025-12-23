import { startInactivityMonitoring, trackTabActivity } from './hibernationManager';
import { useTabsStore } from '../../state/tabsStore';

// Initialize tab hibernation once on app load
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initTabHibernation();
}

function initTabHibernation(): void {
  const tabsStore = useTabsStore.getState();

  // Prime with current active tab
  if (tabsStore.activeId) {
    trackTabActivity(tabsStore.activeId);
  }
  startInactivityMonitoring();

  // Watch active tab changes
  const unsubscribeActive = useTabsStore.subscribe((state, prev) => {
    if (state.activeId && state.activeId !== prev?.activeId) {
      trackTabActivity(state.activeId);
    }
    startInactivityMonitoring();
  });

  // Watch tab list changes (adds/removes/pins/sleeping state) and re-evaluate hibernation
  const unsubscribeTabs = useTabsStore.subscribe((state, prev) => {
    const prevSignature = prev?.tabs
      ?.map(
        tab =>
          `${tab.id}:${tab.sleeping ? 1 : 0}:${tab.pinned ? 1 : 0}:${tab.lastActiveAt ?? tab.createdAt ?? 0}`
      )
      .join('|');
    const currentSignature = state.tabs
      .map(
        tab =>
          `${tab.id}:${tab.sleeping ? 1 : 0}:${tab.pinned ? 1 : 0}:${tab.lastActiveAt ?? tab.createdAt ?? 0}`
      )
      .join('|');

    if (currentSignature !== prevSignature) {
      startInactivityMonitoring();
    }
  });

  // On visibility change, refresh activity for active tab
  const onVisibilityChange = () => {
    if (!document.hidden) {
      const current = useTabsStore.getState().activeId;
      if (current) {
        trackTabActivity(current);
      }
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Clean up on hot-reload (dev) to avoid duplicate listeners
  if (import.meta && import.meta.hot) {
    import.meta.hot.dispose(() => {
      unsubscribeActive();
      unsubscribeTabs();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    });
  }
}
