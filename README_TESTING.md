# Regen Browser Testing Guide

**Complete guide to testing Regen Browser before beta launch**

---

## Overview

This guide covers all testing activities for Regen Browser, from automated unit tests to manual cross-platform validation.

**Current Status**: Week 1 Automated Testing - 67% Complete (2/3 tests done)

---

## Quick Start

### Run All Automated Tests

```bash
npm run test:automated
```

### Run Individual Tests

```bash
npm run test:performance    # Performance profiling
npm run test:integration    # Integration tests
npm run test:load          # Load testing (requires k6)
npm test                   # Unit tests
```

### Manual Testing

See: [`docs/MANUAL_TESTING_CHECKLIST.md`](docs/MANUAL_TESTING_CHECKLIST.md)

---

## Test Types

### 1. Unit Tests ✅

**Status**: 91 tests passing  
**Command**: `npm test`  
**Coverage**: Component and utility functions

---

### 2. Performance Tests ✅

**Status**: PASSED  
**Command**: `npm run test:performance`  
**Tests**:

- Tab creation (500 tabs)
- GVE prune functionality
- Tab persistence
- Tab switch performance

**Results**: All metrics within targets

---

### 3. Integration Tests ✅

**Status**: PASSED (3/3 flows)  
**Command**: `npm run test:integration`  
**Tests**:

- Voice → Research flow
- Tab → GVE indexing flow
- Offline → Online handoff flow

**Results**: All flows working correctly

---

### 4. Load Tests ⏳

**Status**: Pending k6 installation  
**Command**: `npm run test:load`  
**Tests**:

- 1K concurrent users
- WebSocket connections
- Tab operations
- Voice commands
- Research queries

**Setup**: Install k6 first: `npm install -g k6`

---

### 5. Cross-Platform Tests 📋

**Status**: Manual testing required  
**Guide**: [`docs/MANUAL_TESTING_CHECKLIST.md`](docs/MANUAL_TESTING_CHECKLIST.md)  
**Platforms**:

- Windows 10/11
- Linux (Ubuntu/Debian)
- macOS (if available)

---

### 6. Network Tests 📋

**Status**: Manual testing required  
**Guide**: [`docs/MANUAL_TESTING_CHECKLIST.md`](docs/MANUAL_TESTING_CHECKLIST.md)  
**Networks**:

- Jio 4G
- Airtel 4G
- Offline → Online handoff

---

## Test Results

### Current Status

- ✅ Performance: PASSED
- ✅ Integration: PASSED (3/3)
- ⏳ Load: Pending k6
- ✅ Unit: Passing (91 tests)

### Detailed Results

- **Test Results Tracker**: [`docs/TEST_RESULTS_TRACKER.md`](docs/TEST_RESULTS_TRACKER.md)
- **Testing Status**: [`docs/TESTING_STATUS.md`](docs/TESTING_STATUS.md)
- **Week 1 Summary**: [`docs/WEEK1_TESTING_SUMMARY.md`](docs/WEEK1_TESTING_SUMMARY.md)

---

## Test Files Structure

```
tests/
├── integration/
│   ├── voice-to-research.test.js
│   ├── tab-to-gve.test.js
│   ├── offline-to-online.test.js
│   └── run-all.js
├── load/
│   └── k6-load-test.js
└── performance/
    └── profile-tabs.js

scripts/
└── run-tests.js          # Test runner

docs/
├── TESTING_PLAN.md
├── TEST_RESULTS_TRACKER.md
├── TESTING_STATUS.md
├── MANUAL_TESTING_CHECKLIST.md
└── TESTING_QUICK_START.md
```

---

## Success Criteria

| Metric                 | Target       | Current    | Status  |
| ---------------------- | ------------ | ---------- | ------- |
| Performance (500 tabs) | < 1GB memory | 1000MB     | ✅ PASS |
| Tab Switch P95         | < 2s         | 0.01ms     | ✅ PASS |
| Tab Persistence        | 0% loss      | 0%         | ✅ PASS |
| Integration Tests      | 100% pass    | 3/3        | ✅ PASS |
| Load Test (1K users)   | Pass         | ⏳ Pending | -       |
| Cross-platform         | 100% pass    | ⏳ Pending | -       |
| Network tests          | 95% success  | ⏳ Pending | -       |

**Overall**: 4/7 criteria met (57%)

---

## Next Steps

### Immediate

1. Install k6: `npm install -g k6`
2. Run load test: `npm run test:load`
3. Complete Week 1 automated testing

### Week 2

1. Cross-platform testing (Windows, Linux, macOS)
2. Network testing (Jio, Airtel 4G)
3. Manual testing checklist

### Week 3

1. Beta user recruitment
2. User acceptance testing
3. Feedback collection

---

## Troubleshooting

### Common Issues

**k6 not found**:

```bash
npm install -g k6
# Or download from: https://k6.io/download
```

**Tests failing**:

- Check server is running (for integration/load tests)
- Check Ollama is installed
- Review test logs in `test-results/` directory

**Performance issues**:

- Check system resources
- Close other applications
- Run tests individually

---

## Documentation

- **Testing Plan**: [`docs/TESTING_PLAN.md`](docs/TESTING_PLAN.md)
- **Quick Start**: [`docs/TESTING_QUICK_START.md`](docs/TESTING_QUICK_START.md)
- **Manual Checklist**: [`docs/MANUAL_TESTING_CHECKLIST.md`](docs/MANUAL_TESTING_CHECKLIST.md)
- **Results Tracker**: [`docs/TEST_RESULTS_TRACKER.md`](docs/TEST_RESULTS_TRACKER.md)

---

## Support

**Questions?** Check the documentation or create an issue.

---

_Last Updated: December 10, 2025_
