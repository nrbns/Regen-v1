# Session Restore Hardening

Improvements to ensure tabs/state restore correctly after crash or shutdown.

## Implementation

### 1. Session State Backup

- Backup session state every 30 seconds
- Store in IndexedDB (more reliable than localStorage)
- Include: tabs, windows, scroll positions, form data

### 2. Crash Detection

- Detect unclean shutdowns
- Prompt user to restore previous session
- Offer "Safe Mode" if multiple crashes detected

### 3. Tab Hibernation

- Automatically hibernate tabs after 5 minutes of inactivity
- Restore on demand when tab is activated
- Reduces memory pressure

### 4. State Validation

- Validate session state before restore
- Discard corrupted state gracefully
- Fallback to empty session if restore fails

## Files Modified

### src/services/sessionRestore.ts

```typescript
export interface SessionState {
  windows: WindowState[];
  activeWindowId: string;
  timestamp: number;
  version: string;
}

export interface WindowState {
  id: string;
  tabs: TabState[];
  activeTabId: string;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface TabState {
  id: string;
  url: string;
  title: string;
  scrollPosition: { x: number; y: number };
  hibernated: boolean;
  lastActive: number;
}

// Auto-save every 30 seconds
setInterval(() => {
  saveSessionState(getCurrentState());
}, 30000);

// Restore on startup
window.addEventListener('load', async () => {
  const wasClean = sessionStorage.getItem('regen:clean-shutdown');

  if (!wasClean) {
    const state = await loadSessionState();
    if (state && isValid(state)) {
      await restoreSession(state);
    }
  }
});
```

### src/services/tabHibernation.ts

```typescript
const HIBERNATION_DELAY = 5 * 60 * 1000; // 5 minutes

export function startHibernationMonitor() {
  setInterval(() => {
    const tabs = getAllTabs();
    const now = Date.now();

    tabs.forEach(tab => {
      if (!tab.active && now - tab.lastActive > HIBERNATION_DELAY) {
        hibernateTab(tab.id);
      }
    });
  }, 60000); // Check every minute
}

export function hibernateTab(tabId: string) {
  // Save tab state
  const state = captureTabState(tabId);
  saveTabState(tabId, state);

  // Unload tab content
  unloadTab(tabId);

  console.log(`[TabHibernation] Hibernated tab ${tabId}`);
}

export function restoreTab(tabId: string) {
  const state = loadTabState(tabId);
  if (!state) return;

  // Restore tab content
  loadTab(tabId, state.url);
  restoreScrollPosition(tabId, state.scrollPosition);

  console.log(`[TabHibernation] Restored tab ${tabId}`);
}
```

## Testing Checklist

- [ ] Session restores correctly after clean shutdown
- [ ] Session restores correctly after crash
- [ ] Tabs hibernate after 5 minutes of inactivity
- [ ] Hibernated tabs restore correctly when activated
- [ ] Scroll positions are preserved
- [ ] Form data is preserved (if applicable)
- [ ] Safe mode triggers after 3 crashes
- [ ] Corrupted state is handled gracefully
- [ ] Performance: no lag during save/restore
- [ ] Memory: hibernation reduces memory usage

## Rollout Plan

1. Implement session backup (IndexedDB)
2. Implement crash detection
3. Implement tab hibernation
4. Test with real usage (7-day dogfooding)
5. Monitor metrics: restore success rate, hibernation effectiveness
6. Iterate based on findings

## Success Criteria

- Session restore success rate > 99%
- Tab hibernation reduces memory by 50%+ per tab
- Zero data loss after crash
- Restore completes in < 1 second
