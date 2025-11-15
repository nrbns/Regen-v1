# 🛠️ Cursor Build Prompts - Ready to Paste

Copy and paste these prompts into Cursor to build each component.

---

## 🔥 Priority 0 (Critical)

### 1. Navigation Kernel

```
Create a complete navigation kernel for OmniBrowser that handles:
- Full history stack with forward/back navigation
- Tab isolation (separate navigation contexts per tab)
- Back/forward cache (restore page state when navigating)
- Preloading next pages (predictive loading based on links)
- Navigation event tracking

Files to create:
- electron/services/navigation-kernel.ts
- electron/services/navigation-stack.ts
- electron/services/back-forward-cache.ts

Requirements:
- Use Electron's WebContents API
- Support session restore
- Handle navigation events (will-navigate, did-navigate, etc.)
- Cache page state (scroll position, form data, etc.)
- Preload links on hover or based on heuristics
- Integrate with existing tab system
```

---

### 2. Tab Engine Enhancement

```
Enhance the existing tab engine (electron/services/tabs.ts and tab-sleep.ts) to add:
- Tab suspension (freeze inactive tabs to save memory)
- Tab revive (restore suspended tabs on activation)
- Memory cap per tab (limit memory usage, suspend if exceeded)
- Background throttling (reduce CPU usage for background tabs)
- CPU monitoring per tab (track CPU usage)
- Crash recovery (auto-restore crashed tabs)

Requirements:
- Use BrowserView.webContents.getProcessMemoryInfo() for memory
- Use session.restore() for crash recovery
- Throttle background tabs (reduce update frequency)
- Monitor CPU usage and suspend high-usage inactive tabs
- Preserve tab state during suspension
- Integrate with existing tab management
```

---

### 3. Downloads Manager

```
Complete the downloads manager with:
- File stream handling (handle large files efficiently)
- Progress tracking UI (real-time progress bar)
- Resume downloads (pause/resume functionality)
- Large file handling (>1GB files)
- Download queue management
- SHA-256 verification
- Threat scanning integration
- "Show in folder" action

Files to enhance:
- electron/services/downloads-manager.ts
- src/components/downloads/DownloadManager.tsx

Requirements:
- Use Electron's downloadItem API
- Support pause/resume
- Show progress in UI
- Verify file integrity
- Handle errors gracefully
- Queue multiple downloads
```

---

### 4. Settings Engine

```
Create a complete settings engine:
- Working settings page UI
- Save/load preferences (use electron-store)
- Sync with disk (persistent storage)
- Settings categories (General, Privacy, AI, Appearance)
- Import/export settings
- Reset to defaults

Files to create:
- electron/services/settings.ts
- src/components/settings/SettingsPage.tsx
- src/stores/settings-store.ts

Requirements:
- Use electron-store for persistence
- Organize settings by category
- Support import/export JSON
- Validate settings on load
- Provide defaults
- Auto-save on change
```

---

### 5. LLM Assistant

```
Create a complete LLM assistant system:
- LLM API adapters (OpenAI, Anthropic, local Ollama)
- Page content extraction (use Firecrawl or readability)
- Code interpreter (syntax highlighting for code blocks)
- Page summarize in-sidebar
- "Ask about this page" feature
- Live citations (source links in responses)
- Research mode engine integration
- Document upload analysis (PDF, DOCX, TXT)

Files to create:
- apps/api/routes/llm-assistant.py
- src/components/ai/LLMAssistant.tsx
- src/components/ai/PageExtractor.tsx

Requirements:
- Support multiple LLM providers
- Extract clean page content
- Stream responses
- Show citations
- Handle document uploads
- Integrate with existing Redix system
```

---

### 6. AI Search Engine

```
Create an AI-powered search engine:
- Backend aggregator (combine DuckDuckGo + Bing results)
- Web scraping pipeline (extract content from results)
- AI summarization pipeline (summarize search results)
- Multiple hops search (enhance existing multi-hop)
- Real-time answer synthesis
- Source ranking algorithm
- Research mode UI connections
- Search result caching

Files to create:
- apps/api/routes/ai-search.py
- apps/api/services/search-aggregator.py
- src/components/search/AISearchResults.tsx

Requirements:
- Aggregate multiple search sources
- Scrape and extract content
- Use LLM to summarize
- Rank sources by relevance
- Cache results
- Stream answers
```

---

## 🔥 Priority 1 (Important)

### 7. Memory Event Tracker

```
Enhance the memory event tracker to track:
- Searches (query + results)
- Page visits (URL + metadata)
- Highlights (selected text)
- Screenshots (capture + store)
- Notes (user annotations)
- Tasks (todo items)
- Agent actions (automation logs)

Files to enhance:
- src/core/supermemory/tracker.ts
- src/core/supermemory/event-types.ts (new)

Requirements:
- Define event types
- Track all user actions
- Timestamp events
- Deduplicate events
- Store in memory database
```

---

### 8. Local Memory Database

```
Create a local memory database:
- IndexedDB implementation (for Electron)
- SQLite option (for Tauri)
- Write → embed → store vectors pipeline
- Memory compression
- Database migrations
- Backup/restore functionality

Files to create:
- src/core/supermemory/database.ts
- src/core/supermemory/indexeddb-adapter.ts
- src/core/supermemory/sqlite-adapter.ts

Requirements:
- Use IndexedDB for Electron
- Support SQLite for Tauri
- Store embeddings
- Compress old memories
- Migrate schema
- Backup/restore
```

---

### 9. Vector Embeddings

```
Complete the vector embeddings system:
- Chunk pages (split text into chunks)
- Embed chunks (use OpenAI/Hugging Face)
- Save embeddings (store in vector database)
- Recall by similarity (semantic search)
- Batch embedding processing
- Embedding cache

Files to enhance:
- src/core/supermemory/embedding.ts
- src/core/supermemory/vector-store.ts (new)
- src/core/supermemory/chunker.ts (new)

Requirements:
- Split text intelligently
- Generate embeddings
- Store vectors
- Search by similarity
- Cache embeddings
- Batch process
```

---

### 10. SuperMemory UI

```
Complete the SuperMemory UI:
- Memory sidebar (enhance existing)
- Search memory (semantic + keyword search)
- Filter by topic/time
- Pin items
- Tag items
- Memory visualization
- Memory stats dashboard

Files to enhance:
- src/components/supermemory/MemorySidebar.tsx
- src/components/supermemory/MemorySearch.tsx (new)
- src/components/supermemory/MemoryTimeline.tsx (new)

Requirements:
- Show memory items
- Search functionality
- Filter options
- Pin/tag features
- Visualize memory
- Show statistics
```

---

### 11. Redix Core Runtime

```
Complete the Redix core runtime:
- Event log (append-only, complete implementation)
- Deterministic reducers
- Redix dispatcher (action system)
- Policy engine (when to optimize)
- State snapshots
- Time-travel debugging

Files to enhance:
- src/core/redix/runtime.ts
- src/core/redix/event-log.ts
- src/core/redix/reducers.ts (new)
- src/core/redix/policies.ts (new)

Requirements:
- Append-only event log
- Deterministic state updates
- Action dispatching
- Policy-based optimization
- State snapshots
- Debug tools
```

---

### 12. Agent Primitives

```
Create agent primitives for automation:
- Read page (extract content)
- Extract tables (structured data)
- Click elements (DOM interaction)
- Fill forms (input automation)
- Take screenshots (capture)
- Save memory (persist actions)
- Wait for conditions
- Error handling

Files to create:
- src/core/agents/primitives.ts
- src/core/agents/page-reader.ts
- src/core/agents/dom-manipulator.ts

Requirements:
- Safe DOM manipulation
- Extract structured data
- Handle errors
- Log actions
- Support conditions
```

---

### 13. Multi-step Workflows

```
Complete the workflow system:
- Visual workflow builder (enhance existing UI)
- JSON-based workflows (serialization)
- Conditionals (if/else)
- Loops (for/while)
- Schedules (cron-like)
- Workflow execution engine
- Workflow debugging

Files to enhance:
- src/components/workflow/WorkflowBuilder.tsx
- src/core/workflows/engine.ts (new)
- src/core/workflows/executor.ts (new)

Requirements:
- Visual builder UI
- JSON serialization
- Conditional logic
- Loop support
- Scheduling
- Execution engine
- Debug mode
```

---

### 14. Design System

```
Create a complete design system:
- Color tokens (CSS variables)
- Typography system (fonts, sizes)
- Button components (variants)
- Card components
- Input components
- Shadow system
- Layout grid
- Spacing system

Files to create:
- src/styles/tokens.css
- src/components/ui/Button.tsx
- src/components/ui/Card.tsx
- src/components/ui/Input.tsx

Requirements:
- Consistent design
- Reusable components
- Dark/light mode support
- Responsive design
```

---

### 15. Command Palette

```
Create a universal command palette:
- Universal CMD+K (keyboard shortcut)
- Run actions (quick commands)
- Open tabs (tab switcher)
- Open settings
- Run workflows
- Search commands
- Command history

Files to create:
- src/components/CommandPalette.tsx
- src/core/commands/registry.ts
- src/core/commands/handler.ts

Requirements:
- CMD+K shortcut
- Command registry
- Fuzzy search
- Command execution
- History
```

---

### 16. Research Mode

```
Complete the research mode:
- Multi-column layout (enhance existing)
- Real-time answer (streaming)
- References (citations)
- Follow-ups (conversation)
- Document uploader (PDF, DOCX)
- Source panel
- Export options

Files to enhance:
- src/modes/research/index.tsx
- src/modes/research/ResearchLayout.tsx (new)
- src/modes/research/DocumentUploader.tsx (new)

Requirements:
- Multi-column UI
- Streaming responses
- Citation display
- Conversation flow
- Document support
- Export functionality
```

---

## 🔥 Priority 2 (Nice to Have)

### 17. E2EE (End-to-End Encryption)

```
Create E2EE system:
- Local keys (generate/store)
- Shared secrets (key exchange)
- Encrypted memory sync
- Encrypted settings sync
- Key rotation

Files to create:
- src/core/security/encryption.ts
- src/core/security/key-management.ts
- apps/api/routes/encryption.py

Requirements:
- Generate keys
- Encrypt data
- Key exchange
- Sync encrypted data
- Rotate keys
```

---

### 18. Permission Model

```
Create permission system:
- Agents must request permission
- Page actions need confirmation
- Permission storage
- Permission UI (prompts)

Files to create:
- src/core/permissions/manager.ts
- src/components/permissions/PermissionPrompt.tsx

Requirements:
- Permission requests
- User prompts
- Permission storage
- Permission checks
```

---

### 19. Device Sync

```
Create device sync:
- Browser state sync
- Tabs sync
- History sync
- Memory sync
- Settings sync
- Conflict resolution

Files to create:
- src/core/sync/device-sync.ts
- apps/api/routes/sync.py

Requirements:
- Sync state
- Handle conflicts
- Offline queue
- Sync server
```

---

## 📝 Usage

1. Copy a prompt above
2. Paste into Cursor
3. Cursor will generate the implementation
4. Review and refine
5. Test and integrate

---

**Start with Priority 0 items for maximum impact!**

