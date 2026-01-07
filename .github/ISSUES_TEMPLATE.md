# GitHub Issues Template

This document outlines the core work items that should be tracked as GitHub issues. Use this as a reference when creating issues.

## Labels to Create

Create these labels in your GitHub repository:

- `core-runtime` - Core engine and runtime components
- `ui-ux` - User interface and experience improvements
- `ai-llm` - AI/LLM integration and features
- `memory` - SuperMemory and memory-related features
- `redix` - Redix engine and event system
- `trading-mode` - Trading mode features
- `game-mode` - Game mode features
- `good-first-issue` - Good for new contributors
- `bug` - Bug fixes
- `enhancement` - Feature enhancements
- `documentation` - Documentation improvements
- `testing` - Test-related work

## Core Issues to Create

### 1. LLM Adapter Enhancement
**Labels:** `core-runtime`, `ai-llm`, `enhancement`
**Priority:** High
**Description:**
- Add support for additional LLM providers (Mistral, DeepSeek, Qwen)
- Implement streaming responses
- Add retry logic with exponential backoff
- Improve error handling and fallback mechanisms

**Acceptance Criteria:**
- [ ] Support for at least 3 LLM providers
- [ ] Streaming responses work correctly
- [ ] Retry logic handles transient failures
- [ ] Unit tests cover all providers

---

### 2. Search Proxy Backend Enhancement
**Labels:** `core-runtime`, `enhancement`
**Priority:** High
**Description:**
- Add support for additional search engines (Brave Search, Bing)
- Implement result caching
- Add rate limiting
- Improve citation accuracy

**Acceptance Criteria:**
- [ ] Support for at least 3 search engines
- [ ] Results are cached appropriately
- [ ] Rate limiting prevents abuse
- [ ] Citation accuracy ≥80%

---

### 3. SuperMemory Vector Store Optimization
**Labels:** `memory`, `enhancement`
**Priority:** Medium
**Description:**
- Optimize vector search performance
- Add batch operations
- Implement vector compression
- Improve IndexedDB migration handling

**Acceptance Criteria:**
- [ ] Vector search latency ≤150ms
- [ ] Batch operations work correctly
- [ ] Vector compression reduces storage by ≥30%
- [ ] Migrations handle edge cases

---

### 4. Redix Event Log Persistence
**Labels:** `redix`, `core-runtime`, `enhancement`
**Priority:** Medium
**Description:**
- Implement persistent storage for event log
- Add event log compression
- Implement event log rotation
- Add event log export/import

**Acceptance Criteria:**
- [ ] Event log persists across sessions
- [ ] Compression reduces storage usage
- [ ] Log rotation prevents unbounded growth
- [ ] Export/import works correctly

---

### 5. Agent Executor Security Hardening
**Labels:** `core-runtime`, `ai-llm`, `bug`
**Priority:** High
**Description:**
- Enhance domain sandboxing
- Improve permission checks
- Add action risk assessment
- Strengthen audit logging

**Acceptance Criteria:**
- [ ] Domain sandboxing prevents unauthorized access
- [ ] Permission checks are comprehensive
- [ ] Risk assessment is accurate
- [ ] Audit logs are tamper-proof

---

### 6. Trading Mode Real Market Data Integration
**Labels:** `trading-mode`, `enhancement`
**Priority:** Medium
**Description:**
- Integrate real market data providers (Polygon, Binance)
- Implement WebSocket connections
- Add real-time quote updates
- Handle market data errors gracefully

**Acceptance Criteria:**
- [ ] Real market data is displayed
- [ ] WebSocket connections are stable
- [ ] Real-time updates work correctly
- [ ] Error handling is robust

---

### 7. Mobile UI Improvements
**Labels:** `ui-ux`, `enhancement`
**Priority:** Medium
**Description:**
- Improve touch interactions
- Optimize for smaller screens
- Add swipe gestures
- Improve mobile navigation

**Acceptance Criteria:**
- [ ] Touch interactions are smooth
- [ ] UI is usable on screens <768px
- [ ] Swipe gestures work correctly
- [ ] Navigation is intuitive on mobile

---

### 8. Voice Companion Wake Word Detection
**Labels:** `ai-llm`, `ui-ux`, `enhancement`
**Priority:** Low
**Description:**
- Implement wake word detection ("Hey Regen")
- Add voice activity detection
- Improve noise cancellation
- Add offline wake word support

**Acceptance Criteria:**
- [ ] Wake word detection works reliably
- [ ] Voice activity detection is accurate
- [ ] Noise cancellation improves clarity
- [ ] Offline mode works without internet

---

### 9. Plugin Runtime Implementation
**Labels:** `core-runtime`, `enhancement`
**Priority:** Low
**Description:**
- Design plugin API
- Implement plugin sandboxing
- Add plugin marketplace
- Create plugin development tools

**Acceptance Criteria:**
- [ ] Plugin API is well-documented
- [ ] Sandboxing prevents security issues
- [ ] Marketplace is functional
- [ ] Development tools are available

---

### 10. E2EE Sync Implementation
**Labels:** `core-runtime`, `enhancement`
**Priority:** Medium
**Description:**
- Implement end-to-end encryption
- Add sync conflict resolution
- Implement sync status UI
- Add sync error handling

**Acceptance Criteria:**
- [ ] Data is encrypted end-to-end
- [ ] Conflicts are resolved correctly
- [ ] Sync status is visible to users
- [ ] Errors are handled gracefully

---

## How to Create Issues

1. Go to your GitHub repository
2. Click "Issues" → "New Issue"
3. Use the template above for each issue
4. Add appropriate labels
5. Set priority/milestone if applicable
6. Assign to team members if needed

## Issue Workflow

1. **Backlog** - Issues that are planned but not started
2. **In Progress** - Issues currently being worked on
3. **In Review** - Issues with PRs awaiting review
4. **Done** - Issues that are completed and merged

