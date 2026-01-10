# Legacy Components Documentation

**Purpose:** Document components that bypass CommandController but are not blocking v1 launch.

**Status:** These are identified for future cleanup, not immediate fixes.

---

## Components That Bypass CommandController

### 1. `useOrchestrator` Hook
**File:** `src/hooks/useOrchestrator.ts`

**What it does:**
- Provides orchestrator workflow (classify → plan → approve → execute)
- Has `executeDirect()` method that calls `/orchestrator/execute` directly
- Uses WebSocket for real-time plan updates
- Different from CommandController's intent-first approach

**Why it exists:**
- Supports plan-based execution workflows (v2 feature)
- Orchestrator is a separate system for complex, multi-step tasks
- Intended for tasks that require approval/planning

**Should it route through CommandController?**
- **Maybe** - But orchestrator is a different workflow pattern
- CommandController is for immediate intent execution
- Orchestrator is for planned, approved execution
- Could be v2 feature to integrate, but not blocking v1

**Recommendation:** Keep separate for now, evaluate integration in v2

---

### 2. `executeWisprCommand` Function
**File:** `src/core/wispr/commandHandler.ts`

**What it does:**
- Executes WISPR (Web Intent System for Prompt Routing) commands
- Specialized command system for mode-specific commands
- Routes through IPC in Tauri mode, fallback to frontend execution

**Why it exists:**
- WISPR is a specialized command system
- Handles mode-specific commands (trade, browse, etc.)
- Different syntax and execution model

**Should it route through CommandController?**
- **Ideally yes** - But WISPR has different intent resolution
- WISPR commands are parsed differently (mode-aware)
- Could integrate WISPR intents into CommandController.resolveIntent()

**Recommendation:** Low priority - WISPR is specialized, works correctly

---

### 3. `AgentConsole` Component
**File:** `src/routes/AgentConsole.tsx`

**What it does:**
- Agent console UI for managing agent runs
- Uses `multiAgentSystem.execute()` directly
- Handles agent DSL (Domain-Specific Language) execution

**Why it exists:**
- Advanced feature for agent-based automation
- Part of v2 agent system
- Uses different execution model (DSL-based)

**Should it route through CommandController?**
- **Maybe** - But agent DSL is different from user commands
- Agent console is for advanced users
- Could be v2 feature to integrate

**Recommendation:** Keep as-is for now, agent features are v2

---

### 4. `TaskPanel` Component
**File:** `src/components/task/TaskPanel.tsx`

**What it does:**
- UI for managing tasks
- Has some direct `TaskService.processUserInput()` calls
- TaskService is already marked as deprecated

**Why it exists:**
- Legacy task management UI
- TaskService is deprecated but still used in some places

**Should it route through CommandController?**
- **Yes** - But low priority since TaskService is deprecated
- Main task execution goes through CommandController
- TaskPanel is for task management, not execution

**Recommendation:** Update to use CommandController in v1.1

---

### 5. Direct API Calls (Read Operations)
**Files:**
- `src/components/search/ArticleView.tsx` - `/api/article`
- `src/components/search/TrendingResults.tsx` - `/api/trending`
- `src/components/status/GlobalStatusBar.tsx` - Ollama health check
- `src/components/export/ExportButton.tsx` - `/api/export`

**What they do:**
- Fetch data from backend APIs
- Read operations, not command execution
- Status checks and data retrieval

**Should they route through CommandController?**
- **No** - These are read operations, not commands
- CommandController is for user command execution
- Data fetching is a different concern
- These are fine as-is

**Recommendation:** No change needed - read operations are separate from commands

---

## Summary

### High Priority (Blocking) ✅ FIXED
- CommandBar, BottomStatus, ResearchPanel - ✅ All route through CommandController
- Navigation lifecycle - ✅ Backend-owned
- Task execution - ✅ Routes through CommandController

### Medium Priority (Future)
- Orchestrator workflow - Different execution model, evaluate v2 integration
- WISPR commands - Specialized system, consider intent integration
- Agent Console - Advanced v2 feature, keep separate for now

### Low Priority (Non-Blocking)
- TaskPanel - Some direct TaskService calls (deprecated but works)
- Direct API reads - Fine as-is (read operations, not commands)

---

## Integration Strategy for v2

### Option 1: Unified Intent Resolution
- Extend `CommandController.resolveIntent()` to recognize WISPR and orchestrator intents
- Single entry point for all command types
- Different execution paths based on intent type

### Option 2: Intent Router Pattern
- Create `IntentRouter` that delegates to appropriate handler
- CommandController for immediate intents
- Orchestrator for planned intents
- WISPR for mode-specific intents
- All route through single entry point

### Option 3: Keep Separate (Current)
- Maintain specialized execution paths
- CommandController for main user commands
- Orchestrator/WISPR for advanced workflows
- Clear documentation of when to use each

**Recommendation:** Option 2 (Intent Router Pattern) for v2

---

## Migration Checklist (Future)

- [ ] Integrate WISPR intents into CommandController.resolveIntent()
- [ ] Create IntentRouter abstraction layer
- [ ] Route orchestrator workflow through IntentRouter
- [ ] Update AgentConsole to use CommandController
- [ ] Remove TaskService direct calls from TaskPanel
- [ ] Document when to use which execution path
- [ ] Add migration guide for developers

---

**Last Updated:** 2025-01-XX  
**Status:** Documented for future cleanup, not blocking v1 launch
