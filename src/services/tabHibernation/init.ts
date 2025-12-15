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
  const unsubscribeActive = useTabsStore.subscribe(
    state => state.activeId,
    activeId => {
      if (activeId) {
        trackTabActivity(activeId);
      }
      startInactivityMonitoring();
    }
  );

  // Watch tab list changes (adds/removes/pins/sleeping state) and re-evaluate hibernation
  const unsubscribeTabs = useTabsStore.subscribe(
    state => state.tabs.map(tab => ({
      id: tab.id,
      sleeping: !!tab.sleeping,
      pinned: !!tab.pinned,
      lastActiveAt: tab.lastActiveAt ?? tab.createdAt ?? 0,
    })),
    () => {
      startInactivityMonitoring();
    }
  );

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
