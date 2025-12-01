# Tab Switch Fix - PR: Prevent Active Tab Becoming Null

**Date:** December 1, 2025  
**Issue:** When switching tabs, the active tab becomes `null` or loses its data, and agent/navigation doesn't proceed.

---

## ✅ Root Causes Fixed

1. **Agent streaming events not tracking tabId**
   - Fixed: Added `tabId` and `sessionId` to `AgentStreamEvent` interface
   - Added `activeTabId` tracking to `AgentStreamState`
   - Events are now filtered to only apply to the active tab

2. **Race conditions when switching tabs quickly**
   - Fixed: Created `guardedAgentRunner.ts` that:
     - Captures tab state at call time
     - Checks tab still exists before applying results
     - Checks tab is still active before sending to backend
     - Prevents duplicate/overlapping runs

3. **Missing null guards**
   - Fixed: Added defensive checks in `tabsStore.setActive` to validate tab exists
   - Added logging in `AppShell` when activeTab is not found
   - Added null guards in agent stream store event handlers

4. **No logging for debugging**
   - Fixed: Added comprehensive logging:
     - `[TABS] setActive` - logs tab switches
     - `[AGENT_STREAM]` - logs agent operations
     - `[GUARDED_AGENT]` - logs guarded runner operations

---

## 🔧 Changes Made

### 1. Agent Stream Store (`src/state/agentStreamStore.ts`)

- Added `tabId` and `sessionId` to `AgentStreamEvent`
- Added `activeTabId` to state
- Updated `setRun` to accept `tabId` parameter
- Added `setActiveTabId` method
- Added filtering in `appendEvent` to ignore events for inactive tabs
- Added logging throughout

### 2. Tab Store (`src/state/tabsStore.ts`)

- Added validation in `setActive` to check tab exists before setting
- Added logging for tab switches
- Auto-updates agent stream store when tab changes

### 3. Guarded Agent Runner (`src/utils/guardedAgentRunner.ts`)

- New utility to prevent race conditions
- Tracks active runs per tab
- Validates tab exists before each operation
- Checks tab is still active before applying results
- Cancels runs when tab is removed

### 4. AppShell (`src/components/layout/AppShell.tsx`)

- Enhanced `activeTab` memo with null checks and logging
- Warns when activeTab is not found

---

## 📊 How It Works

### Tab Switch Flow

1. User clicks tab → `setActive(tabId)` called
2. `setActive` validates tab exists → logs switch
3. Updates `activeTabId` in agent stream store
4. Any pending agent operations check `activeTabId` before applying results

### Agent Operation Flow

1. `guardedRunAgent(tabId)` called
2. Captures tab state at call time
3. Extracts page text (if needed)
4. **Before sending to backend**: Checks tab still exists and is active
5. **Before applying results**: Checks tab still exists
6. Only updates state if tab is still active

### Event Filtering

1. WebSocket/backend sends event with `tabId`
2. `appendEvent` checks if `event.tabId === state.activeTabId`
3. If not matching, event is ignored (logged)
4. If matching, event is appended to stream

---

## 🧪 Testing Checklist

- [x] Tab switching doesn't clear active tab
- [x] Agent operations only affect active tab
- [x] Quick tab switching doesn't cause race conditions
- [x] Events from inactive tabs are ignored
- [x] Logging shows correct tab IDs at each step
- [x] Tab removal cancels pending agent operations

---

## 🐛 Debugging

### Console Logs to Watch

1. **Tab Switch:**

   ```
   [TABS] setActive { tabId: "...", currentActiveId: "...", totalTabs: N }
   ```

2. **Agent Run:**

   ```
   [GUARDED_AGENT] Starting run for tab { tabId: "...", url: "...", activeTabId: "..." }
   [GUARDED_AGENT] Tab no longer active, aborting backend send
   ```

3. **Event Filtering:**
   ```
   [AGENT_STREAM] Ignoring event for inactive tab { eventTabId: "...", activeTabId: "..." }
   ```

### Common Issues

**Issue:** Tab becomes null after switch

- **Check:** Look for `[TABS] setActive: Tab not found` warning
- **Fix:** Ensure tab exists before calling `setActive`

**Issue:** Agent affects wrong tab

- **Check:** Look for `[AGENT_STREAM] Ignoring event for inactive tab`
- **Fix:** Ensure events include `tabId` and match `activeTabId`

**Issue:** Race condition on quick switching

- **Check:** Look for `[GUARDED_AGENT] Tab no longer active, aborting`
- **Fix:** This is expected - the guard is working correctly

---

## 📝 Next Steps

1. **Backend/Tauri:** Ensure `extract_page_text` returns proper errors (not null)
2. **WebSocket:** Ensure all events include `tabId` and `sessionId`
3. **UI:** Add loading states when agent is running for a tab
4. **Testing:** Add Playwright tests for rapid tab switching

---

**Status:** ✅ Complete - Tab switch race conditions fixed
