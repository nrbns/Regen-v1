# Improvements to Achieve 5/5 in All Audit Sections

**Goal:** Bring all audit sections from current scores to 5/5
**Current Average:** 3.8/5
**Target Average:** 5.0/5

---

## 1️⃣ EXECUTION SPINE (4.0/5 → 5.0/5) ⚠️ NEEDS +1.0

### Current Issues:
1. **No formal IntentRouter class** - Intent resolution is in CommandController
2. **Multiple intent parsers exist** - Not consolidated
3. **Planner threshold not explicit** - No clear "simple vs complex" threshold

### Improvements Needed:
- ✅ **Created:** `IntentRouter.ts` - Formal intent router class
- [ ] **Update CommandController** to use IntentRouter instead of resolveIntent()
- [ ] **Add explicit planner threshold logic** - Only RESEARCH and multi-step queries use planner
- [ ] **Consolidate all intent parsers** - Remove duplicate parsers from other files
- [ ] **Document intent types explicitly** - Clear intent taxonomy

### Implementation:
```typescript
// CommandController should use:
const resolvedIntent = intentRouter.resolve(input, context);
const needsPlanning = intentRouter.requiresPlanning(resolvedIntent);

// Explicit threshold:
if (needsPlanning) {
  // Route to planner (only for RESEARCH and multi-step)
} else {
  // Direct execution (simple intents)
}
```

**Status:** ✅ IntentRouter created, ⚠️ Need to update CommandController

---

## 2️⃣ UI TRUST BOUNDARY (3.5/5 → 5.0/5) ⚠️ NEEDS +1.5

### Current Issues:
1. **Direct backendService calls** - Some components call backendService directly
2. **Custom status states** - Components use 'loading', 'thinking', etc. instead of SystemStatus
3. **UI maintains own loading state** - Should use backend status only

### Improvements Needed:
- [ ] **Remove all direct backendService calls** - Route through CommandController
- [ ] **Standardize all status to SystemStatus** - Only 'idle', 'working', 'recovering'
- [ ] **Remove custom status states** - Use useCommandController hook everywhere
- [ ] **UI subscribes to backend state only** - No local state for execution

### Files to Fix:
- `src/components/search/ArticleView.tsx` - Direct fetch call
- `src/components/search/TrendingResults.tsx` - Direct fetch call
- `src/components/status/GlobalStatusBar.tsx` - Direct fetch call
- `src/components/export/ExportButton.tsx` - Direct fetch call
- Components using `isLoading`, `loading`, `thinking` states

**Status:** ⚠️ Need to route remaining components through CommandController

---

## 3️⃣ BROWSER CORE (3.5/5 → 5.0/5) ⚠️ NEEDS +1.5

### Current Issues:
1. **WebView lifecycle incomplete** - Tab closing doesn't always destroy WebView
2. **Session restore limited** - Only URLs restored, not content/scroll position
3. **Navigation partially backend-owned** - Some direct updates still exist

### Improvements Needed:
- [ ] **Ensure WebView destroyed on tab close** - Add lifecycle hooks
- [ ] **Add scroll position restoration** - Save/restore scroll state
- [ ] **Full session restore** - Restore page content where possible
- [ ] **Test memory cleanup** - Ensure no leaks on tab eviction
- [ ] **Remove all direct tab updates** - Only backend can update tabs

### Implementation:
```typescript
// Tab closing should:
1. Backend destroys WebView via IPC
2. Backend confirms destruction
3. UI removes tab from state
```

**Status:** ⚠️ Need WebView lifecycle management and session restore enhancement

---

## 4️⃣ AI & RAG (4.0/5 → 5.0/5) ⚠️ NEEDS +1.0

### Current Issues:
1. **Not all AI triggers audited** - Some might run automatically
2. **CoT might leak** - Internal reasoning might be exposed
3. **Step summaries could be clearer** - Replace CoT with clear summaries

### Improvements Needed:
- [ ] **Audit ALL AI triggers** - Ensure no automatic AI execution
- [ ] **Ensure CoT never shown** - Hide all internal reasoning
- [ ] **Add clear step summaries** - Replace "thinking" with clear steps
- [ ] **Add confidence indicators** - Show confidence, not reasoning
- [ ] **Verify RAG only for RESEARCH** - No other contexts use RAG

### Audit Checklist:
- [ ] zeroPromptPrediction.ts - Check for preemptive triggers
- [ ] AgentOrchestrator - Ensure no auto-retrieval
- [ ] All AI components - Check for automatic execution
- [ ] RAG usage - Only in RESEARCH intent handler

**Status:** ⚠️ Need comprehensive AI trigger audit

---

## 5️⃣ WORKSPACE (3.0/5 → 5.0/5) ⚠️ NEEDS +2.0

### Current Issues:
1. **localStorage only** - No file-based persistence for Tauri mode
2. **No export/import** - Can't backup or transfer workspace
3. **Workspace might not survive updates** - localStorage can be cleared

### Improvements Needed:
- [ ] **Add file-based persistence for Tauri** - Use OS file system
- [ ] **Add export/import functionality** - JSON/MD export
- [ ] **Ensure workspace survives updates** - Use persistent storage location
- [ ] **Add workspace versioning** - Track workspace format version
- [ ] **Add workspace UI improvements** - Better display and management

### Implementation:
```typescript
// Tauri mode:
const workspacePath = await appDataDir() + '/workspace/';
// Save to file system

// Web mode:
// Keep localStorage but add export/import
```

**Status:** ⚠️ Need file-based persistence and export/import

---

## 6️⃣ TASK RUNNER (4.5/5 → 5.0/5) ⚠️ NEEDS +0.5

### Current Issues:
1. **No strict schema validation** - Free-text task names accepted
2. **No runtime validation** - Tasks validated only at registration

### Improvements Needed:
- [ ] **Add Zod schema validation** - Strict task schema
- [ ] **Validate task parameters** - Check params before execution
- [ ] **Reject ambiguous tasks** - Clear error for invalid tasks
- [ ] **Document allowed task types** - Explicit task taxonomy

### Implementation:
```typescript
const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  params: z.record(z.any()).optional(),
});

// Validate before execution
const validated = TaskSchema.parse(taskData);
```

**Status:** ⚠️ Need schema validation

---

## 7️⃣ SECURITY (4.5/5 → 5.0/5) ⚠️ NEEDS +0.5

### Current Issues:
1. **Audit log in-memory only** - Not persisted to file
2. **No UI for viewing audit log** - Can't see audit history

### Improvements Needed:
- [ ] **Add persistent audit log file** - Save to disk
- [ ] **Add UI for viewing audit log** - Audit log viewer component
- [ ] **Add audit log filtering** - Filter by tool, date, decision
- [ ] **Add audit log export** - Export audit trail

### Implementation:
```typescript
// Save audit log to file (Tauri)
const auditPath = await appDataDir() + '/audit.log';

// Or localStorage (web) with size limits
localStorage.setItem('regen:audit', JSON.stringify(auditLog));
```

**Status:** ⚠️ Need persistent storage and UI

---

## 8️⃣ DOCS & CLAIMS (4.5/5 → 5.0/5) ⚠️ NEEDS +0.5

### Current Issues:
1. **Some features might not be fully documented** - Need completeness check
2. **API documentation** - Could add more detailed API docs

### Improvements Needed:
- [ ] **Complete feature documentation** - All features documented
- [ ] **Add API documentation** - CommandController, IntentRouter APIs
- [ ] **Add architecture diagrams** - Visual architecture docs
- [ ] **Add developer guide** - How to extend the system

### Implementation:
- Add JSDoc comments to all public APIs
- Create API.md with full API reference
- Add ARCHITECTURE.md with diagrams
- Add DEVELOPER_GUIDE.md

**Status:** ⚠️ Need comprehensive documentation

---

## 9️⃣ PERFORMANCE (4.0/5 → 5.0/5) ⚠️ NEEDS +1.0

### Current Issues:
1. **No explicit "AI offline" indicator** - User might not know AI is unavailable
2. **Some errors might be swallowed** - Need to ensure all errors surface
3. **Browser works without AI** - But could be more explicit

### Improvements Needed:
- [ ] **Add "AI offline" indicator** - Clear status when AI unavailable
- [ ] **Ensure all errors surface** - No swallowed exceptions
- [ ] **Add explicit fallback messages** - Clear when AI features unavailable
- [ ] **Test with backend disabled** - Verify graceful degradation

### Implementation:
```typescript
// Backend health check
const backendAvailable = await isBackendAvailable();

// Show indicator
if (!backendAvailable) {
  statusBar.show('AI Offline - Core browser features available');
}
```

**Status:** ⚠️ Need offline indicators and error handling

---

## 🎯 Implementation Priority

### High Priority (Blocks 5/5):
1. ✅ **Execution Spine** - IntentRouter created, need integration
2. **UI Trust Boundary** - Route all components through CommandController
3. **Browser Core** - WebView lifecycle and session restore
4. **AI & RAG** - Complete AI trigger audit

### Medium Priority (Nice to Have):
5. **Workspace** - File persistence and export
6. **Task Runner** - Schema validation
7. **Security** - Audit log persistence and UI
8. **Performance** - Offline indicators

### Low Priority (Documentation):
9. **Docs & Claims** - Complete documentation

---

## 📊 Score Projections

| Section | Current | Target | Gap | Priority |
|---------|---------|--------|-----|----------|
| Execution Spine | 4.0/5 | 5.0/5 | +1.0 | HIGH |
| UI Trust Boundary | 3.5/5 | 5.0/5 | +1.5 | HIGH |
| Browser Core | 3.5/5 | 5.0/5 | +1.5 | HIGH |
| AI & RAG | 4.0/5 | 5.0/5 | +1.0 | HIGH |
| Workspace | 3.0/5 | 5.0/5 | +2.0 | MEDIUM |
| Task Runner | 4.5/5 | 5.0/5 | +0.5 | MEDIUM |
| Security | 4.5/5 | 5.0/5 | +0.5 | MEDIUM |
| Docs & Claims | 4.5/5 | 5.0/5 | +0.5 | LOW |
| Performance | 4.0/5 | 5.0/5 | +1.0 | MEDIUM |

**Total Gap:** +9.5 points needed

---

## ✅ Quick Wins (Can Do Now)

1. **Update CommandController to use IntentRouter** - 30 min
2. **Add explicit planner threshold** - 15 min
3. **Route remaining fetch calls through CommandController** - 1 hour
4. **Standardize status states** - 30 min
5. **Add AI offline indicator** - 30 min
6. **Add Zod schema to TaskRunner** - 30 min
7. **Add persistent audit log** - 1 hour
8. **Add audit log UI component** - 1 hour

**Total Quick Wins Time:** ~5 hours

---

## 🚀 Full Implementation Plan

### Phase 1: Critical (Blocks 5/5) - 4 hours
- [x] Create IntentRouter class
- [ ] Integrate IntentRouter into CommandController
- [ ] Route all remaining components through CommandController
- [ ] Standardize all status states
- [ ] Add explicit planner threshold
- [ ] Complete AI trigger audit

### Phase 2: Important (Gets to 4.5+) - 3 hours
- [ ] WebView lifecycle management
- [ ] Session restore enhancement
- [ ] Workspace file persistence
- [ ] Task Runner schema validation
- [ ] AI offline indicator

### Phase 3: Polish (Gets to 5/5) - 2 hours
- [ ] Audit log persistence
- [ ] Audit log UI
- [ ] Complete documentation
- [ ] Error handling improvements

**Total Implementation Time:** ~9 hours

---

**Last Updated:** 2025-01-XX  
**Status:** Ready for implementation
