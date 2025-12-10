# Lag Fixes Implementation - Dec 10, 2025

## Overview

This document tracks the implementation of 8 critical lag fixes identified from deep testing on Indian networks.

## Status: In Progress

### Fix #1: Yjs/WS Desync (35min) ✅

**Status**: Implemented

- ✅ Added awareness cursors component (`AwarenessCursors.tsx`)
- ✅ Enhanced desync handling on network toggle
- ✅ Added online/offline event listeners for better recovery
- ✅ Force resync on reconnect

**Files Changed**:

- `src/components/collaboration/AwarenessCursors.tsx` (new)
- `src/services/sync/tabSyncService.ts`

### Fix #2: Agentic Actions - Parallel Execution (50min) ✅

**Status**: Implemented

- ✅ Added `executeParallel()` method for multi-action chaining
- ✅ Added `executeWithScrape()` for DOM scrape tie-in
- ✅ Parallel reason + summarize + scrape execution
- ✅ IPC and postMessage fallback for scraping

**Files Changed**:

- `src/core/agents/multiAgentSystem.ts`

### Fix #3: UI Responsiveness - Suspense Loaders (25min) 🔄

**Status**: Partially Implemented

- ✅ Suspense already used in many places
- ⏳ Need to add better fallbacks for mode switches
- ⏳ Add loaders in Research mode

**Files to Update**:

- `src/components/layout/AppShell.tsx` (mode switch Suspense)
- `src/modes/research/index.tsx` (add LoadingSkeleton)

### Fix #4: Tab Stability (40min) ✅

**Status**: Already Implemented

- ✅ Zustand persist middleware already in place
- ⏳ Need to verify drag-reorder functionality

**Files to Check**:

- `src/state/tabsStore.ts` (already has persist)
- `src/components/layout/TabStrip.tsx` (drag-reorder)

### Fix #5: Voice Integration (30min) 🔄

**Status**: Partially Implemented

- ✅ Whisper language support added (previous fix)
- ⏳ Need Hindi detect 65% → 85% improvement
- ⏳ Add debounce to handoff queue

**Files to Update**:

- `src/components/VoiceButton.tsx` (debounce)
- `src/services/languageDetection.ts` (improve Hindi detection)

### Fix #6: Offline-Realtime Handoff (20min) ✅

**Status**: Implemented

- ✅ Queue cap reduced from 200 to 150
- ✅ Keep last 75 items (reduced from 100)

**Files Changed**:

- `src/services/sync/tabSyncService.ts`

### Fix #7: Scale Guards (25min) 🔄

**Status**: Partially Implemented

- ✅ GVE prune already implemented (previous fix)
- ⏳ Need to add opt-in Sentry

**Files to Update**:

- Add Sentry integration (opt-in)

### Fix #8: Desi Depth (45min) 🔄

**Status**: Pending

- ⏳ Add UPI mocks
- ⏳ Add Hindi defaults in modes

**Files to Create/Update**:

- `src/modes/trade/upi-mock.ts` (new)
- `src/config/modeDefaults.ts` (new)

## Next Steps

1. Complete Fix #3: Add Suspense loaders for mode switches
2. Complete Fix #5: Improve Hindi detection + debounce
3. Complete Fix #7: Add opt-in Sentry
4. Complete Fix #8: Add UPI mocks + Hindi defaults

## Testing Checklist

- [ ] Test Yjs desync recovery on network toggle
- [ ] Test parallel agent execution (reason + summarize + scrape)
- [ ] Test mode switch with Suspense loaders
- [ ] Test tab persistence on reload
- [ ] Test Hindi voice detection (target 85%)
- [ ] Test offline queue cap (150 items)
- [ ] Test GVE prune at 400 tabs
- [ ] Test UPI mock flow
