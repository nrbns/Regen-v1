# 🚨 Priority Fixes - RegenBrowser

**Quick reference: What to fix first (ordered by impact)**

---

## 🔴 CRITICAL (Fix Immediately - 0-7 days)

### 1. Crashes & Renderer Kills

**Impact**: Fatal - app unusable  
**Time**: 2-3 days

**Actions:**

- [x] Add Sentry crash reporting (main + renderer)
- [x] Add unhandled exception handlers
- [x] Monitor OOM kills and renderer crashes
- [x] Fix any known crash bugs

**Quick test:**

```bash
# Add to .env
SENTRY_DSN=your-dsn-here

# Run with logging
npm run dev -- --enable-logging
```

**Code locations:**

- `tauri-migration/src-tauri/src/main.rs` - Add error handlers
- `src/main.tsx` - Add error boundaries
- `src/core/errors/ErrorBoundary.tsx` - Enhance existing

---

### 2. Startup & Cold Load Time

**Impact**: Users judge in seconds  
**Time**: 1-2 days

**Actions:**

- [x] Measure current startup time (target: <3s to first paint)
- [x] Defer non-critical modules (AI, extensions) until after UI shows
- [x] Lazy-load heavy features
- [x] Move analytics/update checks to background

**Quick test:**

```bash
# Add to main.tsx
const startTime = performance.now();
window.addEventListener('load', () => {
  console.log('Time to load:', performance.now() - startTime);
});
```

**Target metrics:**

- Time to first paint: <1s
- Time to interactive: <3s
- Full app ready: <5s

---

### 3. Memory Leaks / High RAM

**Impact**: App becomes unusable over time  
**Time**: 2-3 days

**Actions:**

- [x] Take heap snapshots (DevTools → Memory)
- [x] Find detached DOM nodes, event listeners
- [x] Cap caches (LRU with max size)
- [x] Clean up timers/intervals on tab close
- [x] Use WeakRef for large objects

**Quick test:**

```bash
# Open DevTools → Memory → Take Heap Snapshot
# Use app for 10 minutes → Take another snapshot
# Compare to find leaks
```

**Code to check:**

- `src/state/tabsStore.ts` - Tab cleanup
- `src/components/layout/TabContentSurface.tsx` - Iframe cleanup
- `src/core/agent/agentClient.ts` - WebSocket cleanup

---

## 🟠 HIGH PRIORITY (Fix This Week - 7-14 days)

### 4. High CPU / Battery Drain

**Impact**: Kills UX on laptops & phones  
**Time**: 2-3 days

**Actions:**

- [x] Profile CPU usage (DevTools → Performance)
- [x] Throttle background tabs
- [x] Use `visibilitychange` to pause heavy tasks
- [x] Debounce scroll/resize handlers
- [x] Offload heavy work to Rust backend

**Quick test:**

```bash
# DevTools → Performance → Record 30s
# Look for long frames (red blocks)
# Check CPU usage in Task Manager
```

---

### 5. Janky UI / Frame Drops

**Impact**: Visible during scrolling, animations  
**Time**: 1-2 days

**Actions:**

- [x] Reduce layout thrashing
- [x] Use composited CSS (transform, opacity)
- [x] Prefer CSS animations over JS
- [x] Use `will-change` sparingly

**Quick test:**

```bash
# DevTools → Rendering → Paint flashing
# Scroll and check for red flashes
```

---

### 6. Network Slowness / Heavy FCP

**Impact**: Affects first impressions  
**Time**: 1-2 days

**Actions:**

- [x] Implement connection pooling
- [x] Add service worker caching
- [x] Preconnect to important domains
- [x] Compress assets (brotli/gzip)

**Quick test:**

```bash
# DevTools → Network tab
# Check for large requests, blocking time
npx lighthouse http://localhost:1420 --view
```

---

## 🟡 MEDIUM PRIORITY (Fix This Month - 14-30 days)

### 7. Privacy/Security Holes

**Impact**: Showstopper for trust  
**Time**: 3-5 days

**Actions:**

- [x] Add CSP headers
- [x] Validate all IPC messages
- [x] Use secure storage for sensitive data
- [x] Disable Node integration in web views (Tauri handles this)
- [x] Regular dependency updates

**Checklist:**

- [ ] `tauri-migration/src-tauri/tauri.conf.json` - CSP config
- [ ] `src/lib/ipc-typed.ts` - IPC validation
- [ ] All API key storage - use OS keychain

---

### 8. Onboarding & First-Run Experience

**Impact**: Convert installs → daily users  
**Time**: 2-3 days

**Actions:**

- [x] Add 1-minute guided tour (Omni AI demo)
- [x] "Try AI Omni Mode" CTA on first run
- [x] Simple sync/signup flow (skip option)
- [x] Fast install, small download size

**Quick win:**

- Add tour modal in `src/components/Onboarding/OnboardingTour.tsx`

---

### 9. Developer DX / CI / Releases

**Impact**: Slows feature velocity  
**Time**: 3-5 days

**Actions:**

- [x] Set up GitHub Actions for PR lint/build/test
- [x] Add prettier, eslint, husky
- [x] Unit tests for critical utilities
- [x] Smoke e2e tests (tab open/close)
- [x] Feature flags for canary releases

---

## 🟢 LOW PRIORITY (Later - 30+ days)

### 10. Monetization / Retention Hooks

**Impact**: Revenue/engagement  
**Time**: 5-7 days

**Actions:**

- [ ] Activity badge/pop for "AI tip"
- [ ] Share screenshot CTA
- [ ] Auto-update + patch channel
- [ ] Sync + opt-in telemetry

---

## 📊 Quick Detection Commands

### A. Basic Health & Telemetry

```bash
# Add Sentry
SENTRY_DSN=your-dsn npm start

# Log launch time
# Add to main.tsx: console.time('app-start')
```

### B. Startup / Lighthouse

```bash
# Run Lighthouse
npx lighthouse http://localhost:1420 --view --output html

# Or in DevTools: Lighthouse → Generate report
```

### C. Memory / CPU Checks

```bash
# DevTools → Performance → Record 15-30s
# Look for:
# - Long frames (red blocks)
# - Increasing JS heap → leak
# - High CPU usage
```

### D. Bundle Analysis

```bash
# Check bundle size
npx source-map-explorer dist/renderer/*.js

# Or
du -sh dist/*
ls -lh dist/
```

### E. Network Analysis

```bash
# DevTools → Network tab
# Filter by: large requests, blocking time, DNS latency
```

---

## 🎯 7-Day Sprint Plan

### Day 1-2: Crashes & Stability

- [x] Add Sentry
- [x] Fix known crashes
- [x] Add error boundaries

### Day 3-4: Startup Performance

- [x] Measure startup time
- [x] Defer non-critical modules
- [x] Lazy-load heavy features

### Day 5-6: Memory Leaks

- [x] Heap snapshots
- [x] Fix leaks
- [x] Cap caches

### Day 7: Quick Wins

- [x] Onboarding tour
- [x] Bundle analysis
- [x] Network optimization

---

## 🔧 Immediate Actions (Copy/Paste)

### 1. Add Sentry (5 min)

```bash
npm install @sentry/tauri @sentry/react
```

Add to `tauri-migration/src-tauri/src/main.rs`:

```rust
// TODO: Add Sentry initialization
```

Add to `src/main.tsx`:

```typescript
import * as Sentry from '@sentry/react';
Sentry.init({ dsn: import.meta.env.SENTRY_DSN });
```

### 2. Measure Startup Time (2 min)

Add to `src/main.tsx`:

```typescript
const startTime = performance.now();
window.addEventListener('load', () => {
  const loadTime = performance.now() - startTime;
  console.log(`[Perf] App loaded in ${loadTime.toFixed(2)}ms`);
  // Send to analytics
});
```

### 3. Heap Snapshot (5 min)

1. Open DevTools → Memory
2. Take Heap Snapshot
3. Use app for 10 min
4. Take another snapshot
5. Compare to find leaks

### 4. Lighthouse Report (2 min)

```bash
npx lighthouse http://localhost:1420 --view --output html
```

---

## 📈 Success Metrics

**Target after 7 days:**

- ✅ Zero crashes (Sentry reports)
- ✅ Startup <3s to first paint
- ✅ Memory stable (no leaks)
- ✅ CPU <20% idle

**Target after 30 days:**

- ✅ All critical issues fixed
- ✅ Onboarding tour complete
- ✅ CI/CD pipeline working
- ✅ Auto-update enabled

---

## 🚀 Next Steps

1. **Start with Day 1-2** (Crashes & Stability)
2. **Run detection commands** to identify issues
3. **Fix highest impact items first**
4. **Measure before/after** to track progress

---

**Last Updated**: $(date)  
**Status**: Ready to execute
