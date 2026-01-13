# Production Tests

Tests that verify Regen is a REAL browser, not a demo.

## Test Files

### Unit Tests (Vitest):
- **6-hour-session.test.ts** - Unit test version (simulated)
- **20-tabs.test.ts** - 20 tabs performance test ✅
- **ai-independence.test.ts** - AI independence test ✅
- **memory-management.test.ts** - Memory management test ✅
- **failure-recovery.test.ts** - Failure recovery test ✅
- **performance-profiling.test.ts** - Performance profiling ✅
- **avatar-responsiveness.test.ts** - Avatar responsiveness ✅
- **performance-parity.test.ts** - Performance parity ✅

### E2E Tests (Playwright):
- **tests/e2e/6-hour-session.e2e.spec.ts** - Real browser automation tests

## Running Tests

### Unit Tests:
```bash
# Run all production unit tests
npm run test:production

# Run specific test
npm run test:production -- ai-independence
npm run test:production -- 20-tabs
```

### E2E Tests:
```bash
# Run 6-hour session E2E tests (shortened for CI)
npm run test:production:e2e

# Run real 6-hour test (requires REAL_6_HOUR_TEST=true)
REAL_6_HOUR_TEST=true npm run test:production:e2e

# Or use Playwright directly
playwright test tests/e2e/6-hour-session.e2e.spec.ts
```

## Test Helpers

See `helpers/` directory:
- **performance.ts** - Performance monitoring
- **ai-engine.ts** - AI testing utilities
- **tab-manager.ts** - Tab management utilities

## Test Status

- ✅ **27 tests passing** (unit tests)
- ⏭️ **4 tests skipped** (require browser/system APIs)
- ⚠️ **6 tests todo** (E2E tests - use Playwright version)

## Requirements

All tests must pass before calling V1 GA.

---

**Last Updated:** 2026-01-11
