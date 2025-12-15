# Week 2 Desktop Testing Checklist

**Date**: December 13, 2025  
**Purpose**: Validate MVP features on Windows 10/11 desktop environment  
**Estimated Time**: 2-3 hours  
**Status**: ⏳ Pending Manual Execution

---

## Pre-Testing Setup

### Environment Requirements
- [ ] Windows 10 or Windows 11 (64-bit)
- [ ] At least 4GB RAM available
- [ ] Battery-powered laptop (for battery mode testing)
- [ ] Chrome/Edge DevTools available for debugging

### Installation
- [ ] Clone repository: `git clone https://github.com/nrbns/Regenbrowser.git`
- [ ] Install dependencies: `npm install`
- [ ] Build application: `npm run build`
- [ ] Start dev server: `npm run dev` (port 5173)

### Test Data Setup
- [ ] Create 5+ test tabs with different URLs
- [ ] Prepare text for clipboard testing
- [ ] Note device RAM (from Task Manager)
- [ ] Check battery status (charging vs on battery)

---

## Phase 1: Performance Features Testing

### Test 1.1: Tab Hibernation
**Feature**: Auto-suspend inactive tabs after 30 minutes

**Steps:**
1. Open 3 tabs (Google, GitHub, YouTube)
2. Switch to Tab 1, wait 31 minutes (or mock timer in code)
3. Check if Tab 2 and Tab 3 are suspended

**Expected Results:**
- [ ] Tabs 2 & 3 show "sleeping" indicator
- [ ] Memory usage drops (~48MB per sleeping tab)
- [ ] Tabs resume when clicked

**Actual Results:**
- Status: ___________
- Memory before: _______ MB
- Memory after: _______ MB
- Notes: _______________________

---

### Test 1.2: Low-RAM Mode Detection
**Feature**: Automatically cap tabs based on device RAM

**Steps:**
1. Check device RAM in Task Manager (right-click taskbar)
2. Open app, navigate to Settings (`/settings`)
3. Check Low-RAM Mode status card
4. Try opening 4th, 5th, 6th tab

**Expected Results:**
- [ ] Settings shows correct device RAM (e.g., "Device: 8GB RAM")
- [ ] If <6GB RAM: Tab cap should be 3
- [ ] If 6-8GB RAM: Tab cap should be 5
- [ ] If >8GB RAM: No cap enforced
- [ ] Warning shown when cap is reached

**Actual Results:**
- Device RAM: _______ GB
- Tab cap detected: _______
- Enforcement working: Yes / No
- Notes: _______________________

---

### Test 1.3: Battery-Aware Power Mode
**Feature**: Auto-enable Power Saving Mode on battery

**Steps:**
1. Unplug laptop (switch to battery power)
2. Open Settings page (`/settings`)
3. Check Battery-Aware Power status card
4. Verify UI animations reduce
5. Check if polling/background tasks slow down

**Expected Results:**
- [ ] Settings shows "Battery: On Battery (XX%)"
- [ ] Power Saving Mode auto-activates
- [ ] UI feels less animated
- [ ] Battery icon shows in UI (if implemented)

**Actual Results:**
- Battery level: _______ %
- Power mode activated: Yes / No
- Animations reduced: Yes / No
- Notes: _______________________

---

## Phase 2: UI Controls Testing

### Test 2.1: Sidebar Toggle Button
**Feature**: Button in top-right to toggle Regen sidebar

**Steps:**
1. Open app homepage
2. Look for sidebar toggle button (PanelRight icon) in top-right
3. Click button to hide sidebar
4. Click again to show sidebar

**Expected Results:**
- [ ] Button visible in top-right cluster
- [ ] Button has purple highlight when sidebar open
- [ ] Sidebar animates open/closed
- [ ] State persists on page reload

**Actual Results:**
- Button visible: Yes / No
- Toggle works: Yes / No
- Purple highlight: Yes / No
- Persistence: Yes / No
- Notes: _______________________

---

### Test 2.2: Ctrl+B Keyboard Shortcut
**Feature**: Keyboard shortcut to toggle sidebar

**Steps:**
1. Focus on app window
2. Press `Ctrl+B`
3. Sidebar should toggle
4. Press `Ctrl+B` again

**Expected Results:**
- [ ] Ctrl+B toggles sidebar on first press
- [ ] Ctrl+B toggles sidebar on second press
- [ ] Works from any focused element (address bar, tab, etc.)
- [ ] No console errors

**Actual Results:**
- Shortcut works: Yes / No
- From address bar: Yes / No
- From tab content: Yes / No
- Notes: _______________________

---

### Test 2.3: Address Bar Controls
**Feature**: Back, Forward, Reload buttons in address bar

**Steps:**
1. Navigate to Google.com
2. Navigate to GitHub.com
3. Click Back button → should go to Google
4. Click Forward button → should go to GitHub
5. Click Reload button → page should refresh

**Expected Results:**
- [ ] Back button visible and clickable
- [ ] Forward button visible and clickable
- [ ] Reload button visible and clickable
- [ ] Navigation works correctly
- [ ] Buttons disabled when not applicable

**Actual Results:**
- Back button works: Yes / No
- Forward button works: Yes / No
- Reload button works: Yes / No
- Disabled state correct: Yes / No
- Notes: _______________________

---

### Test 2.4: Full Keyboard Shortcuts Suite
**Feature**: 12+ keyboard shortcuts for power users

**Test each shortcut:**

| Shortcut | Action | Expected | Actual | Pass/Fail |
|----------|--------|----------|--------|-----------|
| `Ctrl+T` | New Tab | Opens new tab | | |
| `Ctrl+W` | Close Tab | Closes active tab | | |
| `Ctrl+Shift+T` | Reopen Tab | Reopens last closed | | |
| `Ctrl+Tab` | Next Tab | Switches to next | | |
| `Ctrl+Shift+Tab` | Previous Tab | Switches to previous | | |
| `Ctrl+1` | Jump to Tab 1 | Activates first tab | | |
| `Ctrl+2` | Jump to Tab 2 | Activates second tab | | |
| `Ctrl+9` | Jump to Last Tab | Activates last tab | | |
| `Ctrl+B` | Toggle Sidebar | Shows/hides sidebar | | |
| `Ctrl+K` | Focus Address Bar | Focuses address bar | | |
| `Ctrl+Shift+K` | Command Palette | Opens command palette | | |
| `Ctrl+Shift+M` | Toggle Memory Sidebar | Shows/hides memory | | |

**Overall Shortcuts Assessment:**
- Shortcuts working: ___ / 12
- Console errors: Yes / No
- Notes: _______________________

---

## Phase 3: Settings UI Testing

### Test 3.1: Settings Page Navigation
**Feature**: Settings screen at `/settings` route

**Steps:**
1. Navigate to `http://localhost:5173/settings`
2. Verify page loads without errors
3. Check if all sections render

**Expected Results:**
- [ ] Page loads successfully
- [ ] "MVP Features" heading visible
- [ ] 3 categories shown: Performance, UI Controls, System Integration
- [ ] No console errors

**Actual Results:**
- Page loads: Yes / No
- Categories visible: Yes / No
- Console errors: Yes / No
- Notes: _______________________

---

### Test 3.2: Feature Toggle Functionality
**Feature**: Toggle each MVP feature on/off

**Steps:**
1. Go to Settings page
2. Expand "Performance Optimizations" category
3. Toggle Tab Hibernation off
4. Toggle it back on
5. Repeat for all 6 features

**Test each feature:**

| Feature | Toggle Off Works | Toggle On Works | Persists on Reload | Pass/Fail |
|---------|------------------|-----------------|---------------------|-----------|
| Tab Hibernation | | | | |
| Low-RAM Mode | | | | |
| Battery-Aware Power | | | | |
| Sidebar Toggle | | | | |
| Address Bar Controls | | | | |
| Keyboard Shortcuts | | | | |

**Expected Results:**
- [ ] All toggles are clickable
- [ ] Toggle state changes immediately
- [ ] localStorage updated (check DevTools → Application → Local Storage)
- [ ] State persists after page reload

**Actual Results:**
- All toggles work: Yes / No
- localStorage updated: Yes / No
- Persistence works: Yes / No
- Notes: _______________________

---

### Test 3.3: Feature Details Expansion
**Feature**: Expand/collapse feature cards

**Steps:**
1. Click expand button (chevron) on Tab Hibernation card
2. Verify details show
3. Click collapse button
4. Verify details hide

**Expected Results:**
- [ ] Expand button clickable
- [ ] Details section shows feature ID, description
- [ ] Collapse button clickable
- [ ] Animation smooth

**Actual Results:**
- Expansion works: Yes / No
- Details accurate: Yes / No
- Collapse works: Yes / No
- Notes: _______________________

---

### Test 3.4: Device Status Display
**Feature**: Show device RAM and battery status

**Steps:**
1. Go to Settings page
2. Expand "Performance Optimizations"
3. Check Low-RAM Mode status badge
4. Check Battery-Aware Power status badge

**Expected Results:**
- [ ] Low-RAM Mode shows device RAM (e.g., "Device: 8GB RAM")
- [ ] Battery mode shows charging status and level
- [ ] Status updates if battery state changes

**Actual Results:**
- RAM detected: Yes / No (______ GB)
- Battery status shown: Yes / No (Charging/On Battery, ___%)
- Updates dynamically: Yes / No
- Notes: _______________________

---

### Test 3.5: Reset to Defaults
**Feature**: Reset all features to default state

**Steps:**
1. Toggle 2-3 features off
2. Click "Reset to Defaults" button
3. Verify all features are enabled again

**Expected Results:**
- [ ] Button visible and clickable
- [ ] All features re-enabled after click
- [ ] localStorage cleared/reset
- [ ] No console errors

**Actual Results:**
- Button works: Yes / No
- All features enabled: Yes / No
- localStorage reset: Yes / No
- Notes: _______________________

---

## Phase 4: Telemetry Service Testing

### Test 4.1: Telemetry Initialization
**Feature**: Telemetry service starts on app load

**Steps:**
1. Open DevTools Console
2. Refresh page
3. Look for `[Telemetry] Service initialized` log
4. Check localStorage for `mvp-telemetry-enabled`

**Expected Results:**
- [ ] Console shows telemetry initialization
- [ ] Session ID generated (visible in logs)
- [ ] localStorage has telemetry opt-in flag
- [ ] No errors during init

**Actual Results:**
- Init log present: Yes / No
- Session ID format: _______________
- localStorage set: Yes / No
- Notes: _______________________

---

### Test 4.2: Event Tracking
**Feature**: Track feature toggle events

**Steps:**
1. Open DevTools Console
2. Go to Settings
3. Toggle a feature on/off
4. Check console for `[Telemetry] Event tracked` logs

**Expected Results:**
- [ ] Console shows event tracking
- [ ] Event type: `feature_enabled` or `feature_disabled`
- [ ] Event includes `featureId` and `enabled` flag
- [ ] No errors

**Actual Results:**
- Event logged: Yes / No
- Event type correct: Yes / No
- Data accurate: Yes / No
- Notes: _______________________

---

### Test 4.3: Performance Metric Tracking
**Feature**: Track app startup time

**Steps:**
1. Refresh page
2. Check console for `[Telemetry] Event tracked: performance_metric`
3. Look for `app_startup` event

**Expected Results:**
- [ ] `app_startup` event tracked
- [ ] Timestamp included
- [ ] User agent captured
- [ ] Session ID present

**Actual Results:**
- Startup tracked: Yes / No
- Data complete: Yes / No
- Notes: _______________________

---

## Phase 5: Cross-Browser Testing

### Test 5.1: Chrome/Edge Compatibility
**Browser**: Chrome or Edge (Chromium)

**Steps:**
1. Open `http://localhost:5173` in Chrome/Edge
2. Test all features from Phases 1-4
3. Note any differences or issues

**Results:**
- All features work: Yes / No
- Performance: Good / Fair / Poor
- Issues found: _______________________

---

### Test 5.2: Firefox Compatibility (Optional)
**Browser**: Firefox

**Steps:**
1. Open `http://localhost:5173` in Firefox
2. Test all features from Phases 1-4
3. Note any differences or issues

**Results:**
- All features work: Yes / No
- Performance: Good / Fair / Poor
- Issues found: _______________________

---

## Phase 6: Performance Validation

### Test 6.1: Cold-Start Time
**Target**: <3 seconds

**Steps:**
1. Close all browser tabs
2. Open DevTools → Network tab
3. Navigate to `http://localhost:5173`
4. Note DOMContentLoaded and Load times

**Expected Results:**
- [ ] DOMContentLoaded: <1.5s
- [ ] Full Load: <3s
- [ ] First Contentful Paint: <2s

**Actual Results:**
- DOMContentLoaded: _______ ms
- Full Load: _______ ms
- FCP: _______ ms
- Passes target: Yes / No

---

### Test 6.2: Tab-Switch Latency
**Target**: <500ms

**Steps:**
1. Open 3 tabs
2. Open DevTools → Performance tab
3. Start recording
4. Click between tabs 5 times
5. Stop recording, measure average latency

**Expected Results:**
- [ ] Average tab-switch: <500ms
- [ ] UI responsive
- [ ] No dropped frames

**Actual Results:**
- Average latency: _______ ms
- Passes target: Yes / No
- Notes: _______________________

---

### Test 6.3: Memory Usage (Idle)
**Target**: <200MB with 3 tabs

**Steps:**
1. Open 3 tabs
2. Wait 2 minutes (idle)
3. Open Task Manager → Performance → Memory
4. Note browser process memory

**Expected Results:**
- [ ] Memory usage: <200MB
- [ ] No memory leaks (constant over 5 minutes)

**Actual Results:**
- Memory at 2min: _______ MB
- Memory at 5min: _______ MB
- Passes target: Yes / No
- Notes: _______________________

---

## Phase 7: Error Handling & Edge Cases

### Test 7.1: Feature Toggle Error Handling
**Scenario**: Rapidly toggle features

**Steps:**
1. Go to Settings
2. Rapidly click toggles on/off 10 times
3. Check for errors or state corruption

**Expected Results:**
- [ ] No console errors
- [ ] State remains consistent
- [ ] UI doesn't freeze

**Actual Results:**
- Errors: Yes / No
- State consistent: Yes / No
- Notes: _______________________

---

### Test 7.2: localStorage Quota Exceeded
**Scenario**: Fill localStorage

**Steps:**
1. Open DevTools → Console
2. Run: `for(let i=0; i<1000; i++) localStorage.setItem('test'+i, 'x'.repeat(1000))`
3. Try toggling a feature
4. Clear test data: `localStorage.clear()`

**Expected Results:**
- [ ] Graceful degradation (warning logged)
- [ ] App doesn't crash
- [ ] Features still work (in-memory fallback)

**Actual Results:**
- Graceful handling: Yes / No
- App stable: Yes / No
- Notes: _______________________

---

### Test 7.3: Tab Hibernation with Active Media
**Scenario**: Tab playing audio/video shouldn't hibernate

**Steps:**
1. Open YouTube, play a video
2. Switch to another tab
3. Wait 31 minutes (or mock timer)
4. Check if YouTube tab hibernated

**Expected Results:**
- [ ] YouTube tab should NOT hibernate (audio playing)
- [ ] Other tabs should hibernate

**Actual Results:**
- YouTube hibernated: Yes / No (should be No)
- Other tabs hibernated: Yes / No (should be Yes)
- Notes: _______________________

---

## Test Summary

### Overall Results

| Phase | Tests | Passed | Failed | Pass Rate |
|-------|-------|--------|--------|-----------|
| Phase 1: Performance | 3 | | | % |
| Phase 2: UI Controls | 4 | | | % |
| Phase 3: Settings UI | 5 | | | % |
| Phase 4: Telemetry | 3 | | | % |
| Phase 5: Cross-Browser | 2 | | | % |
| Phase 6: Performance | 3 | | | % |
| Phase 7: Error Handling | 3 | | | % |
| **TOTAL** | **23** | | | **%** |

### Critical Issues Found
1. _______________________
2. _______________________
3. _______________________

### Non-Critical Issues Found
1. _______________________
2. _______________________
3. _______________________

### Recommendations
1. _______________________
2. _______________________
3. _______________________

---

## Go/No-Go Decision

**Launch Readiness Criteria:**
- [ ] All critical features working (6/6)
- [ ] Performance targets met (3/3)
- [ ] No critical bugs found
- [ ] Settings UI functional
- [ ] Telemetry operational
- [ ] Cross-browser compatible

**Decision:** ☐ GO  ☐ NO-GO  ☐ GO WITH CAVEATS

**Justification:**
_______________________________________________________________________________________

**Signed:** _______________  
**Date:** December ___, 2025  
**Role:** QA Engineer / Developer

---

**Next Steps:**
- [ ] Fix critical issues (if any)
- [ ] Re-test failed scenarios
- [ ] Update documentation with findings
- [ ] Prepare launch readiness report
- [ ] Schedule beta user onboarding

**Report File:** Save as `WEEK2_DESKTOP_TESTING_REPORT_COMPLETED.md` after execution
