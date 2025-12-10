# Week 2 Testing - Execution Guide

**Status**: 🟢 **Ready to Execute**  
**Date**: December 10, 2025

---

## 🎯 Quick Start

### 1. Check Current Progress

```bash
npm run test:week2-progress
```

### 2. Generate Test Checklist

```bash
npm run test:week2-checklist
```

### 3. Analyze Codebase for Test Scenarios

```bash
npm run test:week2-analyze
```

### 4. Generate Test Data

```bash
npm run test:week2-data
```

---

## 📋 Testing Workflow

### Step 1: Pre-Testing Setup

**Before starting any testing:**

1. **Install Browser Build**

   ```bash
   # Build the browser for your platform
   npm run build
   cd tauri-migration && npm run tauri build
   ```

2. **Install Ollama** (if not already installed)

   ```bash
   # Windows: Download from https://ollama.com/download
   # Linux: curl -fsSL https://ollama.com/install.sh | sh
   # macOS: brew install ollama
   ```

3. **Pull AI Models**

   ```bash
   ollama pull phi3:mini
   ollama pull llava:7b
   ```

4. **Prepare Testing Environment**
   - Grant microphone permissions
   - Set up test network connections (Jio/Airtel 4G)
   - Prepare test devices/platforms

---

### Step 2: Windows Testing (Day 1-2)

**Open**: `docs/WEEK2_TESTING_TRACKER.md`

**Follow this order:**

1. **Basic Functionality** (30 min)
   - Launch browser
   - Test tabs (open, close, persist)
   - Test downloads
   - Test bookmarks/history

2. **Voice Features** (30 min)
   - Test voice button
   - Test Ctrl+Space hotkey
   - Test English recognition
   - Test Hindi recognition
   - Test voice commands

3. **Modes** (30 min)
   - Test Browse mode
   - Test Research mode
   - Test Trade mode
   - Test Docs mode
   - Test mode switching

4. **Performance** (1 hour)
   - Test with 50 tabs
   - Test with 100 tabs
   - Test with 200 tabs
   - Monitor memory usage
   - Test tab switch speed

**Document Results**: Use `docs/WEEK2_TEST_REPORT_TEMPLATE.md`

---

### Step 3: Linux Testing (Day 3-4)

**Follow same order as Windows**, but pay special attention to:

1. **Sandbox Permissions**
   - Verify all permissions work
   - Test download handler

2. **Voice on Linux**
   - Check for mic icon ghosting
   - Test microphone permissions
   - Verify voice recognition works

3. **Performance**
   - Test with 50+ tabs
   - Monitor memory usage
   - Check for crashes

**Document Results**: Use test report template

---

### Step 4: Network Testing (Day 5)

**Jio 4G Testing** (1 hour):

1. Connect to Jio 4G network
2. Test voice commands (record latency)
3. Test research queries (record latency)
4. Test realtime sync (record latency)
5. Test offline → online handoff
6. Document all metrics

**Airtel 4G Testing** (1 hour):

1. Connect to Airtel 4G network
2. Repeat same tests as Jio
3. Compare metrics
4. Document differences

**Document Results**: Use test report template with network metrics

---

### Step 5: Offline → Online Handoff (Day 6)

**Test Sequence**:

1. **Start Online** (15 min)
   - Open 10 tabs
   - Make changes (create tabs, use voice)
   - Verify all changes sync

2. **Go Offline** (15 min)
   - Disconnect network
   - Continue using browser
   - Open more tabs
   - Use voice commands
   - Check queue size (< 150 items)

3. **Go Online** (15 min)
   - Reconnect network
   - Wait for sync (< 5s)
   - Verify all changes sync
   - Verify no data loss
   - Verify no duplicates

**Document Results**: Use test report template

---

### Step 6: Documentation (Day 7)

**Update All Trackers**:

1. **Update WEEK2_TESTING_TRACKER.md**
   - Mark completed tests
   - Log all issues
   - Record metrics

2. **Update TEST_RESULTS_TRACKER.md**
   - Add cross-platform results
   - Add network results
   - Add issue summary

3. **Update TESTING_STATUS.md**
   - Mark Week 2 as complete
   - Update progress percentage

4. **Create Week 2 Summary**
   - Summarize all findings
   - Prioritize issues
   - Plan fixes

---

## 🐛 Issue Logging Workflow

### When You Find an Issue:

1. **Document Immediately**
   - Don't rely on memory
   - Take screenshots/videos
   - Note exact steps to reproduce

2. **Log in Tracker**
   - Add to Issues Log in `WEEK2_TESTING_TRACKER.md`
   - Categorize by severity:
     - Critical (blocks launch)
     - High (major impact)
     - Medium (moderate impact)
     - Low (minor impact)

3. **Use Issue Template**:
   ```
   **Issue #**: [Auto-number]
   **Platform/Network**: [Windows/Linux/macOS/Jio/Airtel]
   **Severity**: [Critical/High/Medium/Low]
   **Description**: [What happened]
   **Steps to Reproduce**:
   1.
   2.
   3.
   **Expected Behavior**: [What should happen]
   **Actual Behavior**: [What actually happened]
   **Screenshots**: [Attach if available]
   **Status**: [Open/Fixed/Deferred]
   ```

---

## 📊 Metrics Recording

### Performance Metrics

**Record for each platform:**

- Memory usage at 50 tabs: **\_** MB
- Memory usage at 100 tabs: **\_** MB
- Memory usage at 200 tabs: **\_** MB
- Tab switch P95: **\_** ms
- Browser launch time: **\_** s

### Network Metrics

**Record for each network (Jio/Airtel):**

- Voice command latency: **\_** ms
- Research query latency: **\_** ms
- Realtime sync latency: **\_** ms
- Network handoff time: **\_** ms
- Connection drop rate: **\_** %

### Success Criteria

- ✅ Memory < 1GB at 100 tabs
- ✅ Tab switch < 2s
- ✅ Voice commands < 2s
- ✅ Research queries < 10s
- ✅ Realtime sync < 1s
- ✅ Network handoff < 5s

---

## 🛠️ Testing Tools

### Available Commands

```bash
# Check progress
npm run test:week2-progress

# Generate checklist
npm run test:week2-checklist

# Analyze codebase
npm run test:week2-analyze

# Generate test data
npm run test:week2-data

# Create test report
node scripts/week2-test-helpers.js report Windows 2025-12-10
```

### Key Documents

- `docs/WEEK2_TESTING_TRACKER.md` - Main tracker (use this!)
- `docs/WEEK2_TEST_REPORT_TEMPLATE.md` - Session reports
- `docs/WEEK2_QUICK_START.md` - Quick reference
- `docs/MANUAL_TESTING_CHECKLIST.md` - Detailed checklist

---

## ✅ Daily Checklist

### Each Testing Day:

- [ ] Review today's test plan
- [ ] Set up testing environment
- [ ] Run tests according to plan
- [ ] Document results immediately
- [ ] Log all issues found
- [ ] Take screenshots/videos of bugs
- [ ] Update progress tracker
- [ ] Review findings at end of day

---

## 🎯 Success Criteria

### Week 2 Completion:

- [ ] Windows testing complete (100% pass rate)
- [ ] Linux testing complete (100% pass rate)
- [ ] macOS testing complete (if available)
- [ ] Jio 4G testing complete (95% success rate)
- [ ] Airtel 4G testing complete (95% success rate)
- [ ] Offline → Online handoff complete (100% success)
- [ ] All issues documented and prioritized
- [ ] Test results recorded in tracker
- [ ] Week 2 summary created

---

## 💡 Testing Tips

1. **Test on Real Devices**: Use actual hardware, not just VMs
2. **Test on Real Networks**: Use actual Jio/Airtel 4G, not WiFi
3. **Document Immediately**: Don't wait to document issues
4. **Take Screenshots**: Visual evidence is crucial
5. **Test Edge Cases**: Low battery, poor signal, etc.
6. **Test User Scenarios**: Trader, student, developer use cases
7. **Compare Platforms**: Note differences between Windows/Linux
8. **Monitor Resources**: Watch CPU, memory, network usage

---

## 🚨 Common Issues to Watch For

### Windows:

- Download handler not working
- Tab persistence issues
- Memory leaks

### Linux:

- Microphone permissions
- Mic icon ghosting
- Sandbox permission issues

### Network:

- Connection drops
- High latency
- Sync failures
- Queue overflow (> 150 items)

---

## 📞 Need Help?

- **Check Documentation**: See `docs/` folder
- **Review Codebase**: Use `npm run test:week2-analyze`
- **Generate Checklist**: Use `npm run test:week2-checklist`
- **Check Progress**: Use `npm run test:week2-progress`

---

**Ready to start?** Open `docs/WEEK2_TESTING_TRACKER.md` and begin testing!

---

_Last Updated: December 10, 2025_
