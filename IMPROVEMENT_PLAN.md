# Comprehensive Improvement Plan to Achieve 5/5 in All Sections

**Current Average:** 3.8/5  
**Target Average:** 5.0/5  
**Total Gap:** +9.5 points needed

---

## Implementation Priority (Order of Execution)

### Phase 1: Execution Spine (4.0/5 → 5.0/5) - CRITICAL
**Gap: +1.0 point**

**Status:** ✅ IntentRouter created, ⚠️ Need integration fixes

**Remaining Work:**
1. ✅ Create formal IntentRouter class - DONE
2. ⚠️ Update CommandController to fully use IntentRouter - IN PROGRESS
3. ⚠️ Consolidate duplicate intent parsers - PENDING
   - Deprecate `src/services/agent/intentParser.ts` (or make it use IntentRouter)
   - Keep specialized parsers (booking, voice) but document them
4. ⚠️ Add explicit planner threshold documentation - PENDING
5. ⚠️ Ensure intent ALWAYS resolved before AI execution - VERIFY

**Estimated Time:** 1 hour

---

### Phase 2: UI Trust Boundary (3.5/5 → 5.0/5) - CRITICAL
**Gap: +1.5 points**

**Status:** ⚠️ Partially implemented, need standardization

**Remaining Work:**
1. ⚠️ Route all remaining fetch calls through CommandController
   - `ArticleView.tsx` - `/api/article` (read operation, may be OK)
   - `TrendingResults.tsx` - `/api/trending` (read operation, may be OK)
   - `ExportButton.tsx` - `/api/export` (should route through CommandController)
   - `GlobalStatusBar.tsx` - Ollama health check (status check, may be OK)
2. ⚠️ Standardize all status states to SystemStatus only
   - Replace `isLoading`, `loading`, `thinking` with `SystemStatus`
   - Remove custom status states from components
3. ⚠️ Ensure UI subscribes to backend state only
   - Remove local loading states
   - Use `useCommandController` hook everywhere

**Note:** Read operations (article, trending) are acceptable as they're not commands.
Export operation should route through CommandController.

**Estimated Time:** 2 hours

---

### Phase 3: Browser Core (3.5/5 → 5.0/5) - HIGH PRIORITY
**Gap: +1.5 points**

**Status:** ⚠️ Needs WebView lifecycle and session restore

**Remaining Work:**
1. ⚠️ Ensure WebView destroyed on tab close
   - Add lifecycle hooks in Tauri backend
   - Test memory cleanup
2. ⚠️ Add scroll position restoration
   - Save scroll position to tab state
   - Restore on tab switch/reload
3. ⚠️ Full session restore
   - Restore page content where possible (snapshots)
   - Restore form data (if possible)
   - Improve restore beyond just URLs
4. ⚠️ Remove remaining direct tab updates
   - Audit all tab update locations
   - Ensure all updates go through backend confirmation

**Estimated Time:** 3 hours

---

### Phase 4: AI & RAG (4.0/5 → 5.0/5) - HIGH PRIORITY
**Gap: +1.0 point**

**Status:** ⚠️ Need comprehensive audit

**Remaining Work:**
1. ⚠️ Complete AI trigger audit
   - Check `zeroPromptPrediction.ts` - no preemptive triggers
   - Verify AgentOrchestrator - no auto-retrieval
   - Audit all AI components - no automatic execution
2. ⚠️ Ensure CoT never shown to user
   - Replace "thinking" states with step summaries
   - Hide internal reasoning
   - Add confidence indicators instead
3. ⚠️ Verify RAG only for RESEARCH intent
   - Check all RAG usage locations
   - Ensure no RAG in other contexts
   - Add explicit RAG boundaries

**Estimated Time:** 2 hours

---

### Phase 5: Workspace (3.0/5 → 5.0/5) - MEDIUM PRIORITY
**Gap: +2.0 points**

**Status:** ⚠️ Needs file persistence and export

**Remaining Work:**
1. ⚠️ Add file-based persistence for Tauri mode
   - Use OS file system instead of localStorage
   - Ensure workspace survives app updates
2. ⚠️ Add export/import functionality
   - JSON export
   - Markdown export
   - Import from file
3. ⚠️ Add workspace versioning
   - Track workspace format version
   - Migration path for future versions
4. ⚠️ Improve workspace UI
   - Better display of saved items
   - Search/filter functionality
   - Organization features

**Estimated Time:** 3 hours

---

### Phase 6: Task Runner (4.5/5 → 5.0/5) - MEDIUM PRIORITY
**Gap: +0.5 points**

**Status:** ⚠️ Needs schema validation

**Remaining Work:**
1. ⚠️ Add Zod schema validation
   - Strict task schema
   - Parameter validation
   - Reject ambiguous tasks
2. ⚠️ Document allowed task types
   - Explicit task taxonomy
   - Task registry
   - Task documentation

**Estimated Time:** 1 hour

---

### Phase 7: Security (4.5/5 → 5.0/5) - MEDIUM PRIORITY
**Gap: +0.5 points**

**Status:** ⚠️ Needs persistent storage and UI

**Remaining Work:**
1. ⚠️ Add persistent audit log file
   - Save to disk (Tauri) or localStorage (web)
   - Rotate logs (keep last N entries)
2. ⚠️ Add UI for viewing audit log
   - Audit log viewer component
   - Filter by tool, date, decision
   - Export audit trail
3. ⚠️ Include "why" reasoning in audit entries
   - Store reasoning for each decision
   - Show reasoning in UI

**Estimated Time:** 2 hours

---

### Phase 8: Docs & Claims (4.5/5 → 5.0/5) - LOW PRIORITY
**Gap: +0.5 points**

**Status:** ✅ README rewritten, need completeness

**Remaining Work:**
1. ⚠️ Complete feature documentation
   - All features documented
   - API documentation (JSDoc)
   - Architecture diagrams
2. ⚠️ Add developer guide
   - How to extend the system
   - How to add new intents
   - How to add new tasks
3. ⚠️ Add troubleshooting guide
   - Common issues
   - Debugging tips
   - Performance tuning

**Estimated Time:** 2 hours

---

### Phase 9: Performance (4.0/5 → 5.0/5) - MEDIUM PRIORITY
**Gap: +1.0 point**

**Status:** ⚠️ Needs offline indicators and error handling

**Remaining Work:**
1. ⚠️ Add explicit "AI offline" indicator
   - Status bar indicator
   - Clear messaging when AI unavailable
   - Fallback feature list
2. ⚠️ Ensure all errors surface
   - No swallowed exceptions
   - Clear error messages
   - Actionable error recovery
3. ⚠️ Test with backend disabled
   - Verify graceful degradation
   - Core browser features work
   - Clear offline messaging

**Estimated Time:** 1 hour

---

## Quick Wins (Can Implement Now)

1. **Standardize status states** - 30 min
2. **Add AI offline indicator** - 30 min  
3. **Add Zod schema to TaskRunner** - 30 min
4. **Add persistent audit log** - 1 hour
5. **Complete intent parser consolidation** - 1 hour

**Quick Wins Total:** ~3.5 hours

---

## Estimated Total Time

**Critical (Phases 1-4):** ~8 hours  
**Important (Phases 5-7):** ~6 hours  
**Polish (Phases 8-9):** ~3 hours

**Total:** ~17 hours

---

## Implementation Strategy

### Option A: Full Implementation (17 hours)
- Implement all improvements systematically
- Achieve true 5/5 in all sections
- Comprehensive, production-ready

### Option B: Critical Path (8 hours)
- Focus on Phases 1-4 only
- Gets us to 4.5+/5 average
- Launch-ready with critical systems solid

### Option C: Quick Wins (3.5 hours)
- Implement quick wins only
- Gets us to 4.2+/5 average
- Good enough for launch

---

**Recommendation:** Option B (Critical Path) - Gets us to launch-ready state with solid critical systems.
