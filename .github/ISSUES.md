# GitHub Issues - Ready to Create

Copy these into GitHub Issues for tracking:

## 1. [Core] Remove build & report artifacts (dist-web, playwright-report, test-results)

**Labels**: `repo-hygiene`, `good-first-issue`

**Description**:
Remove build and test artifacts from git tracking to keep the repo clean.

**Acceptance Criteria**:
- [ ] Verify `.gitignore` includes `dist-web/`, `playwright-report/`, `test-results/`
- [ ] Remove these directories from git index: `git rm -r --cached dist-web playwright-report test-results`
- [ ] Commit the change
- [ ] Verify they don't appear in `git status` after build/test runs

**Files**:
- `.gitignore` (already has entries, verify)
- Root directory cleanup

---

## 2. [AI] Verify LLM adapter + search proxy integration

**Labels**: `ai-llm`, `core-runtime`

**Description**:
Verify that the LLM adapter (`src/core/llm/adapter.ts`) and search proxy (`server/search-proxy.ts`) are fully integrated and working end-to-end.

**Acceptance Criteria**:
- [ ] LLM adapter handles all providers (OpenAI, Anthropic, Mistral, Ollama) with fallback
- [ ] Search proxy aggregates DuckDuckGo/Bing results
- [ ] Search proxy generates LLM summaries with citations
- [ ] SearchBar component uses search proxy correctly
- [ ] Error handling for missing API keys
- [ ] Unit tests for LLM adapter
- [ ] E2E test for search flow

**Files**:
- `src/core/llm/adapter.ts`
- `server/search-proxy.ts`
- `src/components/SearchBar.tsx`
- `tests/e2e/search-flow.spec.ts`

---

## 3. [Memory] Verify SuperMemory v1 (store + tracker + sidebar)

**Labels**: `memory`, `core-runtime`

**Description**:
Verify SuperMemory implementation is complete and functional.

**Acceptance Criteria**:
- [ ] Memory store saves/retrieves events correctly
- [ ] Tracker logs user events (search, visit, highlight)
- [ ] Memory sidebar displays saved items
- [ ] Semantic search via vector store works
- [ ] Memory persists across sessions
- [ ] E2E test: Save page → appears in sidebar → searchable

**Files**:
- `src/core/supermemory/store.ts`
- `src/core/supermemory/tracker.ts`
- `src/core/supermemory/vectorStore.ts`
- `src/components/supermemory/MemorySidebar.tsx`
- `tests/e2e/memory-flow.spec.ts`

---

## 4. [Redix] Verify runtime v1 (event log + reducers + policies)

**Labels**: `redix`, `core-runtime`

**Description**:
Verify Redix runtime is complete with event log, reducers, and policies.

**Acceptance Criteria**:
- [ ] Event log appends events correctly
- [ ] Reducers apply state changes deterministically
- [ ] Undo/redo functionality works
- [ ] Policies evaluate correctly based on metrics
- [ ] Time-travel debugging works
- [ ] Events persist to localStorage
- [ ] Integration with UI components verified

**Files**:
- `src/core/redix/runtime.ts`
- `src/core/redix/event-log.ts`
- `src/core/redix/reducers.ts`
- `src/core/redix/policies.ts`
- `src/components/redix/RedixDebugPanel.tsx`

---

## 5. [Agents] Verify Save & Summarise agent (MVP)

**Labels**: `agents`, `core-runtime`

**Description**:
Verify agent primitives and executor work for basic automation.

**Acceptance Criteria**:
- [ ] Agent primitives (read, click, fill) work correctly
- [ ] Executor enforces permissions and consent
- [ ] "Save & Summarise page" agent works end-to-end
- [ ] Audit logging captures all actions
- [ ] Domain sandboxing prevents unauthorized actions
- [ ] E2E test: Run agent → confirm permission → memory saved

**Files**:
- `src/core/agents/primitives.ts`
- `src/core/agents/executor.ts`
- `tests/e2e/agent-flow.spec.ts`

---

## 6. [UI/UX] Make AI omnibar the hero entry point

**Labels**: `ui-ux`, `enhancement`

**Description**:
Ensure the AI omnibar (Omnibox) is the primary entry point for search and AI queries.

**Acceptance Criteria**:
- [ ] `Cmd/Ctrl + K` always focuses the omnibox
- [ ] Omnibox placeholder: "Search web, ask AI, or search your memory..."
- [ ] Omnibox is prominently visible in TopNav
- [ ] Search results show AI summaries with citations
- [ ] Memory search integrated into omnibox suggestions

**Files**:
- `src/components/TopNav/Omnibox.tsx`
- `src/components/layout/TopNav.tsx`
- `src/components/layout/AppShell.tsx`

---

## 7. [UI/UX] Ensure Memory sidebar is visible and accessible

**Labels**: `ui-ux`, `memory`

**Description**:
Make SuperMemory sidebar easily accessible and visible.

**Acceptance Criteria**:
- [ ] Memory sidebar accessible via `Cmd/Ctrl + Shift + M`
- [ ] Sidebar shows "Recent pages you saved"
- [ ] Search bar in sidebar: "Search your memory"
- [ ] Sidebar persists open state
- [ ] Visual indicator when memory items are saved

**Files**:
- `src/components/supermemory/MemorySidebar.tsx`
- `src/components/layout/AppShell.tsx`

---

## 8. [UI/UX] Hide extra modes behind dropdown to reduce clutter

**Labels**: `ui-ux`, `enhancement`

**Description**:
Reduce visual clutter by grouping less-used modes into a dropdown.

**Acceptance Criteria**:
- [ ] Primary modes visible: Home, Research, Trade
- [ ] Secondary modes (Games, Docs, Images, Threats, GraphMind) in "More tools" dropdown
- [ ] Mode switcher is clean and intuitive
- [ ] Settings accessible from dropdown

**Files**:
- `src/components/ModeSwitcher.tsx`
- `src/components/layout/TopNav.tsx`

---

## 9. [Testing] Add e2e test for search flow

**Labels**: `testing`, `e2e`

**Description**:
Add comprehensive e2e test for search functionality.

**Acceptance Criteria**:
- [ ] Test: Open app → type query → see search results
- [ ] Test: AI summary appears with citations
- [ ] Test: Click citation opens new tab
- [ ] Test: Search latency is reasonable (< 2s)
- [ ] Test handles error cases (no API key, network failure)

**Files**:
- `tests/e2e/search-flow.spec.ts` (enhance existing)

---

## 10. [Testing] Add e2e test for memory save/search

**Labels**: `testing`, `e2e`, `memory`

**Description**:
Add e2e test for memory functionality.

**Acceptance Criteria**:
- [ ] Test: Open page → click "Save to memory" → appears in sidebar
- [ ] Test: Search memory → match result
- [ ] Test: Memory persists after app restart
- [ ] Test: Semantic search finds related items

**Files**:
- `tests/e2e/memory-flow.spec.ts` (create new)

---

## 11. [Testing] Add e2e test for agent execution

**Labels**: `testing`, `e2e`, `agents`

**Description**:
Add e2e test for agent automation.

**Acceptance Criteria**:
- [ ] Test: Run "Save & Summarise page" agent
- [ ] Test: Permission prompt appears for risky actions
- [ ] Test: Memory item contains summary after agent run
- [ ] Test: Audit log captures agent actions

**Files**:
- `tests/e2e/agent-flow.spec.ts` (create new)

---

## 12. [Testing] Add e2e test for trade mode

**Labels**: `testing`, `e2e`, `trading`

**Description**:
Add e2e test for trading mode functionality.

**Acceptance Criteria**:
- [ ] Test: Open Trade mode → chart renders
- [ ] Test: AI insights panel shows text
- [ ] Test: Order entry form works
- [ ] Test: Market snapshots update

**Files**:
- `tests/e2e/trade-mode.spec.ts` (create new)

