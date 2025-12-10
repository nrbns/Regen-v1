# Week 2 Testing - Quick Start Guide

**Status**: 🟢 **Ready to Start**  
**Duration**: 7 days (December 10-17, 2025)

---

## 🎯 Week 2 Objectives

1. **Cross-Platform Testing**: Verify browser works on Windows, Linux, macOS
2. **Network Testing**: Test on Jio 4G, Airtel 4G, and offline→online handoff
3. **Issue Documentation**: Log all bugs and issues found

**Target**: 100% pass rate on platforms, 95% success on networks

---

## 📋 Quick Checklist

### Pre-Testing Setup

- [ ] Install Regen Browser on test platform
- [ ] Install Ollama: `ollama pull phi3:mini`
- [ ] Grant microphone permissions
- [ ] Complete onboarding tour
- [ ] Set language preference (Hindi/English)

### Daily Tasks

**Day 1-2: Windows Testing**

- [ ] Basic functionality (tabs, downloads, bookmarks)
- [ ] Voice features (Hindi + English)
- [ ] All modes (Browse, Research, Trade, Docs)
- [ ] Performance (50, 100, 200 tabs)
- [ ] Document issues

**Day 3-4: Linux Testing**

- [ ] Basic functionality
- [ ] Voice features (check for mic icon ghosting)
- [ ] All modes
- [ ] Performance
- [ ] Document issues

**Day 5: Network Testing**

- [ ] Jio 4G testing (voice, research, sync)
- [ ] Airtel 4G testing (voice, research, sync)
- [ ] Document latency metrics
- [ ] Document issues

**Day 6: Offline → Online Handoff**

- [ ] Start online, make changes
- [ ] Go offline, continue using
- [ ] Go online, verify sync
- [ ] Check queue size < 150
- [ ] Document issues

**Day 7: Documentation**

- [ ] Update [WEEK2_TESTING_TRACKER.md](WEEK2_TESTING_TRACKER.md)
- [ ] Update [TEST_RESULTS_TRACKER.md](TEST_RESULTS_TRACKER.md)
- [ ] Update [TESTING_STATUS.md](TESTING_STATUS.md)
- [ ] Create Week 2 summary

---

## 🖥️ Cross-Platform Testing

### Windows 10/11

**Quick Test**:

1. Launch browser
2. Open 10 tabs
3. Test voice: "Research Bitcoin"
4. Switch modes (Browse → Research → Trade)
5. Check for white screens
6. Open 50 tabs, check memory

**Full Checklist**: See [WEEK2_TESTING_TRACKER.md](WEEK2_TESTING_TRACKER.md)

### Linux (Ubuntu/Debian)

**Quick Test**:

1. Launch browser
2. Grant microphone permissions
3. Test voice (check for mic icon ghosting)
4. Test all modes
5. Check sandbox permissions

**Full Checklist**: See [WEEK2_TESTING_TRACKER.md](WEEK2_TESTING_TRACKER.md)

### macOS (If Available)

**Quick Test**:

1. Launch browser
2. Test all features
3. Check sandbox permissions

**Full Checklist**: See [WEEK2_TESTING_TRACKER.md](WEEK2_TESTING_TRACKER.md)

---

## 📡 Network Testing

### Jio 4G

**Quick Test**:

1. Connect to Jio 4G
2. Test voice: "Research Bitcoin" (should complete < 2s)
3. Test research query (should complete < 10s)
4. Check realtime sync latency (< 1s)
5. Test offline → online handoff

**Metrics to Record**:

- Voice command latency: **\_** ms
- Research query latency: **\_** ms
- Realtime sync latency: **\_** ms

### Airtel 4G

**Quick Test**:

1. Connect to Airtel 4G
2. Test voice: "Research Bitcoin" (should complete < 2s)
3. Test research query (should complete < 10s)
4. Check realtime sync latency (< 1s)
5. Test offline → online handoff

**Metrics to Record**:

- Voice command latency: **\_** ms
- Research query latency: **\_** ms
- Realtime sync latency: **\_** ms

### Offline → Online Handoff

**Quick Test**:

1. Start online, open 10 tabs
2. Make changes (create tabs, use voice)
3. Go offline (disconnect network)
4. Continue using (open tabs, use voice)
5. Go online (reconnect network)
6. Verify all changes sync (< 5s)
7. Check queue size < 150 items

---

## 🐛 Issue Documentation

### How to Document Issues

1. **Record immediately** (don't rely on memory)
2. **Take screenshots/videos** of bugs
3. **Note steps to reproduce**
4. **Record in [WEEK2_TESTING_TRACKER.md](WEEK2_TESTING_TRACKER.md)**

### Issue Template

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

## 📊 Success Criteria

### Cross-Platform

- ✅ 100% pass rate on Windows
- ✅ 100% pass rate on Linux
- ✅ 100% pass rate on macOS (if available)
- ✅ All critical issues fixed
- ✅ All high-priority issues documented

### Network

- ✅ 95% success rate on Jio 4G
- ✅ 95% success rate on Airtel 4G
- ✅ 100% success on offline → online handoff
- ✅ All latency metrics within targets
- ✅ All issues documented

---

## 📝 Daily Log Template

### Day [X] - [Platform/Network] Testing

**Date**: ********\_********  
**Tester**: ********\_********  
**Platform/Network**: ********\_********

**Tests Completed**:

- [ ] Basic functionality
- [ ] Voice features
- [ ] Modes
- [ ] Performance

**Issues Found**: [Number]

- Critical: [Number]
- High: [Number]
- Medium: [Number]
- Low: [Number]

**Notes**:

```
[Any additional notes]
```

---

## 🔗 Key Documents

- **[WEEK2_TESTING_TRACKER.md](WEEK2_TESTING_TRACKER.md)** - Main tracker (use this!)
- **[MANUAL_TESTING_CHECKLIST.md](MANUAL_TESTING_CHECKLIST.md)** - Detailed checklist
- **[TEST_RESULTS_TRACKER.md](TEST_RESULTS_TRACKER.md)** - Update with results
- **[TESTING_STATUS.md](TESTING_STATUS.md)** - Update progress

---

## 💡 Testing Tips

1. **Test on real devices** when possible (not just VMs)
2. **Test on actual networks** (Jio/Airtel) not just WiFi
3. **Document issues immediately** (don't rely on memory)
4. **Take screenshots/videos** of bugs
5. **Test edge cases** (low battery, poor signal, etc.)
6. **Test with different user scenarios** (trader, student, developer)

---

## ✅ Week 2 Completion Checklist

- [ ] Windows testing complete
- [ ] Linux testing complete
- [ ] macOS testing complete (if available)
- [ ] Jio 4G testing complete
- [ ] Airtel 4G testing complete
- [ ] Offline → Online handoff testing complete
- [ ] All issues documented in tracker
- [ ] Test results updated in tracker
- [ ] Testing status updated
- [ ] Week 2 summary created

---

**Ready to start?** Open [WEEK2_TESTING_TRACKER.md](WEEK2_TESTING_TRACKER.md) and begin testing!

---

_Last Updated: December 10, 2025_
