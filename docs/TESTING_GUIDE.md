# Testing Guide - New Features

**Date:** January 13, 2026  
**Status:** ✅ Test Suites Created

This guide explains how to test all new Regen v1 features.

---

## 🧪 Test Suites Created

### 1. Realtime Features (`realtime-features.spec.ts`)

Tests all realtime-related features:
- ✅ Event bus error recovery and throttling
- ✅ AI toggle functionality
- ✅ Performance benchmarks
- ✅ Onboarding tour
- ✅ Ollama setup wizard
- ✅ Realtime metrics dashboard
- ✅ Beta route access
- ✅ AI undo/feedback system

**Run:** `npm run test:realtime`

---

### 2. Event Bus Performance (`event-bus-performance.spec.ts`)

Tests event bus performance and resilience:
- ✅ Event throttling prevents CPU spikes
- ✅ Error recovery retries failed events
- ✅ Metrics dashboard updates in real-time
- ✅ Queue size stays manageable

**Run:** `npm run test:event-bus`

---

### 3. AI Features (`ai-features.spec.ts`)

Tests AI-related features:
- ✅ AI toggle persists state
- ✅ AI toggle visual feedback
- ✅ AI undo appears on actions
- ✅ AI feedback auto-hides

**Run:** `npm run test:ai`

---

### 4. Performance Benchmarks (`performance-benchmarks.spec.ts`)

Tests performance benchmarking:
- ✅ Benchmark panel renders
- ✅ Benchmarks execute successfully
- ✅ System info is displayed
- ✅ Requirements check works
- ✅ Benchmark results show pass/fail

**Run:** `npm run test:benchmarks`

---

## 🚀 Running Tests

### Run All New Feature Tests

```bash
npm run test:new-features
```

### Run Individual Test Suites

```bash
# Realtime features
npm run test:realtime

# Event bus performance
npm run test:event-bus

# AI features
npm run test:ai

# Performance benchmarks
npm run test:benchmarks
```

### Run with UI

```bash
npx playwright test --ui
```

### Run Specific Test

```bash
npx playwright test tests/e2e/realtime-features.spec.ts -g "AI Toggle"
```

---

## 📋 Manual Testing Checklist

### 1. Event Bus Error Recovery
- [ ] Open browser console
- [ ] Emit many events rapidly
- [ ] Check metrics dashboard (dev mode)
- [ ] Verify throttling works
- [ ] Check for failed events retry

### 2. AI Toggle
- [ ] Locate AI toggle in navigation bar
- [ ] Click to toggle on/off
- [ ] Verify icon changes
- [ ] Check aria-label updates
- [ ] Reload page, verify state persists

### 3. Performance Benchmarks
- [ ] Navigate to Settings → System
- [ ] Scroll to Performance Benchmarks
- [ ] Click "Run Benchmarks"
- [ ] Wait for completion
- [ ] Verify results displayed
- [ ] Check score calculation
- [ ] Verify system info shown

### 4. Onboarding Tour
- [ ] Clear localStorage: `localStorage.removeItem('regen:onboarding:completed')`
- [ ] Reload page
- [ ] Verify tour appears
- [ ] Test Next/Previous navigation
- [ ] Test Skip functionality
- [ ] Complete tour
- [ ] Verify tour doesn't show again

### 5. Ollama Setup Wizard
- [ ] Navigate to Settings → System
- [ ] Scroll to Local AI Setup (Ollama)
- [ ] Verify wizard is visible
- [ ] Check status indicators
- [ ] Test installation flow (if Ollama not installed)
- [ ] Test model download (if Ollama installed)

### 6. Beta Program
- [ ] Navigate to `/beta`
- [ ] Verify page loads
- [ ] Check tier options visible
- [ ] Test form submission
- [ ] Verify success message

### 7. AI Undo/Feedback
- [ ] Trigger AI action (via console or UI)
- [ ] Verify undo/feedback appears
- [ ] Test undo button
- [ ] Test feedback buttons
- [ ] Verify auto-hide after 5 seconds

### 8. Realtime Metrics Dashboard
- [ ] Run in dev mode: `npm run dev`
- [ ] Check bottom-right corner
- [ ] Verify dashboard visible
- [ ] Check metrics update
- [ ] Test reset button

---

## 🐛 Troubleshooting Tests

### Tests Fail to Run

**Issue:** Playwright not installed
```bash
npm install -D @playwright/test
npx playwright install
```

### Tests Timeout

**Issue:** App not starting
- Check if dev server is running: `npm run dev:web`
- Verify port 5173 is available
- Check `playwright.config.ts` baseURL

### Tests Can't Find Elements

**Issue:** Selectors changed
- Update selectors in test files
- Use `page.locator()` with more specific selectors
- Add `data-testid` attributes to components

### Metrics Dashboard Not Visible

**Issue:** Not in dev mode
- Ensure `import.meta.env.DEV` is true
- Check `NODE_ENV` environment variable
- Run with `npm run dev` not `npm run build`

---

## 📊 Test Coverage

### Current Coverage
- ✅ Event bus: Error recovery, throttling, metrics
- ✅ AI toggle: Functionality, persistence, visual feedback
- ✅ Performance benchmarks: Execution, results display
- ✅ Onboarding: Tour flow, navigation
- ✅ Ollama wizard: UI rendering, status checks
- ✅ Beta program: Page access, form elements
- ✅ AI undo/feedback: Appearance, functionality

### Missing Coverage
- ⏳ Cross-platform testing (Windows, macOS, Linux)
- ⏳ Performance testing on 4GB RAM devices
- ⏳ Integration with backend services
- ⏳ Payment flow testing (Stripe/PayPal)

---

## 🔄 Continuous Testing

### Pre-Commit
```bash
npm run test:new-features
```

### CI/CD
```yaml
# Add to GitHub Actions
- name: Run E2E Tests
  run: npm run test:new-features
```

### Local Development
```bash
# Watch mode (if supported)
npx playwright test --watch

# Debug mode
npx playwright test --debug
```

---

## 📚 Related Documentation

- [Verification Checklist](./VERIFICATION_CHECKLIST.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Quick Start Guide](./QUICK_START.md)

---

**Testing guide created:** January 13, 2026  
**Status:** ✅ Test suites ready  
**Next:** Run tests and fix any issues
