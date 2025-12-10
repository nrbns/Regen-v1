# Testing Quick Start Guide

**Quick reference for running all tests**

---

## Automated Tests

### 1. Unit Tests

```bash
npm test
# Or: npm run test:unit
```

**Status**: ✅ 91 tests passing

---

### 2. Performance Test

```bash
npm run test:performance
# Or: node tests/performance/profile-tabs.js
```

**Status**: ✅ PASSED (all metrics within targets)

**What it tests**:

- Tab creation (500 tabs)
- GVE prune functionality
- Tab persistence
- Tab switch performance

---

### 3. Integration Tests

```bash
npm run test:integration
# Or: node tests/integration/run-all.js
```

**Status**: ✅ PASSED (3/3 flows working)

**What it tests**:

- Voice → Research flow
- Tab → GVE indexing flow
- Offline → Online handoff flow

---

### 4. Load Test (k6)

```bash
# First, install k6:
npm install -g k6
# Or download from: https://k6.io/download

# Then run:
npm run test:load
# Or: k6 run tests/load/k6-load-test.js
```

**Status**: ⏳ Pending k6 installation

**What it tests**:

- 1K concurrent users
- WebSocket connections
- Tab operations
- Voice commands
- Research queries

---

### 5. Run All Automated Tests

```bash
npm run test:automated
# Or: node scripts/run-tests.js --all
```

**Runs**:

- Performance test
- Integration tests
- Load test (if k6 installed)
- Unit tests

---

## Manual Tests

### Cross-Platform Testing

See: `docs/MANUAL_TESTING_CHECKLIST.md`

**Platforms**:

- Windows 10/11
- Linux (Ubuntu/Debian)
- macOS (if available)

---

### Network Testing

See: `docs/MANUAL_TESTING_CHECKLIST.md`

**Networks**:

- Jio 4G
- Airtel 4G
- Offline → Online handoff

---

## Test Results

### View Results

- Test Results Tracker: `docs/TEST_RESULTS_TRACKER.md`
- Testing Status: `docs/TESTING_STATUS.md`
- Week 1 Summary: `docs/WEEK1_TESTING_SUMMARY.md`

### Test Reports

- Location: `test-results/` directory
- Format: JSON and Markdown reports
- Timestamped for each test run

---

## Troubleshooting

### k6 Not Found

```bash
# Install k6 globally
npm install -g k6

# Or download from:
# https://k6.io/download
```

### Tests Failing

1. Check server is running (for integration/load tests)
2. Check Ollama is installed (for voice/research tests)
3. Check console for error messages
4. Review test logs in `test-results/` directory

### Performance Issues

- Check system resources (CPU, memory)
- Close other applications
- Run tests one at a time
- Check for memory leaks

---

## Quick Commands Reference

```bash
# All tests
npm run test:automated

# Individual tests
npm run test:performance
npm run test:integration
npm run test:load
npm test

# Manual testing
# See: docs/MANUAL_TESTING_CHECKLIST.md
```

---

## Test Status Dashboard

| Test           | Status     | Command                    |
| -------------- | ---------- | -------------------------- |
| Unit           | ✅ Passing | `npm test`                 |
| Performance    | ✅ PASSED  | `npm run test:performance` |
| Integration    | ✅ PASSED  | `npm run test:integration` |
| Load (k6)      | ⏳ Pending | `npm run test:load`        |
| Cross-Platform | 📋 Manual  | See checklist              |
| Network        | 📋 Manual  | See checklist              |

---

_Last Updated: December 10, 2025_
