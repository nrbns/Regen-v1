# Realtime, GVE Lag, and Performance Fixes

**Date:** December 1, 2025  
**Status:** 🚀 Implementation Plan

---

## 📊 Project Status Summary

Based on your comprehensive review:

- **Overall Completion:** ~75-80% (Core is solid, Tier 2/3 needs polish)
- **Core Browser:** ✅ 100% - Production ready
- **AI Engine:** ✅ 100% - Unified offline/cloud with streaming
- **WISPR Voice:** ✅ 100% - Hotkey support, Hindi/English
- **Trade/Research Modes:** ✅ 95% - Signals, PDF summaries, AI recs
- **Performance:** ⚠️ 70% - Memory cap works, needs aggressive optimization
- **UI Polish:** ⚠️ 50% - Settings UI needs completion

---

## 🎯 Priority Fixes (Based on Your Feedback)

### ✅ Phase 1: Aggressive Tab Hibernation (IN PROGRESS)

**Problem:** Tabs use too much memory, causing lag on low-end devices

**Solution:**

- ✅ **Blur-based suspension** - Suspend inactive tabs 5s after window blur
- ⏳ **Reduced thresholds** - Reduce suspend time from 2min to 1.5min
- ⏳ **Immediate unloading** - Unload iframe src on suspend to free memory instantly

**Files Updated:**

- `src/services/tabSuspension.ts` - Added `setupBlurSuspension()` function

**Next Steps:**

1. Wire blur suspension into `AppShell.tsx`
2. Reduce suspend threshold to 1.5min
3. Unload iframe src immediately on suspend

---

### ⏳ Phase 2: Vector Caching for GVE (Game Vector Engine)

**Problem:** Vector embeddings generated on-demand cause lag in Game Mode

**Solution:**

- **IndexedDB caching** - Cache game embeddings with TTL
- **Web Workers** - Move vector similarity calculations off main thread
- **Pre-warming** - Pre-cache popular game embeddings

**Files to Create:**

- `src/services/vector/vectorCache.ts` - IndexedDB cache for embeddings
- `src/workers/vectorWorker.ts` - Web Worker for vector ops

**Files to Update:**

- `src/modes/games/GameHub.tsx` - Use cached vectors
- `src/services/vector/faissService.ts` - Add caching layer

---

### ⏳ Phase 3: Realtime WebSocket/SSE Upgrade

**Problem:** Some features still use polling instead of realtime streaming

**Current State:**

- ✅ **Market Data** - Already using SSE (good!)
- ✅ **Agent Streaming** - Already using WebSocket (good!)
- ⚠️ **Request Caching** - Missing TTL-based caching

**Solution:**

- **Request Cache** - Add IndexedDB/Redis caching with 10-30s TTL
- **Offline Cache** - Cache responses for offline use
- **Smart Invalidation** - Clear cache on data updates

**Files to Create:**

- `src/services/requestCache.ts` - TTL-based request cache

---

### ⏳ Phase 4: Memory Optimizations

**Problem:** Vision mode always enabled, no auto-disable for low RAM

**Solution:**

- **Auto-disable vision** - Disable under 2GB RAM
- **Text-only fallback** - Use text-only mode when memory is low
- **More aggressive unloading** - Unload more tabs when memory is critical

**Files to Update:**

- `src/core/monitoring/memoryMonitor.ts` - Add vision mode check
- `src/core/ai/engine.ts` - Add memory-aware mode selection

---

## 📋 Implementation Checklist

### Phase 1: Tab Hibernation ✅

- [x] Add blur-based suspension function
- [ ] Wire into AppShell
- [ ] Reduce suspend threshold to 1.5min
- [ ] Unload iframe src on suspend

### Phase 2: Vector Caching ⏳

- [ ] Create IndexedDB cache for vectors
- [ ] Add Web Worker for vector ops
- [ ] Integrate into Game Hub
- [ ] Add pre-warming for popular games

### Phase 3: Request Caching ⏳

- [ ] Create request cache service
- [ ] Add TTL support
- [ ] Integrate with agent streaming
- [ ] Add offline cache support

### Phase 4: Memory Optimizations ⏳

- [ ] Add vision mode auto-disable
- [ ] Add text-only fallback
- [ ] More aggressive tab unloading
- [ ] Update memory thresholds

---

## 🚀 Quick Wins (48-72 hours)

1. **Tab Hibernation** - Biggest impact, easiest to implement ✅
2. **Request Caching** - Simple TTL cache, high impact
3. **Vision Mode Toggle** - Memory-aware mode selection
4. **Vector Cache** - IndexedDB storage for game embeddings

---

## 📝 Next Steps

1. **Complete Phase 1** - Wire blur suspension, reduce thresholds
2. **Start Phase 2** - Create vector cache infrastructure
3. **Add Request Cache** - Simple TTL-based caching
4. **Memory Optimizations** - Vision mode auto-disable

---

**Starting with Phase 1 completion now!** 🚀
