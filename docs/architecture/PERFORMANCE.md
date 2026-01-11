# Performance Architecture

> **Core Principle: Browsing must be fast even if AI is off or slow.**

This document outlines Regen's performance-first architecture, optimization strategies, and engineering constraints to ensure the browser remains **faster than Chrome** even with AI enabled.

---

## 🎯 Performance Goals

### Non-Negotiable Requirements

1. **UI Thread Never Blocks**
   - All AI operations run off the main thread
   - React renders must complete in <16ms
   - No synchronous AI calls in UI code

2. **Tab Operations Are Instant**
   - Open tab: <50ms
   - Close tab: <30ms
   - Switch tab: <20ms
   - Even with 50+ tabs open

3. **Memory Limits**
   - Base browser: <150MB RAM
   - Per tab: <50MB average
   - AI context: <100MB total
   - Hard limit: 500MB for entire app

4. **AI Never Delays Browsing**
   - Page load independent of AI
   - Scroll/click always responsive
   - AI cancellation is instant

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│           React UI (Main Thread)            │
│  - Instant feedback                         │
│  - No AI logic                              │
│  - Event emission only                      │
└──────────────────┬──────────────────────────┘
                   │ Events Only
┌──────────────────▼──────────────────────────┐
│         Event Bus (Non-blocking)            │
│  - Async event queue                        │
│  - Debounced / throttled                    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│      AI Task Scheduler (Single Queue)       │
│  - One task at a time                       │
│  - Hard timeouts (10s max)                  │
│  - Cancelable on tab close                  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Web Worker / Tauri Process          │
│  - AI provider calls                        │
│  - Model inference                          │
│  - Result caching                           │
└─────────────────────────────────────────────┘
```

---

## 🔥 Critical Performance Rules

### RULE 1: AI Never Runs on UI Thread

**Current Implementation:**
- ✅ Detection hooks in `regenCore.hooks.ts` use `useEffect` with cleanup
- ✅ `TaskRunner` executes tasks asynchronously
- ✅ `EventBus` uses async event emission

**Enforcement:**
- No `await` in React render functions
- No AI logic in component bodies
- All AI calls go through `TaskRunner` or `CommandController`

**Code Example (Correct):**
```typescript
// ✅ GOOD: Event emission only
useEffect(() => {
  const handleScroll = () => {
    EventBus.emit('SCROLL', { depth: getScrollDepth() });
  };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

**Code Example (Wrong):**
```typescript
// ❌ BAD: AI logic in render
const summary = await summarizePage(currentUrl); // NEVER DO THIS
```

---

### RULE 2: Event-Driven, Not Polling

**Current Implementation:**
- ✅ `EventBus.ts` provides event-driven architecture
- ✅ Hooks trigger on specific events (scroll, navigate, idle)
- ⚠️ Some hooks may trigger too frequently

**Optimization Needed:**
```typescript
// Current: May fire too often
useEffect(() => {
  const handleActivity = () => {
    EventBus.emit('ACTIVITY', { timestamp: Date.now() });
  };
  window.addEventListener('click', handleActivity);
  window.addEventListener('keypress', handleActivity);
  // ...
}, []);

// Optimized: Debounced
useEffect(() => {
  const handleActivity = debounce(() => {
    EventBus.emit('ACTIVITY', { timestamp: Date.now() });
  }, 1000); // Only emit once per second max
  
  window.addEventListener('click', handleActivity);
  window.addEventListener('keypress', handleActivity);
  return () => {
    handleActivity.cancel();
    window.removeEventListener('click', handleActivity);
    window.removeEventListener('keypress', handleActivity);
  };
}, []);
```

---

### RULE 3: One AI Task at a Time

**Current Implementation:**
- ✅ `TaskRunner.ts` provides task queue
- ⚠️ Multiple detection hooks can trigger simultaneously

**Required Enhancement:**
Add global AI task scheduler (see implementation section below).

---

## 💾 Memory Optimization

### Current Memory Usage (Estimated)

| Component | Memory Usage |
|-----------|--------------|
| Base Electron/Tauri | ~80-100MB |
| React UI | ~30-50MB |
| Per Tab (idle) | ~20-30MB |
| Per Tab (active) | ~50-80MB |
| EventBus | ~5-10MB |
| Regen Core State | ~10-20MB |
| **Total (5 tabs)** | **~300-400MB** |

### Target Memory Usage

| Component | Target |
|-----------|--------|
| Base browser | <100MB |
| React UI | <30MB |
| Per Tab (idle) | <15MB |
| Per Tab (active) | <40MB |
| AI Context (total) | <50MB |
| **Total (5 tabs)** | **<250MB** |

---

## ⚡ Quick Wins (Implementation Ready)

### 1. Add Hard Timeouts to TaskRunner

**File:** `src/lib/tasks/TaskRunner.ts`

Add timeout wrapper to all task executions (10s max).

### 2. Debounce Detection Hooks

**File:** `src/core/regen-core/regenCore.hooks.ts`

Add 1-2s debouncing to all detection hooks to reduce CPU/RAM usage.

### 3. Implement Result Caching

**New File:** `src/lib/cache/AIResultCache.ts`

Session-based caching with automatic eviction (max 50 results, 10min TTL).

### 4. Add "Silence AI" Toggle

**File:** `src/state/settingsStore.ts`

Global toggle to disable AI detection with optional time limit.

---

## 📊 Performance Monitoring

### Metrics to Track

1. **Startup Time** → Target: <1s
2. **Tab Switch Time** → Target: <50ms
3. **Memory Usage** → Alert if >500MB
4. **AI Task Duration** → Alert if >10s
5. **Event Bus Latency** → Target: <10ms

---

## 🧪 Performance Testing

### Required Test Suite

1. **AI Off Baseline** → 20 tabs, <300MB RAM
2. **AI On Normal Use** → No stutter, <100MB increase
3. **AI Stress Test** → Rapid tab switching, instant recovery
4. **Memory Leak Test** → 2 hours runtime, <50MB/hour growth

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Immediate)
- [ ] Hard timeouts in TaskRunner
- [ ] Result caching
- [ ] Silence AI toggle
- [ ] Aggressive debouncing

### Phase 2: Optimization (Next)
- [ ] AI task scheduler
- [ ] Tab sleep/wake
- [ ] Performance monitoring
- [ ] Memory profiling

### Phase 3: Advanced (Future)
- [ ] Web Worker migration
- [ ] Streaming responses
- [ ] Predictive caching
- [ ] GPU acceleration

---

## 📝 Engineering Guidelines

### For Frontend Developers

1. **Never await AI in render** → Use `useEffect`
2. **Optimize re-renders** → Use `React.memo`
3. **Clean up effects** → Always return cleanup functions

### For Backend Developers

1. **Respect timeouts** → 10s max for all AI calls
2. **Stream when possible** → Progressive results
3. **Cache aggressively** → Hash-based caching

---

## 🔍 Common Performance Pitfalls

### ❌ Too Many Event Listeners
Always cleanup event listeners in `useEffect` return.

### ❌ Uncontrolled AI Tasks
Never fire-and-forget AI calls. Use scheduler.

### ❌ Memory Leaks in State
Bound all arrays (max 50 items). Evict old data.

---

**Last Updated:** 2026-01-11  
**Owner:** Regen Core Team  
**Status:** Living Document
