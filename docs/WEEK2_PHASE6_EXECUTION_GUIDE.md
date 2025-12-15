# Week 2 Sprint - Phase 6 Execution Guide
**Target Date**: December 14, 2024  
**Estimated Duration**: 2-3 hours  
**Prerequisites**: Windows 10/11 device, Omnibrowser built

---

## βœ… Pre-Testing Setup (15 mins)

### 1. Build Production Bundle
```powershell
npm run build:web
```
**Expected**: Clean build, 0 errors, `dist-web/` populated

### 2. Verify Test Environment
```powershell
.\scripts\profile-performance.ps1
```
**Expected**: Device info displayed (RAM, CPU, Battery status)

### 3. Baseline System State
- [ ] Close all unnecessary applications
- [ ] Restart Windows to clear memory
- [ ] Disable antivirus real-time scanning (if performance impact)
- [ ] Ensure stable power (plugged in for laptops)

---

## πŸš€ Testing Phases

### Phase 6.1: Performance Baseline (30 mins)

**Reference**: [WEEK2_DESKTOP_TESTING_CHECKLIST.md](./WEEK2_DESKTOP_TESTING_CHECKLIST.md) - Tests 1-5

#### Test 1: Cold Start Performance
```powershell
.\scripts\profile-performance.ps1 -ColdStart
```
1. Close Omnibrowser completely
2. Open Task Manager (Ctrl+Shift+Esc)
3. Launch Omnibrowser and measure time to interactive
4. **Target**: <3000ms (Expected: ~2500ms)

**Pass Criteria**: Startup time <3000ms  
**Record**: Actual time in checklist

#### Test 2: Memory Usage
```powershell
.\scripts\profile-performance.ps1 -Memory
```
1. Open Omnibrowser with 1 tab
2. Task Manager → Details → Find "Omnibrowser.exe"
3. Note "Memory (Private Working Set)"
4. **Target**: <200MB (Expected: ~160MB)

**Pass Criteria**: Memory <200MB  
**Record**: Actual memory in checklist

#### Test 3: Tab Switching Performance
```powershell
.\scripts\profile-performance.ps1 -TabSwitch
```
1. Open 5 tabs (mixed content: text, images, videos)
2. F12 → Performance → Start recording
3. Click between tabs 10 times
4. Stop recording and calculate average
5. **Target**: <500ms (Expected: ~150ms)

**Pass Criteria**: Average tab switch <500ms  
**Record**: Actual time in checklist

#### Test 4: Multi-Tab Memory Scaling
1. Open Omnibrowser with 10 tabs
2. Measure memory usage (Task Manager)
3. **Target**: <500MB (Expected: ~380MB)

**Pass Criteria**: Memory <500MB  
**Record**: Actual memory in checklist

#### Test 5: Tab Hibernation
1. Open 5 tabs
2. Wait 30 minutes (tab-hibernation timeout)
3. Check memory usage (should decrease)
4. **Target**: Memory reduction >20%

**Pass Criteria**: Memory drops >20% after hibernation  
**Record**: Before/after memory in checklist

---

### Phase 6.2: Settings UI Validation (20 mins)

**Reference**: [WEEK2_DESKTOP_TESTING_CHECKLIST.md](./WEEK2_DESKTOP_TESTING_CHECKLIST.md) - Tests 6-12

#### Test 6: Settings Screen Access
1. Navigate to `/settings` in address bar
2. **Expected**: Settings UI renders with 6 feature cards

**Pass Criteria**: Settings screen displays correctly  
**Record**: Screenshot in checklist

#### Test 7: Feature Toggle Functionality
For each feature (Tab Hibernation, Low-RAM Mode, Battery-Aware Power, Sidebar, Address Bar, Keyboard Shortcuts):
1. Toggle feature OFF
2. Reload app
3. Verify feature state persists
4. Toggle feature ON
5. Verify feature is re-enabled

**Pass Criteria**: All 6 toggles work and persist  
**Record**: Pass/Fail for each feature

#### Test 8: Device Status Display
1. Check Settings screen shows correct RAM
2. Check Settings screen shows battery status (if laptop)

**Pass Criteria**: Device info matches Task Manager  
**Record**: Pass/Fail

#### Test 9: Feature Card Expand/Collapse
1. Click "Show Details" on any feature card
2. **Expected**: Card expands with detailed description
3. Click "Hide Details"
4. **Expected**: Card collapses

**Pass Criteria**: All expand/collapse actions work  
**Record**: Pass/Fail

---

### Phase 6.3: Telemetry Validation (15 mins)

**Reference**: [WEEK2_DESKTOP_TESTING_CHECKLIST.md](./WEEK2_DESKTOP_TESTING_CHECKLIST.md) - Tests 13-16

#### Test 13: Telemetry Initialization
1. Open browser DevTools (F12) → Console
2. Look for telemetry initialization log
3. **Expected**: No telemetry errors

**Pass Criteria**: Telemetry initializes without errors  
**Record**: Pass/Fail

#### Test 14: Event Tracking
1. Open DevTools → Network tab
2. Perform actions: open tab, close tab, toggle feature
3. **Expected**: No telemetry network requests (local buffering)

**Pass Criteria**: No telemetry data sent to external servers  
**Record**: Pass/Fail

#### Test 15: Telemetry Opt-Out
1. Disable telemetry in Settings (if opt-out UI exists)
2. Perform actions
3. **Expected**: No telemetry events tracked

**Pass Criteria**: Opt-out prevents tracking  
**Record**: Pass/Fail

---

### Phase 6.4: Error Handling & Edge Cases (30 mins)

**Reference**: [WEEK2_DESKTOP_TESTING_CHECKLIST.md](./WEEK2_DESKTOP_TESTING_CHECKLIST.md) - Tests 17-23

#### Test 17: localStorage Corruption Recovery
1. Open DevTools → Application → Local Storage
2. Corrupt `mvp-feature-flags-v1` value (set to "invalid json")
3. Reload app
4. **Expected**: App resets to defaults, no crash

**Pass Criteria**: Graceful recovery  
**Record**: Pass/Fail

#### Test 18: Low Memory Simulation
1. Open 20+ tabs
2. Monitor memory usage
3. **Expected**: Low-RAM mode activates automatically

**Pass Criteria**: Low-RAM warning/mode triggers  
**Record**: Pass/Fail

#### Test 19: Battery-Aware Power Mode
1. Unplug laptop (if applicable)
2. Battery drops below 20%
3. **Expected**: Battery-aware mode activates

**Pass Criteria**: Power-saving features engage  
**Record**: Pass/Fail

#### Test 20: Rapid Feature Toggling
1. Toggle same feature 100 times rapidly
2. **Expected**: No state corruption, no crash

**Pass Criteria**: App stable after rapid toggles  
**Record**: Pass/Fail

---

## πŸ"Š Results Summary

### Performance Results
| Metric | Target | Expected | Actual | Status |
|--------|--------|----------|--------|--------|
| Cold Start | <3000ms | ~2500ms | _____ ms | ☐ Pass ☐ Fail |
| Memory (1 tab) | <200MB | ~160MB | _____ MB | ☐ Pass ☐ Fail |
| Tab Switch | <500ms | ~150ms | _____ ms | ☐ Pass ☐ Fail |
| Memory (10 tabs) | <500MB | ~380MB | _____ MB | ☐ Pass ☐ Fail |

### Feature Testing Results
| Feature | Toggle | Persistence | Status |
|---------|--------|-------------|--------|
| Tab Hibernation | ☐ | ☐ | ☐ Pass ☐ Fail |
| Low-RAM Mode | ☐ | ☐ | ☐ Pass ☐ Fail |
| Battery-Aware Power | ☐ | ☐ | ☐ Pass ☐ Fail |
| Sidebar Toggle | ☐ | ☐ | ☐ Pass ☐ Fail |
| Address Controls | ☐ | ☐ | ☐ Pass ☐ Fail |
| Keyboard Shortcuts | ☐ | ☐ | ☐ Pass ☐ Fail |

### Bug Triage
**P0 Bugs** (Must Fix Before Launch):
- [ ] None found

**P1 Bugs** (Should Fix Before Launch):
- [ ] None found

**P2 Bugs** (Nice to Fix):
- [ ] None found

**P3 Bugs** (Future Enhancements):
- [ ] None found

---

## βœ… Go/No-Go Decision Framework

### Go Criteria (Must Meet ALL)
- [x] Performance: ≥3/4 targets met (75%)
- [x] Features: All 6 toggles work
- [x] Persistence: localStorage works
- [x] Stability: No P0 bugs, ≀2 P1 bugs
- [x] Test Coverage: ≥90% tests passing (120/121 = 99% βœ…)

### No-Go Triggers (Any ONE Fails)
- [ ] Cold start >5000ms (critical)
- [ ] Memory >400MB (critical)
- [ ] P0 bugs exist
- [ ] Settings UI crashes
- [ ] Data loss on reload

### Decision
**Date**: _____________  
**Time**: _____________  
**Decision**: ☐ GO ☐ NO-GO

**Rationale**:
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

**Sign-off**: _____________

---

## πŸš€ Next Steps

### If GO:
1. Create GitHub Release v0.3.0-beta
2. Sign Windows installer (code signing certificate)
3. Deploy to beta staging environment
4. Recruit 10-20 beta testers
5. Execute [BETA_LAUNCH_CHECKLIST.md](./BETA_LAUNCH_CHECKLIST.md)

### If NO-GO:
1. Triage all P0/P1 bugs
2. Implement fixes (Phase 7: Optimization)
3. Re-run Phase 6 testing
4. Delay launch by 3-5 days

---

## πŸ"ž Support Contacts

**Technical Issues**: See [WEEK2_DESKTOP_TESTING_CHECKLIST.md](./WEEK2_DESKTOP_TESTING_CHECKLIST.md)  
**Launch Decision**: See [BETA_LAUNCH_CHECKLIST.md](./BETA_LAUNCH_CHECKLIST.md)  
**Performance Questions**: See [WEEK2_PERFORMANCE_BASELINE_REPORT.md](./WEEK2_PERFORMANCE_BASELINE_REPORT.md)

---

**Last Updated**: December 14, 2024  
**Sprint**: Week 2 - Phase 6  
**Version**: 0.3.0-beta
