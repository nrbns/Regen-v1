# 📚 Regen Browser - API Documentation

**Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Production Ready

This document provides comprehensive API documentation for Regen Browser's client-side libraries and core components.

---

## Table of Contents

1. [CommandController](#commandcontroller) - Main command execution entry point
2. [IntentRouter](#intentrouter) - Intent resolution system
3. [BackendService](#backendservice) - Backend API client
4. [WorkspaceStore](#workspacestore) - Local workspace persistence
5. [TaskRunner](#taskrunner) - Task execution system
6. [ToolGuard](#toolguard) - Security and permission system
7. [Tab Management](#tab-management) - Tab and WebView lifecycle
8. [AuditLog](#auditlog) - Security audit logging

---

## CommandController

**Location:** `src/lib/command/CommandController.ts`  
**Type:** Singleton class  
**Purpose:** Single entry point for all user commands

### Overview

The `CommandController` is the **execution spine** of Regen Browser. All user commands must route through this controller, ensuring consistent intent resolution, security checks, and status management.

### API

#### `handleCommand(input: string, context?: CommandContext): Promise<CommandResult>`

Main entry point for executing user commands.

**Parameters:**
- `input: string` - User command text (e.g., "search quantum computing", "go to github.com")
- `context?: CommandContext` - Optional context:
  ```typescript
  {
    currentUrl?: string;      // Current page URL
    selectedText?: string;    // Selected text (for analyze)
    activeTab?: string;       // Active tab ID
  }
  ```

**Returns:** `Promise<CommandResult>`
```typescript
{
  success: boolean;           // Whether command succeeded
  message: string;            // User-friendly message
  data?: any;                // Command-specific data (e.g., { url: "..." })
  error?: string;            // Error message if failed
}
```

**Example:**
```typescript
import { commandController } from '@/lib/command/CommandController';

const result = await commandController.handleCommand(
  "search quantum computing",
  { currentUrl: "https://example.com", activeTab: "tab-123" }
);

if (result.success) {
  console.log(result.message); // "Search for 'quantum computing' completed..."
  console.log(result.data);    // Search results array
}
```

#### `getStatus(): SystemStatus`

Get current system status.

**Returns:** `'idle' | 'working' | 'recovering'`

**Example:**
```typescript
const status = commandController.getStatus();
// 'idle' | 'working' | 'recovering'
```

#### `getLastAction(): string`

Get description of last executed action.

**Returns:** `string` - Human-readable action description

**Example:**
```typescript
const action = commandController.getLastAction();
// "Searched for 'quantum computing'"
```

#### `onStatusChange(listener: (status: SystemStatus) => void): () => void`

Subscribe to status changes.

**Parameters:**
- `listener: (status: SystemStatus) => void` - Callback function

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = commandController.onStatusChange((status) => {
  console.log('Status changed:', status);
});

// Later, unsubscribe
unsubscribe();
```

#### `onLastActionChange(listener: (action: string) => void): () => void`

Subscribe to last action changes.

**Parameters:**
- `listener: (action: string) => void` - Callback function

**Returns:** Unsubscribe function

### Command Intent Types

The CommandController resolves commands to these intent types:

- `NAVIGATE` - Navigate to URL
- `SEARCH` - Web search
- `RESEARCH` - Multi-step research (requires planner)
- `SUMMARIZE_PAGE` - Summarize current page
- `ANALYZE_TEXT` - Analyze selected text
- `TASK_RUN` - Execute predefined task
- `AI_QUERY` - General AI query
- `UNKNOWN` - Could not resolve intent

### Flow

1. **Intent Resolution** - Input is classified via `IntentRouter`
2. **Planner Check** - Determines if multi-step planning is needed
3. **Security Guard** - `ToolGuard` checks permissions
4. **Execution** - Intent-specific handler executes
5. **Status Update** - Status and lastAction updated
6. **Notification** - Toast notification dispatched

---

## IntentRouter

**Location:** `src/lib/command/IntentRouter.ts`  
**Type:** Singleton class  
**Purpose:** Formal intent resolution before AI execution

### Overview

The `IntentRouter` is the **single source of truth** for intent resolution. It classifies user input into structured intents before any AI execution occurs, ensuring disciplined intent-first architecture.

### API

#### `resolve(input: string, context?: CommandContext): ResolvedIntent`

Resolve user input to a structured intent.

**Parameters:**
- `input: string` - User input text
- `context?: CommandContext` - Optional context (same as CommandController)

**Returns:** `ResolvedIntent`
```typescript
{
  type: IntentType;           // 'NAVIGATE' | 'SEARCH' | 'RESEARCH' | ...
  confidence: number;         // 0-1, higher = more confident
  requiresPlanning: boolean;  // true = needs multi-step planner
  data: {
    url?: string;            // For NAVIGATE
    query?: string;          // For SEARCH, RESEARCH, AI_QUERY
    text?: string;           // For ANALYZE_TEXT
    task?: string;           // For TASK_RUN
    options?: Record<string, any>;
    context?: CommandContext;
  };
  reasoning?: string;        // Optional: why this intent was chosen
}
```

**Example:**
```typescript
import { intentRouter } from '@/lib/command/IntentRouter';

const resolved = intentRouter.resolve("go to github.com");

console.log(resolved.type);        // 'NAVIGATE'
console.log(resolved.confidence);  // 1.0
console.log(resolved.data.url);    // 'https://github.com'
console.log(resolved.requiresPlanning); // false
```

#### `getPatterns(): readonly IntentPattern[]`

Get all intent patterns (for debugging/validation).

**Returns:** Array of pattern definitions

### Intent Types

| Intent | Pattern Examples | Confidence | Requires Planning |
|--------|-----------------|------------|-------------------|
| `NAVIGATE` | "go to github.com", "open https://example.com" | 1.0 | No |
| `RESEARCH` | "research quantum computing", "investigate AI ethics" | 0.95 | Yes |
| `TASK_RUN` | "task summarize_page", "run extract_links" | 0.9 | No |
| `SUMMARIZE_PAGE` | "summarize", "summary" | 0.85 | No |
| `ANALYZE_TEXT` | "analyze" (with selected text) | 0.8 | No |
| `AI_QUERY` | "ask what is quantum computing" | 0.75 | No |
| `SEARCH` | (catch-all for other queries) | 0.5 | No |

### Pattern Matching

The router uses pattern-based matching with specificity ordering:
1. Most specific patterns checked first (NAVIGATE, RESEARCH)
2. Less specific patterns as fallback (SEARCH as catch-all)
3. Each pattern has confidence score (0-1)
4. First match wins (stops at first successful match)

---

## BackendService

**Location:** `src/lib/backend/BackendService.ts`  
**Type:** Singleton class  
**Purpose:** Abstraction layer for backend API calls

### Overview

`BackendService` provides a clean interface for making HTTP requests to the backend API, with automatic error handling and status tracking.

### API

#### `search(query: string): Promise<SearchResult[]>`

Perform web search.

**Parameters:**
- `query: string` - Search query

**Returns:** `Promise<SearchResult[]>`
```typescript
[
  {
    url: string;
    title: string;
    snippet: string;
    domain: string;
    relevance: number;  // 0-1
  }
]
```

**Example:**
```typescript
import { backendService } from '@/lib/backend/BackendService';

const results = await backendService.search("quantum computing");
// Returns empty array on error (graceful degradation)
```

#### `scrapeUrl(url: string): Promise<ScrapeResult | null>`

Scrape and extract content from URL.

**Parameters:**
- `url: string` - URL to scrape

**Returns:** `Promise<ScrapeResult | null>`
```typescript
{
  title: string;
  content: string;  // HTML content
  text: string;     // Plain text
  url: string;
} | null
```

**Example:**
```typescript
const result = await backendService.scrapeUrl("https://example.com");
if (result) {
  console.log(result.title);  // Page title
  console.log(result.text);   // Plain text content
}
```

#### `summarize(text: string, url?: string): Promise<string>`

Summarize content using AI.

**Parameters:**
- `text: string` - Text to summarize (max 2000 chars)
- `url?: string` - Optional source URL

**Returns:** `Promise<string>` - Summary text (or fallback if AI fails)

**Example:**
```typescript
const summary = await backendService.summarize(
  "Long article text here...",
  "https://example.com/article"
);
// Returns summary or truncated text on error
```

#### `analyzeText(text: string): Promise<string>`

Analyze text using AI.

**Parameters:**
- `text: string` - Text to analyze (max 2000 chars)

**Returns:** `Promise<string>` - Analysis text (or fallback message on error)

**Example:**
```typescript
const analysis = await backendService.analyzeText("Selected text here...");
// Returns analysis or "Analysis failed. Please try again." on error
```

#### `research(query: string, options?: Record<string, any>): Promise<ResearchResult>`

Perform multi-step research using AI and RAG.

**Parameters:**
- `query: string` - Research query
- `options?: Record<string, any>` - Optional research options

**Returns:** `Promise<ResearchResult>`
```typescript
{
  success: boolean;
  data?: {
    summary: string;
    sources: Array<{
      url: string;
      title: string;
      snippet: string;
    }>;
  };
  message?: string;
  error?: string;
}
```

**Example:**
```typescript
const result = await backendService.research("quantum computing ethics");
if (result.success && result.data) {
  console.log(result.data.summary);
  console.log(result.data.sources.length, "sources");
}
```

#### `aiTask(taskType: string, payload: Record<string, any>): Promise<AITaskResult>`

Perform general AI task.

**Parameters:**
- `taskType: string` - Task type (e.g., 'chat', 'translate')
- `payload: Record<string, any>` - Task-specific payload

**Returns:** `Promise<AITaskResult>`
```typescript
{
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}
```

#### `checkHealth(): Promise<boolean>`

Check if backend is available.

**Returns:** `Promise<boolean>` - `true` if backend is online

**Example:**
```typescript
const isOnline = await backendService.checkHealth();
if (!isOnline) {
  // Show offline indicator
}
```

### Error Handling

All methods return empty results or fallback content on error (graceful degradation):
- `search()` → Returns `[]` on error
- `scrapeUrl()` → Returns `null` on error
- `summarize()` → Returns truncated text on error
- `analyzeText()` → Returns fallback message on error
- `research()` → Returns `{ success: false, error: "..." }` on error

The service automatically marks backend status as available/unavailable based on API responses.

---

## WorkspaceStore

**Location:** `src/lib/workspace/WorkspaceStore.ts`  
**Type:** Singleton class  
**Purpose:** Local-first workspace persistence

### Overview

`WorkspaceStore` manages AI outputs, notes, and task results with local persistence (localStorage for web, file-based for Tauri).

### API

#### `getAll(): WorkspaceItem[]`

Get all workspace items.

**Returns:** Array of workspace items
```typescript
[
  {
    id: string;
    title: string;
    content: string;
    type: 'summary' | 'note' | 'analysis' | 'task_result' | 'search';
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, any>;
  }
]
```

#### `get(id: string): WorkspaceItem | undefined`

Get item by ID.

**Parameters:**
- `id: string` - Item ID

**Returns:** Workspace item or `undefined`

#### `add(item: Omit<WorkspaceItem, 'id' | 'createdAt' | 'updatedAt'>): WorkspaceItem`

Add new workspace item.

**Parameters:**
- `item` - Item data (without id, createdAt, updatedAt)

**Returns:** Created workspace item (with generated ID)

**Example:**
```typescript
import { workspaceStore } from '@/lib/workspace/WorkspaceStore';

const item = workspaceStore.add({
  title: "Research Summary",
  content: "Summary text here...",
  type: 'summary',
  metadata: { query: "quantum computing" }
});

console.log(item.id);  // Generated ID
```

#### `update(id: string, updates: Partial<WorkspaceItem>): WorkspaceItem | null`

Update existing item.

**Parameters:**
- `id: string` - Item ID
- `updates: Partial<WorkspaceItem>` - Fields to update

**Returns:** Updated item or `null` if not found

#### `delete(id: string): boolean`

Delete item.

**Parameters:**
- `id: string` - Item ID

**Returns:** `true` if deleted, `false` if not found

#### `clear(): void`

Clear all workspace items.

#### `getCount(): number`

Get total number of items.

**Returns:** Item count

#### `exportToJSON(): string`

Export workspace to JSON.

**Returns:** JSON string

**Example:**
```typescript
const json = workspaceStore.exportToJSON();
// Save to file or clipboard
```

#### `exportToMarkdown(): string`

Export workspace to Markdown (human-readable).

**Returns:** Markdown string

**Example:**
```typescript
const markdown = workspaceStore.exportToMarkdown();
// Save as .md file
```

#### `importFromJSON(json: string): ImportResult`

Import workspace from JSON.

**Parameters:**
- `json: string` - JSON string (from `exportToJSON()`)

**Returns:**
```typescript
{
  success: boolean;
  imported: number;     // Number of items imported
  errors: string[];     // Array of error messages
}
```

**Example:**
```typescript
const result = workspaceStore.importFromJSON(jsonString);
if (result.success) {
  console.log(`Imported ${result.imported} items`);
} else {
  console.error(result.errors);
}
```

#### `getStorageSize(): number`

Get workspace storage size in bytes.

**Returns:** Size in bytes

#### `getStatistics(): WorkspaceStatistics`

Get workspace statistics.

**Returns:**
```typescript
{
  totalItems: number;
  byType: Record<string, number>;  // Count by type
  totalSize: number;               // Bytes
  totalSizeMB: number;             // Megabytes (rounded)
  oldestItem?: number;             // Timestamp
  newestItem?: number;             // Timestamp
}
```

**Example:**
```typescript
const stats = workspaceStore.getStatistics();
console.log(`Total: ${stats.totalItems} items`);
console.log(`Size: ${stats.totalSizeMB} MB`);
console.log(`By type:`, stats.byType);
```

### Persistence

- **Web Mode:** Uses `localStorage`
- **Tauri Mode:** Uses file-based persistence (prepared, requires backend)
- **Auto-save:** All mutations (`add`, `update`, `delete`, `clear`) automatically save
- **Storage Quota:** Automatically clears oldest items if storage full

---

## TaskRunner

**Location:** `src/lib/tasks/TaskRunner.ts`  
**Type:** Singleton class  
**Purpose:** Single-run, user-triggered task execution

### Overview

`TaskRunner` manages predefined tasks with strict schema validation. Tasks are **single-run, user-triggered only** - no background loops, no autonomy.

### API

#### `getAvailableTasks(): TaskDefinition[]`

Get all available tasks.

**Returns:** Array of task definitions
```typescript
[
  {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    paramSchema?: z.ZodSchema<any>;  // Zod schema for validation
  }
]
```

#### `getTask(id: string): TaskDefinition | undefined`

Get task by ID.

**Parameters:**
- `id: string` - Task ID (lowercase alphanumeric with dashes/underscores)

**Returns:** Task definition or `undefined`

#### `registerTask(task: TaskDefinition): void`

Register a new task (typically done during initialization).

**Parameters:**
- `task: TaskDefinition` - Task definition

**Example:**
```typescript
import { taskRunner } from '@/lib/tasks/TaskRunner';
import { z } from 'zod';

taskRunner.registerTask({
  id: 'my_custom_task',
  name: 'My Custom Task',
  description: 'Does something custom',
  enabled: true,
  paramSchema: z.object({
    url: z.string().url().optional(),
  }),
});
```

#### `executeTask(taskId: string, params?: Record<string, any>): Promise<TaskExecution>`

Execute a task.

**Parameters:**
- `taskId: string` - Task ID (must match pattern `/^[a-z0-9_-]+$/`)
- `params?: Record<string, any>` - Task parameters (validated against `paramSchema`)

**Returns:** `Promise<TaskExecution>`
```typescript
{
  id: string;              // Execution ID
  taskId: string;          // Task ID
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;       // Timestamp
  completedAt?: number;    // Timestamp (if completed/failed)
  result?: any;            // Task result (if completed)
  error?: string;          // Error message (if failed)
}
```

**Example:**
```typescript
try {
  const execution = await taskRunner.executeTask('summarize_page', {
    url: 'https://example.com'
  });

  if (execution.status === 'completed') {
    console.log(execution.result);  // Summary text
  }
} catch (error) {
  // Validation error (invalid task ID or params)
  console.error(error.message);
}
```

#### `onExecution(listener: (execution: TaskExecution) => void): () => void`

Subscribe to task execution events.

**Parameters:**
- `listener: (execution: TaskExecution) => void` - Callback function

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = taskRunner.onExecution((execution) => {
  console.log(`Task ${execution.taskId} status: ${execution.status}`);
});

// Later, unsubscribe
unsubscribe();
```

### Built-in Tasks

1. **`summarize_page`** - Extract and summarize current page content
   - Params: `{ url?: string }`

2. **`extract_links`** - Extract all links from current page
   - Params: `{ url?: string }`

3. **`analyze_content`** - Analyze page content for key insights
   - Params: `{ url?: string }`

### Validation

- **Task ID Format:** Must match `/^[a-z0-9_-]+$/` (lowercase alphanumeric with dashes/underscores)
- **Parameter Validation:** Uses Zod schema if task has `paramSchema`
- **Clear Error Messages:** Throws descriptive errors for invalid task ID or params

---

## ToolGuard

**Location:** `src/lib/security/ToolGuard.ts`  
**Type:** Singleton class  
**Purpose:** Security guard for tool execution

### Overview

`ToolGuard` implements allowlist-based tool execution with permission prompts and audit logging. It ensures only explicitly allowed tools can execute.

### API

#### `checkPermission(request: ToolExecutionRequest): Promise<ToolExecutionResult>`

Check if a tool can be executed.

**Parameters:**
```typescript
{
  tool: string;              // Tool name (e.g., 'navigate', 'search')
  input: Record<string, any>; // Tool input
  context?: {
    userId?: string;
    sessionId?: string;
    tabId?: string;
  };
}
```

**Returns:** `Promise<ToolExecutionResult>`
```typescript
{
  allowed: boolean;              // Whether tool can execute
  requiresConsent: boolean;      // Whether user consent is required
  permission?: ToolPermission;   // Permission details
  error?: string;                // Error message if blocked
}
```

**Example:**
```typescript
import { toolGuard } from '@/lib/security/ToolGuard';

const result = await toolGuard.checkPermission({
  tool: 'navigate',
  input: { url: 'https://example.com' },
  context: { tabId: 'tab-123' }
});

if (!result.allowed) {
  if (result.requiresConsent) {
    // Request user consent
    const granted = await toolGuard.requestConsent({ ... });
  } else {
    // Blocked for security reasons
    console.error(result.error);
  }
}
```

#### `requestConsent(request: ToolExecutionRequest): Promise<boolean>`

Request user consent for a tool.

**Parameters:**
- `request: ToolExecutionRequest` - Same as `checkPermission()`

**Returns:** `Promise<boolean>` - `true` if user granted consent

**Example:**
```typescript
const granted = await toolGuard.requestConsent({
  tool: 'scrape',
  input: { url: 'https://example.com' },
  context: { tabId: 'tab-123' }
});

if (granted) {
  // User granted consent, can now execute tool
} else {
  // User denied consent or timeout
}
```

#### `recordConsent(tool: string, input: Record<string, any>, granted: boolean, context?: ToolExecutionRequest['context']): void`

Record user consent decision (typically called by UI).

**Parameters:**
- `tool: string` - Tool name
- `input: Record<string, any>` - Tool input
- `granted: boolean` - Whether consent was granted
- `context?: ToolExecutionRequest['context']` - Optional context

#### `executeTool<T>(tool: string, input: Record<string, any>, executor: (input: Record<string, any>) => Promise<T>, context?: ToolExecutionRequest['context']): Promise<T>`

Execute tool with guard (main entry point).

**Parameters:**
- `tool: string` - Tool name
- `input: Record<string, any>` - Tool input
- `executor: (input: Record<string, any>) => Promise<T>` - Tool execution function
- `context?: ToolExecutionRequest['context']` - Optional context

**Returns:** `Promise<T>` - Tool execution result

**Example:**
```typescript
const result = await toolGuard.executeTool(
  'navigate',
  { url: 'https://example.com' },
  async (input) => {
    // Tool execution logic
    return { success: true, url: input.url };
  },
  { tabId: 'tab-123' }
);
```

#### `getAuditLog(limit?: number): AuditEntry[]`

Get audit log entries.

**Parameters:**
- `limit?: number` - Maximum number of entries (default: 100)

**Returns:** Array of audit entries
```typescript
[
  {
    timestamp: number;
    tool: string;
    allowed: boolean;
    reason: string;
    input: string;              // JSON string
    context: Record<string, any>;
  }
]
```

### Tool Categories

| Category | Risk | Examples |
|----------|------|----------|
| `browser` | Low | `navigate`, `scrape`, `getDom`, `clickElement`, `scroll` |
| `search` | Low | `search`, `hybridSearch`, `semanticSearch`, `research` |
| `ai` | Low | `summarize`, `analyze`, `translate`, `chat` |
| `workspace` | Low | `saveToWorkspace`, `readFromWorkspace`, `deleteFromWorkspace` |
| `system` | High | Filesystem access, network requests (RESTRICTED) |
| `exec` | Critical | Command execution, process spawning (BLOCKED) |

### Allowed Tools

- Browser: `navigate`, `scrape`, `getDom`, `clickElement`, `scroll`
- Search: `search`, `hybridSearch`, `semanticSearch`, `research`
- AI: `summarize`, `analyze`, `translate`, `chat`
- Workspace: `saveToWorkspace`, `readFromWorkspace`, `deleteFromWorkspace`

### Blocked Tools

- `exec`, `execSync`, `spawn`, `fork` - Command execution (BLOCKED)
- `eval` - Code evaluation (BLOCKED)
- `writeFile`, `readFile`, `deleteFile` - Filesystem access (use workspace instead)
- `accessFileSystem`, `networkRequest` - Direct access (use API client)

### Consent Required

- `scrape` - Scraping user data
- `saveToWorkspace` - Saving user content
- `deleteFromWorkspace` - Deleting user content

---

## AuditLog

**Location:** `src/lib/security/AuditLog.ts`  
**Type:** Class  
**Purpose:** Persistent audit logging for tool execution

### Overview

`AuditLog` provides persistent, local-storage-backed audit logging for all tool execution decisions.

### API

#### `addEntry(entry: AuditEntry): void`

Add a new audit entry.

**Parameters:**
```typescript
{
  timestamp: number;              // Unix timestamp
  tool: string;                   // Tool name
  allowed: boolean;               // Whether execution was allowed
  reason: string;                 // Reason for decision
  input: string;                  // JSON string of input
  context: Record<string, any>;   // Execution context
}
```

#### `getEntries(limit?: number): AuditEntry[]`

Get audit log entries.

**Parameters:**
- `limit?: number` - Maximum number of entries (default: 1000)

**Returns:** Array of audit entries (most recent first)

#### `clear(): void`

Clear all audit entries.

### Persistence

- Uses `localStorage` with key `regen:audit:log`
- Maximum 1000 entries (oldest entries auto-removed)
- Survives page reloads

---

## Tab Management

**Location:** `src/state/tabsStore.ts` (Zustand store)  
**Purpose:** Tab and WebView lifecycle management

### Overview

The tab management system enforces **1 Tab = 1 WebView** with backend-owned navigation and session restore.

### API

#### `navigateTab(tabId: string, url: string): void`

Navigate a tab (backend-owned).

**Parameters:**
- `tabId: string` - Tab ID
- `url: string` - URL to navigate to

**Note:** This dispatches a navigation request. The UI updates only after backend confirmation via `regen:navigate:confirmed` event.

#### `onNavigationConfirmed(tabId: string, url: string): void`

Handle backend navigation confirmation.

**Parameters:**
- `tabId: string` - Tab ID
- `url: string` - Confirmed URL

**Note:** This is called automatically by the store when listening to `regen:navigate:confirmed` events. Typically not called directly.

#### `getTabs(): Tab[]`

Get all tabs.

**Returns:** Array of tabs
```typescript
[
  {
    id: string;
    url: string;
    title: string;
    isActive: boolean;
    createdAt: number;
    lastActiveAt?: number;
    pinned?: boolean;
  }
]
```

#### `getActiveTab(): Tab | null`

Get currently active tab.

**Returns:** Active tab or `null`

### Session Restore

Tabs are automatically persisted to `localStorage` via Zustand `persist` middleware and restored on app restart.

### Tab Eviction

**Location:** `src/utils/tabEviction.ts`

#### `createTabSnapshot(tab: Tab): TabSnapshot`

Create snapshot of tab before eviction.

**Returns:**
```typescript
{
  tabId: string;
  url: string;
  title: string;
  thumbnail?: string;           // Base64 thumbnail
  scrollPosition?: { x: number; y: number };
  timestamp: number;
}
```

#### `restoreTab(tabId: string, snapshot: TabSnapshot): Promise<void>`

Restore tab from snapshot.

**Parameters:**
- `tabId: string` - Tab ID
- `snapshot: TabSnapshot` - Tab snapshot

**Note:** Restores WebView and scroll position.

---

## React Hooks

### `useCommandController()`

**Location:** `src/hooks/useCommandController.ts`

React hook for accessing CommandController.

**Returns:**
```typescript
{
  status: SystemStatus;
  lastAction: string;
  isExecuting: boolean;
  executeCommand: (input: string, context?: CommandContext) => Promise<CommandResult>;
}
```

**Example:**
```typescript
import { useCommandController } from '@/hooks/useCommandController';

function MyComponent() {
  const { status, lastAction, isExecuting, executeCommand } = useCommandController();

  const handleSubmit = async () => {
    const result = await executeCommand("search quantum computing");
    if (result.success) {
      console.log("Success!");
    }
  };

  return (
    <div>
      <p>Status: {status}</p>
      <p>Last Action: {lastAction}</p>
      <button onClick={handleSubmit} disabled={isExecuting}>
        Execute
      </button>
    </div>
  );
}
```

---

## Error Handling

All APIs follow consistent error handling:

1. **Async Methods:** Return rejected promises on error (use `try/catch`)
2. **Sync Methods:** Throw errors (use `try/catch`)
3. **Graceful Degradation:** BackendService returns empty results on error
4. **Status Updates:** CommandController sets status to `'recovering'` on error
5. **User Feedback:** Toast notifications dispatched for success/failure

---

## Best Practices

1. **Always use CommandController** for user commands (single entry point)
2. **Check backend health** before AI operations (`BackendService.checkHealth()`)
3. **Validate task parameters** before execution (handled by TaskRunner)
4. **Use ToolGuard** for all tool execution (security)
5. **Handle errors gracefully** (check `success` field, provide fallbacks)
6. **Subscribe to status changes** for real-time UI updates
7. **Use workspace export/import** for backup and transfer

---

## Type Definitions

All types are exported from their respective modules:

```typescript
// CommandController types
import type { SystemStatus, CommandIntent, CommandResult, CommandContext } from '@/lib/command/CommandController';

// IntentRouter types
import type { IntentType, ResolvedIntent } from '@/lib/command/IntentRouter';

// BackendService types
import type { SearchResult, ScrapeResult, AITaskResult } from '@/lib/backend/BackendService';

// WorkspaceStore types
import type { WorkspaceItem } from '@/lib/workspace/WorkspaceStore';

// TaskRunner types
import type { TaskDefinition, TaskExecution } from '@/lib/tasks/TaskRunner';

// ToolGuard types
import type { ToolPermission, ToolExecutionRequest, ToolExecutionResult } from '@/lib/security/ToolGuard';

// AuditLog types
import type { AuditEntry } from '@/lib/security/AuditLog';
```

---

## Support

For questions or issues:
- Check `README.md` for general information
- See `AUDIT.md` for architecture details
- Review `LEGACY_COMPONENTS.md` for deprecated APIs

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** ✅ Production Ready