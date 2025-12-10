# Manual Testing Checklist

**Date**: December 10, 2025  
**Purpose**: Cross-platform and network testing before beta launch

---

## Pre-Testing Setup

- [ ] Install Regen Browser on test platform
- [ ] Install Ollama and pull models: `ollama pull phi3:mini`
- [ ] Grant microphone permissions
- [ ] Complete onboarding tour
- [ ] Set language preference (Hindi/English)

---

## Cross-Platform Testing

### Windows 10/11

#### Basic Functionality

- [ ] Browser launches successfully
- [ ] Tabs open and close correctly
- [ ] Tab drag-reorder works
- [ ] Tab persistence after reload (open 10 tabs, close browser, reopen)
- [ ] Download handler works (download a file, verify it saves)

#### Voice Features

- [ ] Voice button appears (bottom-right)
- [ ] Press `Ctrl+Space` activates voice
- [ ] Hindi voice recognition works ("Bitcoin kya hai?")
- [ ] English voice recognition works ("Research Tesla")
- [ ] Voice command editing works (edit before execute)
- [ ] Voice response time < 2s

#### Modes

- [ ] Browse mode works (open websites)
- [ ] Research mode opens and searches
- [ ] Trade mode opens and shows charts
- [ ] Mode switching is smooth (< 1s perceived)
- [ ] No white screens during mode switch

#### Performance

- [ ] Open 50 tabs - no crashes
- [ ] Open 100 tabs - memory usage reasonable
- [ ] Tab switch is fast (< 1s)
- [ ] No memory leaks (check Task Manager over 30 min)

#### Issues Found:

```
[Document any issues here]
```

---

### Linux (Ubuntu/Debian)

#### Basic Functionality

- [ ] Browser launches successfully
- [ ] Tabs open and close correctly
- [ ] Tab drag-reorder works
- [ ] Tab persistence after reload
- [ ] Download handler works

#### Voice Features

- [ ] Microphone permissions granted
- [ ] Voice button appears
- [ ] `Ctrl+Space` activates voice
- [ ] Voice recognition works (Hindi + English)
- [ ] No mic icon ghosting (check for visual bugs)

#### Modes

- [ ] All modes work correctly
- [ ] Mode switching smooth
- [ ] No white screens

#### Performance

- [ ] 50+ tabs work without issues
- [ ] Memory usage reasonable
- [ ] No crashes

#### Issues Found:

```
[Document any issues here]
```

---

### macOS (if available)

#### Basic Functionality

- [ ] Browser launches successfully
- [ ] Sandbox permissions work
- [ ] Tabs work correctly
- [ ] Tab persistence works
- [ ] Download handler works

#### Voice Features

- [ ] Microphone permissions granted
- [ ] Voice recognition works
- [ ] No permission issues

#### Modes

- [ ] All modes work
- [ ] Mode switching smooth

#### Performance

- [ ] 50+ tabs work
- [ ] Memory usage reasonable

#### Issues Found:

```
[Document any issues here]
```

---

## Network Testing

### Jio 4G Network

#### Test Scenarios

- [ ] Voice commands work (< 2s response)
- [ ] Research queries complete (< 10s)
- [ ] Realtime sync works (open 2 instances, verify sync)
- [ ] Network toggle: Offline → Online handoff (< 5s recovery)
- [ ] No desyncs on network drops

#### Performance Metrics

- Voice command latency: **\_** ms
- Research query latency: **\_** ms
- Realtime sync latency: **\_** ms
- Network handoff time: **\_** ms

#### Issues Found:

```
[Document any issues here]
```

---

### Airtel 4G Network

#### Test Scenarios

- [ ] Voice commands work (< 2s response)
- [ ] Research queries complete (< 10s)
- [ ] Realtime sync works
- [ ] Network toggle: Offline → Online handoff (< 5s recovery)
- [ ] No desyncs on network drops

#### Performance Metrics

- Voice command latency: **\_** ms
- Research query latency: **\_** ms
- Realtime sync latency: **\_** ms
- Network handoff time: **\_** ms

#### Issues Found:

```
[Document any issues here]
```

---

### Offline → Online Handoff

#### Test Scenarios

1. **Start Online**
   - [ ] Open 10 tabs
   - [ ] Make some changes (create tabs, update titles)

2. **Go Offline**
   - [ ] Disconnect internet
   - [ ] Continue working (open more tabs, make changes)
   - [ ] Verify changes are queued (check queue size < 150)

3. **Reconnect**
   - [ ] Reconnect internet
   - [ ] Verify sync completes (< 5s)
   - [ ] Verify no data loss
   - [ ] Verify no lag spikes (< 4s)

#### Success Criteria

- [ ] Queue size stays < 150 items
- [ ] All changes sync after reconnect
- [ ] No data loss
- [ ] Sync completes < 5s
- [ ] No lag spikes > 4s

#### Issues Found:

```
[Document any issues here]
```

---

## Integration Flow Testing

### Voice → Research Flow

**Steps**:

1. [ ] Press `Ctrl+Space`
2. [ ] Say "Research Bitcoin"
3. [ ] Verify command is recognized
4. [ ] Edit command if needed
5. [ ] Execute command
6. [ ] Verify Research mode opens
7. [ ] Verify search results appear
8. [ ] Verify scraping works
9. [ ] Verify summarization appears

**Success Criteria**:

- [ ] All steps complete without errors
- [ ] Total time < 3s
- [ ] Results are relevant

**Issues Found**:

```
[Document any issues here]
```

---

### Voice → Trade Flow

**Steps**:

1. [ ] Press `Ctrl+Space`
2. [ ] Say "Show NIFTY chart" or "NIFTY dikhao"
3. [ ] Verify command is recognized
4. [ ] Execute command
5. [ ] Verify Trade mode opens
6. [ ] Verify NIFTY chart loads
7. [ ] Verify real-time data updates

**Success Criteria**:

- [ ] All steps complete without errors
- [ ] Total time < 3s
- [ ] Chart displays correctly

**Issues Found**:

```
[Document any issues here]
```

---

### Tab → GVE Flow

**Steps**:

1. [ ] Open 20+ tabs with different content
2. [ ] Wait for GVE indexing (check console logs)
3. [ ] Use tab search (if available)
4. [ ] Verify semantic search works
5. [ ] Verify relevant tabs are found

**Success Criteria**:

- [ ] Tabs are indexed
- [ ] Search returns relevant results
- [ ] Search is fast (< 1s)

**Issues Found**:

```
[Document any issues here]
```

---

## Performance Testing

### Tab Stress Test

**Steps**:

1. [ ] Open 100 tabs sequentially
2. [ ] Monitor memory usage (should stay < 1GB)
3. [ ] Verify GVE prune triggers at 500 nodes
4. [ ] Switch between tabs (should be fast)
5. [ ] Close browser and reopen
6. [ ] Verify tabs persist (0% loss)

**Success Criteria**:

- [ ] No crashes
- [ ] Memory < 1GB
- [ ] Tab switch < 2s
- [ ] 0% data loss on reload

**Issues Found**:

```
[Document any issues here]
```

---

### Memory Leak Test

**Steps**:

1. [ ] Open browser
2. [ ] Note initial memory usage
3. [ ] Use browser for 30 minutes (open/close tabs, use modes)
4. [ ] Check memory usage again
5. [ ] Verify memory increase < 200MB

**Success Criteria**:

- [ ] Memory increase < 200MB over 30 min
- [ ] No gradual memory growth
- [ ] No crashes

**Issues Found**:

```
[Document any issues here]
```

---

## UI/UX Testing

### Onboarding

- [ ] Onboarding tour appears on first launch
- [ ] Tour steps are clear and helpful
- [ ] Can skip tour
- [ ] Tour doesn't appear again after completion

### Visual Feedback

- [ ] Loading spinners appear during mode switches
- [ ] No white screens (> 1s)
- [ ] Voice button shows listening state
- [ ] Connection status indicator works (if available)

### Accessibility

- [ ] Keyboard shortcuts work
- [ ] Voice commands accessible
- [ ] UI is readable (contrast, font size)
- [ ] Hindi text displays correctly

**Issues Found**:

```
[Document any issues here]
```

---

## Bug Reporting Template

For each issue found, document:

```
**Platform**: [Windows/Linux/macOS]
**Network**: [Jio/Airtel/WiFi/Offline]
**Steps to Reproduce**:
1.
2.
3.

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Screenshots**:
[If applicable]

**Console Logs**:
[Any error messages]

**Priority**: [Critical/High/Medium/Low]
```

---

## Test Completion Sign-off

**Tester Name**: ********\_********  
**Date**: ********\_********  
**Platform Tested**: ********\_********  
**Network Tested**: ********\_********

**Overall Status**: [ ] Pass [ ] Pass with Issues [ ] Fail

**Notes**:

```
[Any additional notes]
```

---

_Last Updated: December 10, 2025_
