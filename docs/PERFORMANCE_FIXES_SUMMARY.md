# Performance Optimization Fixes - Implementation Summary

**Date:** December 1, 2025  
**Status:** 🚀 In Progress

---

## ✅ What's Already Good

1. **SSE for Market Data** - Already using Server-Sent Events for realtime market updates
2. **Tab Suspension Service** - Framework exists with IndexedDB snapshots
3. **Memory Monitoring** - Auto-unload tabs at 3GB RAM cap
4. **Vector Service** - FAISS service exists (needs caching)

---

## 🎯 Priority Fixes to Implement

### Phase 1: Aggressive Tab Hibernation (HIGH IMPACT)

**Current:**

- 30s idle threshold
- 2min suspend threshold
- No blur-based suspension

**Fix:**

- ✅ Add blur-based suspension (5s after window blur)
- Reduce suspend threshold to 1.5min for inactive tabs
- Unload iframe src on suspend to free memory immediately

**Files to Update:**

- `src/services/tabSuspension.ts` - Add blur handler
- `src/components/layout/TabIframeManager.tsx` - Handle suspension

---

### Phase 2: Vector Caching for GVE (MEDIUM IMPACT)

**Current:**

- Vectors generated on-demand (slow)
- No caching for Game Mode embeddings

**Fix:**

- Cache embeddings in IndexedDB with TTL
- Use Web Workers for vector similarity calculations
- Pre-warm cache for frequently searched games

**Files to Create/Update:**

- `src/services/vector/vectorCache.ts` - IndexedDB cache
- `src/workers/vectorWorker.ts` - Web Worker for vector ops
- `src/modes/games/GameHub.tsx` - Use cached vectors

---

### Phase 3: Realtime WebSocket Upgrade (MEDIUM IMPACT)

**Current:**

- SSE for market data (good)
- Polling for other updates (needs upgrade)

**Fix:**

- Upgrade agent streaming to WebSocket (already partially done)
- Add request caching with TTL (10-30s)
- Use IndexedDB for offline cache

**Files to Update:**

- `src/utils/guardedAgentRunner.ts` - Already uses WebSocket
- `src/services/requestCache.ts` - NEW - Add caching layer

---

### Phase 4: Memory Optimizations (HIGH IMPACT)

**Current:**

- 3GB RAM cap
- Vision mode always enabled

**Fix:**

- Auto-disable vision mode under 2GB RAM
- Text-only fallback for low memory
- More aggressive tab unloading

**Files to Update:**

- `src/core/monitoring/memoryMonitor.ts` - Add vision mode check
- `src/core/ai/engine.ts` - Add memory-aware mode selection

---

## 📋 Implementation Checklist

- [ ] Phase 1: Aggressive Tab Hibernation
- [ ] Phase 2: Vector Caching for GVE
- [ ] Phase 3: Request Caching
- [ ] Phase 4: Memory Optimizations

---

**Starting with Phase 1 - Aggressive Tab Hibernation**
