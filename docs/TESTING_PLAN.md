# Regen Browser Pre-Launch Testing Plan

**Date**: December 10, 2025  
**Target**: Feb 2026 Beta Launch  
**Status**: Ready for Testing Phase

---

## Overview

This document outlines the comprehensive testing plan to validate all fixes and ensure production readiness for the Feb 2026 beta launch.

---

## Testing Phases

### Phase 1: Automated Testing (Week 1)

- [x] Unit tests (already passing - 91 tests)
- [ ] Load testing (k6 scripts)
- [ ] Performance profiling (500+ tabs)
- [ ] Integration tests (voice → agent → modes)

### Phase 2: Cross-Platform Testing (Week 1-2)

- [ ] Windows 10/11 testing
- [ ] Linux (Ubuntu/Debian) testing
- [ ] macOS testing
- [ ] Platform-specific edge cases

### Phase 3: Network Testing (Week 2)

- [ ] Jio 4G network testing
- [ ] Airtel 4G network testing
- [ ] Offline → Online handoff testing
- [ ] Slow network simulation (3G speeds)

### Phase 4: Beta User Testing (Week 3)

- [ ] Recruit 10-20 beta users from India
- [ ] User acceptance testing (UAT)
- [ ] Feedback collection and prioritization
- [ ] Bug fixes based on feedback

---

## Test Scenarios

### 1. Load Testing (k6)

**Objective**: Verify system handles 1K concurrent users without degradation.

**Scenarios**:

- 100 concurrent WebSocket connections
- 500 concurrent tab operations
- 200 concurrent voice commands
- 100 concurrent research queries

**Success Criteria**:

- No crashes or OOM errors
- Response time < 2s for 95% of requests
- Memory usage stable (< 500MB per instance)
- CPU usage < 80% average

**Scripts**: `tests/load/k6-load-test.js`

---

### 2. Performance Profiling (500+ Tabs)

**Objective**: Verify GVE prune and memory management at scale.

**Scenarios**:

- Open 500 tabs sequentially
- Verify GVE prune triggers at 500 nodes
- Check memory usage stays < 1GB
- Verify tab persistence works after reload

**Success Criteria**:

- GVE prune triggers correctly (keeps newest 400)
- Memory usage < 1GB at 500 tabs
- Tab state persists after reload (0% loss)
- No performance degradation (< 2s tab switch)

**Scripts**: `tests/performance/tab-stress-test.js`

---

### 3. Cross-Platform Testing

**Objective**: Ensure consistent behavior across platforms.

**Test Matrix**:

| Platform | OS Version   | Test Focus                   | Status |
| -------- | ------------ | ---------------------------- | ------ |
| Windows  | 10/11        | Download handler, voice, IPC | [ ]    |
| Linux    | Ubuntu 22.04 | Mic permissions, Tauri IPC   | [ ]    |
| macOS    | 13+          | Sandbox permissions, voice   | [ ]    |

**Key Tests**:

- Voice recognition (all platforms)
- Download handling (all platforms)
- IPC communication (all platforms)
- File system access (all platforms)
- Network handling (all platforms)

---

### 4. Network Testing (Indian Networks)

**Objective**: Verify performance on Indian mobile networks.

**Test Scenarios**:

- Jio 4G: Voice commands, realtime sync, research queries
- Airtel 4G: Same as above
- Network toggle: Offline → Online handoff
- Slow network: 3G simulation (384 Kbps)

**Success Criteria**:

- Voice commands work on 4G (< 2s response)
- Realtime sync recovers from network drops (< 5s)
- Research queries complete on slow networks (< 10s)
- Queue cap prevents lag spikes (< 4s)

**Scripts**: `tests/network/network-simulation.js`

---

### 5. Integration Testing

**Objective**: Verify end-to-end flows work correctly.

**Test Flows**:

1. **Voice → Research**: "Research Bitcoin" → Opens Research mode → Scrapes → Summarizes
2. **Voice → Trade**: "Show NIFTY chart" → Opens Trade mode → Loads chart
3. **Tab → GVE**: Open 100 tabs → Verify GVE indexing → Search tabs
4. **Offline → Online**: Work offline → Reconnect → Verify sync
5. **Collaboration**: Two users → Verify awareness cursors → Verify Yjs sync

**Success Criteria**:

- All flows complete without errors
- Response time < 3s for each flow
- No data loss or corruption
- User feedback is positive

---

## Test Automation Setup

### k6 Load Testing

**Installation**:

```bash
npm install -g k6
```

**Script Location**: `tests/load/k6-load-test.js`

**Run**:

```bash
k6 run tests/load/k6-load-test.js
```

### Performance Profiling

**Tools**:

- Chrome DevTools Performance tab
- Node.js `--inspect` for backend profiling
- Tauri DevTools for IPC profiling

**Script Location**: `tests/performance/profile-tabs.js`

---

## Beta User Testing

### Recruitment Criteria

**Target Users**:

- 10-20 users from India
- Mix of technical and non-technical users
- Active browser users (daily usage)
- Willing to provide feedback

**Recruitment Channels**:

- Twitter/X (tech community)
- Reddit (r/India, r/startups)
- Product Hunt (early access)
- Personal network

### Beta Testing Checklist

**Week 1 Tasks**:

- [ ] Install and first launch
- [ ] Complete onboarding tour
- [ ] Try voice commands (Hindi + English)
- [ ] Test Research mode
- [ ] Test Trade mode
- [ ] Test tab management

**Week 2 Tasks**:

- [ ] Daily usage (1 hour/day)
- [ ] Report bugs/issues
- [ ] Provide feedback on UX
- [ ] Test on different networks
- [ ] Test offline functionality

**Feedback Collection**:

- Google Form for structured feedback
- Discord/Slack for real-time support
- Weekly check-in calls (optional)

---

## Success Metrics

### Technical Metrics

| Metric                 | Target       | Current | Status |
| ---------------------- | ------------ | ------- | ------ |
| Load Test (1K users)   | Pass         | TBD     | [ ]    |
| Performance (500 tabs) | < 1GB memory | TBD     | [ ]    |
| Cross-platform         | 100% pass    | TBD     | [ ]    |
| Network tests          | 95% success  | TBD     | [ ]    |
| Integration tests      | 100% pass    | TBD     | [ ]    |

### User Metrics

| Metric                 | Target        | Current | Status |
| ---------------------- | ------------- | ------- | ------ |
| Beta user satisfaction | > 4/5         | TBD     | [ ]    |
| Bug reports            | < 10 critical | TBD     | [ ]    |
| Feature requests       | < 20          | TBD     | [ ]    |
| Retention (Week 1)     | > 70%         | TBD     | [ ]    |

---

## Risk Mitigation

### High-Risk Areas

1. **Network Reliability**: Test extensively on Indian networks
2. **Platform-Specific Bugs**: Test on all platforms early
3. **Scale Issues**: Load test before beta launch
4. **User Experience**: Get feedback early and iterate

### Contingency Plans

- **If load test fails**: Optimize before beta launch
- **If critical bugs found**: Fix immediately, delay beta if needed
- **If user feedback negative**: Iterate quickly, extend beta period

---

## Timeline

### Week 1: Automated Testing

- Day 1-2: Set up k6 load testing
- Day 3-4: Performance profiling
- Day 5: Integration test automation

### Week 2: Cross-Platform + Network

- Day 1-3: Cross-platform testing
- Day 4-5: Network testing (Jio/Airtel)

### Week 3: Beta User Testing

- Day 1-2: Beta user recruitment
- Day 3-5: Beta user onboarding and initial feedback

### Week 4: Polish + Launch Prep

- Day 1-3: Fix critical bugs from beta
- Day 4-5: Final polish and documentation

---

## Next Steps

1. **Create k6 load test script** (`tests/load/k6-load-test.js`)
2. **Create performance profiling script** (`tests/performance/profile-tabs.js`)
3. **Set up beta user recruitment form** (Google Form)
4. **Create beta user guide** (`docs/BETA_USER_GUIDE.md`)
5. **Set up feedback collection system** (Discord/Slack)

---

_Last Updated: December 10, 2025_  
_Next Update: After Week 1 testing completion_
