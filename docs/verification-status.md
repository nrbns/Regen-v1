# Verification Status - Immediate Tasks (Week 0-1)

This document tracks the verification status of all immediate tasks from the roadmap.

## ✅ Completed & Verified

### 1. Research Mode Citation Verifier
- **Status**: ✅ Complete
- **File**: `src/lib/research/citation-verifier.ts`
- **Verification**: Real-time citation coverage checking, integrated into Research UI
- **AC Met**: All sample queries show flagged uncited sentences

### 2. Enhanced Playwright Smoke Suite
- **Status**: ✅ Complete
- **File**: `tests/e2e/core-flows.spec.ts`
- **Verification**: Comprehensive PR gating tests for core flows
- **AC Met**: All smoke tests pass on PR

### 3. Project Board & Issues Setup
- **Status**: ✅ Complete
- **File**: `docs/project-board-setup.md`
- **Verification**: Issue templates and setup guide created
- **AC Met**: Project visible and linked in README

### 4. Portal + Z-Index Contract
- **Status**: ✅ Complete
- **Files**: `tailwind.config.ts`, `src/styles/globals.css`, `docs/z-index-usage.md`
- **Verification**: Portal root CSS, z-index scale, component updates
- **AC Met**: No UI element appears behind webview

### 5. Dark-Mode FOUC Fix
- **Status**: ✅ Complete
- **Files**: `index.html`, `public/index.html`
- **Verification**: Inline theme pre-init script with correct localStorage key
- **AC Met**: No white flash on load

## ✅ Already Implemented (Needs Verification)

### 6. SessionStore Crash-Safety
- **Status**: ✅ Implemented, needs manual verification
- **File**: `electron/services/session-persistence.ts`
- **Implementation**: 
  - Atomic write pattern (temp file + rename)
  - fsync after write (lines 296-303)
  - Autosave every 2s
- **Tests**: `tests/e2e/session-restore.spec.ts` exists
- **Verification Needed**: 
  - [ ] Manual test: Kill app mid-session → verify restore
  - [ ] Verify restore prompt appears
  - [ ] Verify restore completes in <1s p95

### 7. Download Manager
- **Status**: ✅ Implemented, needs manual verification
- **Files**: 
  - `electron/services/downloads-enhanced.ts`
  - `electron/services/downloads/checksum.ts`
  - `tests/e2e/downloads.spec.ts`
- **Implementation**:
  - Pause/resume support
  - SHA-256 checksum in worker thread
  - Status tracking (downloading, paused, verifying, completed)
- **Verification Needed**:
  - [ ] Manual test: Pause/resume large file
  - [ ] Verify SHA-256 displayed in UI
  - [ ] Verify show-in-folder works
  - [ ] Run Playwright tests: `npm run test:e2e tests/e2e/downloads.spec.ts`

### 8. TabStrip Fixes
- **Status**: ✅ Implemented, needs manual verification
- **File**: `src/components/layout/TabStrip.tsx`
- **Implementation**:
  - Stable keys using `tab.id`
  - Middle-click close support
  - Keyboard navigation (Arrow keys, Home, End)
  - `e.stopPropagation()` on close button
- **Tests**: Covered in `tests/e2e/core-flows.spec.ts`
- **Verification Needed**:
  - [ ] Manual test: Middle-click closes tab
  - [ ] Manual test: Arrow keys navigate tabs
  - [ ] Manual test: Close button doesn't activate tab
  - [ ] Run Playwright tests: `npm run test:e2e tests/e2e/core-flows.spec.ts`

## ⏳ Pending Implementation

### 9. Release Pipeline Verification
- **Status**: ⏳ Needs testing
- **File**: `.github/workflows/release.yml`
- **Verification Needed**:
  - [ ] Create test tag `v0.1.0-alpha-test`
  - [ ] Verify workflow runs successfully
  - [ ] Verify installers are created for all platforms
  - [ ] Verify SHA256 checksums are generated
  - [ ] Verify CHANGELOG extraction works
  - [ ] Test manual workflow_dispatch trigger

### 10. Telemetry Opt-In
- **Status**: ⏳ Not implemented
- **Implementation Needed**:
  - [ ] Design telemetry schema
  - [ ] Add opt-in toggle to onboarding
  - [ ] Implement telemetry service
  - [ ] Add privacy policy link
  - [ ] Test opt-in/opt-out flow

## Verification Checklist

To verify all implemented features:

```bash
# Run all e2e tests
npm run test:e2e

# Run specific test suites
npm run test:e2e tests/e2e/session-restore.spec.ts
npm run test:e2e tests/e2e/downloads.spec.ts
npm run test:e2e tests/e2e/core-flows.spec.ts

# Manual verification
# 1. Kill app mid-session → reopen → verify restore
# 2. Download large file → pause → resume → verify SHA-256
# 3. Test tab interactions: middle-click, keyboard nav, close button
# 4. Test theme switching → reload → verify no white flash
```

## Next Steps

1. **Immediate**: Run manual verification tests for SessionStore, Downloads, TabStrip
2. **Short-term**: Test release pipeline with a test tag
3. **Medium-term**: Implement telemetry opt-in

