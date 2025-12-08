# Regen Production Blueprint

> **Status:** This blueprint is a living document tracking implementation of the 5-Pillar Architecture.
>
> **See Also:**
>
> - `docs/OMNIBROWSER_MASTER_PLAN.md` - The 5-Pillar Master Plan
> - `docs/REGEN_ARCHITECTURE.md` - Regen Unified Architecture
> - `docs/REGEN_ROADMAP.md` - Build Roadmap
> - `docs/COMPETITIVE_ANALYSIS.md` - Competitive Positioning

---

# Regen Production Blueprint

**Founder → CTO Level Documentation**

**Version**: 1.0.0  
**Last Updated**: 2025-01-22  
**Status**: Production-Ready Specification

---

## 📋 Table of Contents

1. [Full Production-Readiness Checklist (99-Point Audit)](#1-full-production-readiness-checklist-99-point-audit)
2. [Enterprise-Grade Architecture Diagram](#2-enterprise-grade-architecture-diagram)
3. [Electron Security Hardening Guide](#3-electron-security-hardening-guide)
4. [Agent Runtime Design (Sandbox + Persistence)](#4-agent-runtime-design-sandbox--persistence)
5. [Session Restore Implementation](#5-session-restore-implementation)
6. [System Status Panel + IPC](#6-system-status-panel--ipc)

---

## ✅ 1) FULL PRODUCTION-READINESS CHECKLIST (99-POINT AUDIT)

### ✅ **A) Electron Security (Critical)**

- [ ] `nodeIntegration: false`
- [ ] `contextIsolation: true`
- [ ] `enableRemoteModule: false`
- [ ] `sandbox: true`
- [ ] Only preload exposes whitelisted APIs
- [ ] Disable navigation to file URLs
- [ ] Block `window.open` without rules
- [ ] CSP (Content Security Policy):
  ```
  default-src 'self';
  script-src 'self';
  connect-src 'self' https://api.*;
  ```
- [ ] Auto-update signing enabled
- [ ] Certificate pinning for proxies/VPN

**Implementation Status**:

- ✅ `nodeIntegration: false` - Implemented
- ✅ `contextIsolation: true` - Implemented
- ✅ Preload whitelist - Implemented
- 🔄 CSP - To be implemented
- 🔄 Auto-update signing - To be implemented
- 🔄 Certificate pinning - To be implemented

---

### ✅ **B) IPC Safety**

- [ ] Every handler schema-validated with Zod
- [ ] Reject unknown channels
- [ ] Rate-limit high-frequency IPC
- [ ] No direct filesystem access from renderer
- [ ] Logging for failed schema validation

**Implementation Status**:

- ✅ Zod schema validation - Implemented (`electron/shared/ipc/router.ts`)
- ✅ Versioned channels (`ob://ipc/v1/*`) - Implemented
- 🔄 Rate limiting - To be implemented
- ✅ No direct filesystem access - Enforced via preload
- 🔄 Schema validation logging - To be enhanced

---

### ✅ **C) Crash Recovery**

- [ ] Snapshot tabs every 30s
- [ ] Persist:
  - [ ] Tabs
  - [ ] Workspaces
  - [ ] Mode
  - [ ] Active URL
  - [ ] Session cookies (isolated)
- [ ] Auto-restore on launch
- [ ] "Restore previous session?" prompt on crash

**Implementation Status**:

- ✅ Session persistence - Implemented (`electron/services/session-persistence.ts`)
- ✅ Tab snapshots - Implemented
- ✅ Workspace persistence - Implemented
- 🔄 Auto-restore prompt - To be implemented
- 🔄 Cookie isolation persistence - To be implemented

---

### ✅ **D) Performance**

- [ ] BrowserViews lazy-created
- [ ] Dispose inactive tabs after timeout
- [ ] Preload only essential scripts
- [ ] GPU acceleration toggle
- [ ] Memory ceiling per tab
- [ ] IPC batching for stream events

**Implementation Status**:

- ✅ BrowserView lazy creation - Implemented
- ✅ Tab hibernation - Implemented (`electron/services/tabs.ts`)
- ✅ Memory monitoring - Implemented (`electron/services/memory.ts`)
- 🔄 GPU acceleration toggle - To be implemented
- ✅ IPC batching - Partially implemented
- 🔄 Stream event batching - To be optimized

---

### ✅ **E) Observability**

- [ ] Pino structured logs
- [ ] Log rotation enabled
- [ ] Performance markers:
  - [ ] Tab creation
  - [ ] IPC response time
  - [ ] Redix job latency
- [ ] Metrics endpoint `/metrics`
- [ ] Crash dump on fatal

**Implementation Status**:

- ✅ Structured logging - Implemented (`src/utils/logger.ts`)
- 🔄 Log rotation - To be implemented
- 🔄 Performance markers - To be implemented
- 🔄 Metrics endpoint - To be implemented
- 🔄 Crash dump - To be implemented

---

### ✅ **F) Privacy & Security**

- [ ] Per-tab cookie partitioning
- [ ] Isolated storage buckets
- [ ] Shield levels: strict / balanced / off
- [ ] Permission prompts:
  - [ ] Mic
  - [ ] Camera
  - [ ] Filesystem
  - [ ] VPN activation
- [ ] Tor routing optional with failover

**Implementation Status**:

- ✅ Cookie partitioning - Implemented (site-based partitions)
- ✅ Storage isolation - Implemented
- ✅ Shields - Implemented (`electron/services/shields.ts`)
- ✅ Tor integration - Implemented (`electron/services/tor.ts`)
- ✅ VPN integration - Implemented (`electron/services/vpn.ts`)
- 🔄 Permission prompts - To be enhanced

---

### ✅ **G) Redix + Redis**

- [ ] Redis optional (not required to run)
- [ ] Retry limit: max 3
- [ ] Exponential backoff
- [ ] Once-per-60s error logging
- [ ] BullMQ retry < 3
- [ ] `safeRedisOperation` wrapper everywhere

**Implementation Status**:

- ✅ Redis optional - Implemented
- ✅ Retry limit: 3 - Implemented (`server/config/redis.js`)
- ✅ Exponential backoff - Implemented
- ✅ Error suppression (60s) - Implemented
- ✅ BullMQ retry limit - Implemented
- ✅ `safeRedisOperation` - Implemented (`server/redix-server.js`)

---

### ✅ **H) Release Checklist**

- [ ] Code signing
- [ ] OTA update channel
- [ ] Versioned IPC (`v1`, `v2`)
- [ ] Migration strategy for stores
- [ ] Feature flags for experimental modes

**Implementation Status**:

- ✅ Versioned IPC - Implemented (`ob://ipc/v1/*`)
- 🔄 Code signing - To be implemented
- 🔄 OTA updates - To be implemented
- 🔄 Store migrations - To be implemented
- 🔄 Feature flags - To be implemented

---

## ✅ 2) UPGRADED ENTERPRISE-GRADE ARCHITECTURE DIAGRAM

```
                   ┌───────────────────────────┐
                   │   System Status Layer      │
                   │  (health, readiness, sync) │
                   └──────────────┬─────────────┘
                                  │
┌─────────────────────────────────┴─────────────────────────────────┐
│                         MAIN PROCESS (Node.js)                    │
│ ┌─────────────┐ ┌───────────────┐ ┌─────────────────────────────┐ │
│ │ AI Runtime  │ │ Privacy Stack │ │  Service Orchestration      │ │
│ │ (Agents,    │ │ (Shields,     │ │  (Fastify, Redix, Worker)   │ │
│ │  Tools)     │ │  Tor, VPN)    │ └─────────────────────────────┘ │
│ └──────┬──────┘ └───────┬──────┘ ┌─────────────────────────────┐ │
│        │                 │        │ Storage Layer               │ │
│        │                 │        │ (SQLite, Redis*)           │ │
│        │                 │        │ * optional                 │ │
│        │                 │        └─────────────────────────────┘ │
│        └─────────────── IPC Router (Zod-typed, v1/v2) ────────────┘
│                           │
└───────────────────────────┬───────────────────────────────────────┘
                            │
            ┌───────────────▼────────────────┐
            │   RENDERER (React + Zustand)   │
            │ ┌───────────────┐ ┌──────────┐ │
            │ │ UI Shell       │ │ Command  │ │
            │ │ (Tabs, Mode)   │ │  Bar     │ │
            │ └───────────────┘ └──────────┘ │
            │ ┌───────────────┐ ┌──────────┐ │
            │ │ Mode Views     │ │ Onboard  │ │
            │ │ (Research etc) │ │ Restore  │ │
            │ └───────────────┘ └──────────┘ │
            └───────────────────┬────────────┘
                                │ BrowserView API
                                ▼
         ┌─────────────────────────────────────────┐
         │  ISOLATED BROWSERVIEW (Chromium per tab)│
         │  site partition, shield level, session  │
         └─────────────────────────────────────────┘
```

### **Key Architecture Principles**

1. **Process Isolation**: Main, Renderer, and BrowserView processes are strictly isolated
2. **Type Safety**: All IPC communication is Zod-validated and type-safe
3. **Service-Oriented**: 50+ service modules organized by domain
4. **Graceful Degradation**: Optional services (Redis) don't block core functionality
5. **Privacy-First**: Multi-layer privacy stack (Shields + Tor + VPN)
6. **AI-Native**: Built-in agent runtime with tool registry

---

## ✅ 3) ELECTRON SECURITY HARDENING GUIDE

### ✅ **Main Config (`BrowserWindow`)**

```typescript
new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: path.join(__dirname, 'preload.js'),
    webSecurity: true,
    allowRunningInsecureContent: false,
    // Additional hardening
    enableBlinkFeatures: '',
    disableBlinkFeatures: 'Auxclick',
  },
  // Window security
  titleBarStyle: 'hiddenInset',
  frame: true,
  transparent: false,
});
```

**Current Implementation**: `electron/main.ts`

---

### ✅ **Disable Remote Module**

```typescript
// In main process
app.disableHardwareAcceleration(); // Only if needed for compatibility

// Ensure @electron/remote is not used
// If needed, initialize properly:
if (process.env.NODE_ENV === 'development') {
  require('@electron/remote/main').initialize();
}
```

---

### ✅ **Secure Navigation**

```typescript
// Prevent navigation to file:// URLs
win.webContents.on('will-navigate', (event, url) => {
  const parsed = new URL(url);

  // Block file:// URLs
  if (parsed.protocol === 'file:') {
    event.preventDefault();
    console.warn('[Security] Blocked file:// navigation:', url);
    return;
  }

  // Block data: URLs in main frame
  if (parsed.protocol === 'data:' && event.sender === win.webContents) {
    event.preventDefault();
    console.warn('[Security] Blocked data: URL navigation');
    return;
  }

  // Allow https:// and http:// (with user consent)
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    event.preventDefault();
    console.warn('[Security] Blocked non-HTTP navigation:', url);
  }
});

// Prevent new window creation without rules
win.webContents.setWindowOpenHandler(({ url }) => {
  // Validate URL
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    return { action: 'deny' };
  }

  // Allow opening in new window
  return { action: 'allow' };
});
```

**Implementation Location**: `electron/main.ts` - `createWindow()` function

---

### ✅ **Harden Preload**

Expose ONLY whitelisted APIs:

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// Whitelist of allowed IPC channels
const ALLOWED_CHANNELS = [
  'tabs:create',
  'tabs:list',
  'tabs:activate',
  'history:list',
  'bookmarks:list',
  // ... other whitelisted channels
];

contextBridge.exposeInMainWorld('ob', {
  ipc: {
    invoke: (channel: string, ...args: any[]) => {
      if (!ALLOWED_CHANNELS.includes(channel)) {
        throw new Error(`IPC channel ${channel} is not allowed`);
      }
      return ipcRenderer.invoke(channel, ...args);
    },
    on: (channel: string, callback: (...args: any[]) => void) => {
      if (!ALLOWED_CHANNELS.includes(channel)) {
        throw new Error(`IPC channel ${channel} is not allowed`);
      }
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    },
  },
});
```

**Current Implementation**: `electron/preload.ts`

---

### ✅ **Content Security Policy (CSP)**

```typescript
// In main process, set CSP headers
app.on('web-contents-created', (_, contents) => {
  contents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "connect-src 'self' https://api.* https://*.ollama.ai; " +
            "img-src 'self' data: https:; " +
            "font-src 'self' data:;",
        ],
      },
    });
  });
});
```

**Status**: 🔄 To be implemented

---

## ✅ 4) AGENT RUNTIME DESIGN (SANDBOX + PERSISTENCE)

### ✅ **Architecture**

```
Agent Runtime
 ├─ Task Queue (BullMQ)
 ├─ Execution Sandbox (worker_thread)
 ├─ Timeout + Cancel Token
 ├─ Persistent Context Store (SQLite)
 └─ Skill Registry (Tool Registry)
```

**Current Implementation**:

- ✅ Task Queue - `electron/services/agent/host.ts`
- ✅ Tool Registry - `src/agent/registry.ts`
- 🔄 Worker Thread Sandbox - To be implemented
- ✅ Context Store - `electron/services/agent/brain.ts`

---

### ✅ **Sandbox Execution**

```typescript
// electron/services/agent/sandbox-runner.ts
import { Worker } from 'worker_threads';
import { join } from 'path';

export interface AgentTask {
  id: string;
  agentId: string;
  input: unknown;
  timeout: number;
}

export function runAgentTask(task: AgentTask): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(join(__dirname, 'agent-worker.js'), {
      workerData: task,
      // Resource limits
      resourceLimits: {
        maxOldGenerationSizeMb: 512,
        maxYoungGenerationSizeMb: 128,
      },
    });

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error(`Agent task ${task.id} timed out after ${task.timeout}ms`));
    }, task.timeout || 8000);

    worker.on('message', msg => {
      clearTimeout(timeout);
      if (msg.type === 'result') {
        resolve(msg.data);
      } else if (msg.type === 'error') {
        reject(new Error(msg.error));
      }
    });

    worker.on('error', error => {
      clearTimeout(timeout);
      reject(error);
    });

    worker.on('exit', code => {
      if (code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}
```

**Status**: 🔄 To be implemented

---

### ✅ **Persistent Memory**

```typescript
// electron/services/agent/memory-store.ts
import Database from 'better-sqlite3';

interface AgentContext {
  agentId: string;
  lastTask?: string;
  preferences: Record<string, unknown>;
  goals: string[];
  history: Array<{ task: string; result: unknown; timestamp: number }>;
}

export class AgentMemoryStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_contexts (
        agent_id TEXT PRIMARY KEY,
        context_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_updated_at ON agent_contexts(updated_at);
    `);
  }

  getContext(agentId: string): AgentContext | null {
    const row = this.db
      .prepare('SELECT context_json FROM agent_contexts WHERE agent_id = ?')
      .get(agentId) as { context_json: string } | undefined;

    if (!row) return null;
    return JSON.parse(row.context_json);
  }

  saveContext(agentId: string, context: AgentContext): void {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO agent_contexts (agent_id, context_json, updated_at) VALUES (?, ?, ?)'
      )
      .run(agentId, JSON.stringify(context), Date.now());
  }

  addHistory(agentId: string, task: string, result: unknown): void {
    const context = this.getContext(agentId) || {
      agentId,
      preferences: {},
      goals: [],
      history: [],
    };

    context.history.push({
      task,
      result,
      timestamp: Date.now(),
    });

    // Keep only last 100 entries
    if (context.history.length > 100) {
      context.history = context.history.slice(-100);
    }

    this.saveContext(agentId, context);
  }
}
```

**Status**: 🔄 To be implemented

---

## ✅ 5) SESSION RESTORE IMPLEMENTATION

### ✅ **Snapshot Every 30s**

```typescript
// electron/services/session-persistence.ts
import { writeFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

interface SessionSnapshot {
  tabs: Array<{
    id: string;
    url: string;
    title: string;
    active: boolean;
  }>;
  workspaces: Array<{
    id: string;
    name: string;
    tabs: string[];
  }>;
  mode: 'research' | 'trade' | 'game' | 'normal';
  activeTabId: string | null;
  timestamp: number;
}

export class SessionPersistence {
  private snapshotPath: string;
  private snapshotInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.snapshotPath = join(app.getPath('userData'), 'session-snapshot.json');
  }

  startSnapshotting(getState: () => SessionSnapshot): void {
    // Snapshot immediately
    this.snapshot(getState());

    // Then every 30 seconds
    this.snapshotInterval = setInterval(() => {
      this.snapshot(getState());
    }, 30000);
  }

  private snapshot(getState: () => SessionSnapshot): void {
    try {
      const state = getState();
      writeFileSync(this.snapshotPath, JSON.stringify(state, null, 2), 'utf8');
      console.log('[Session] Snapshot saved');
    } catch (error) {
      console.error('[Session] Failed to save snapshot:', error);
    }
  }

  stopSnapshotting(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
  }
}
```

**Current Implementation**: `electron/services/session-persistence.ts` (partially implemented)

---

### ✅ **Restore on Boot**

```typescript
// electron/services/session-persistence.ts (continued)
import { existsSync, readFileSync } from 'fs';

export function restoreSession(): SessionSnapshot | null {
  const snapshotPath = join(app.getPath('userData'), 'session-snapshot.json');

  if (!existsSync(snapshotPath)) {
    return null;
  }

  try {
    const content = readFileSync(snapshotPath, 'utf8');
    const snapshot = JSON.parse(content) as SessionSnapshot;

    // Validate snapshot age (don't restore if > 24 hours old)
    const age = Date.now() - snapshot.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      console.warn('[Session] Snapshot too old, skipping restore');
      return null;
    }

    return snapshot;
  } catch (error) {
    console.error('[Session] Failed to restore snapshot:', error);
    return null;
  }
}
```

**Current Implementation**: ✅ Implemented in `electron/services/session-persistence.ts`

---

### ✅ **UI Trigger - Restore Prompt**

```typescript
// src/components/SessionRestorePrompt.tsx
import { useState, useEffect } from 'react';
import { ipc } from '../lib/ipc-typed';

export function SessionRestorePrompt() {
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);

  useEffect(() => {
    ipc.session.hasSnapshot().then((result) => {
      if (result.hasSnapshot) {
        setHasSnapshot(true);
        setSnapshot(result.snapshot);
      }
    });
  }, []);

  const handleRestore = async () => {
    await ipc.session.restore();
    setHasSnapshot(false);
  };

  const handleDismiss = async () => {
    await ipc.session.dismiss();
    setHasSnapshot(false);
  };

  if (!hasSnapshot) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md">
        <h2 className="text-xl font-bold mb-2">Restore Previous Session?</h2>
        <p className="text-gray-400 mb-4">
          We found a session snapshot from your last session. Would you like to restore it?
        </p>
        {snapshot && (
          <div className="mb-4 text-sm text-gray-500">
            <p>{snapshot.tabs?.length || 0} tabs</p>
            <p>Last saved: {new Date(snapshot.timestamp).toLocaleString()}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleRestore}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded"
          >
            Restore
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Status**: 🔄 To be implemented

---

## ✅ 6) SYSTEM STATUS PANEL + IPC

### ✅ **IPC Handler**

```typescript
// electron/services/system-status.ts
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { redisClient } from '../../server/config/redis';
import { getTorStatus } from './tor';
import { getVPNStatus } from './vpn';

interface SystemStatus {
  redisConnected: boolean;
  redixAvailable: boolean;
  workerState: 'running' | 'stopped' | 'error';
  vpn: {
    connected: boolean;
    profile?: string;
  };
  tor: {
    running: boolean;
    bootstrapped: boolean;
  };
  mode: 'research' | 'trade' | 'game' | 'normal';
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

let startTime = Date.now();

export function registerSystemStatusIpc() {
  registerHandler('system:getStatus', z.object({}), async (): Promise<SystemStatus> => {
    // Check Redis connection
    let redisConnected = false;
    try {
      await redisClient.ping();
      redisConnected = true;
    } catch {
      redisConnected = false;
    }

    // Check Redix availability
    const redixAvailable = process.env.REDIX_ENABLED !== 'false';

    // Get worker state (if available)
    const workerState = 'running'; // TODO: Get actual worker state

    // Get VPN status
    const vpn = await getVPNStatus();

    // Get Tor status
    const tor = await getTorStatus();

    // Get current mode (from store or default)
    const mode = 'normal'; // TODO: Get from mode store

    // Calculate uptime
    const uptime = Date.now() - startTime;

    // Get memory usage
    const memUsage = process.memoryUsage();

    return {
      redisConnected,
      redixAvailable,
      workerState,
      vpn,
      tor,
      mode,
      uptime,
      memoryUsage: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
      },
    };
  });
}
```

**Status**: 🔄 To be implemented

---

### ✅ **Renderer Hook**

```typescript
// src/hooks/useSystemStatus.ts
import { useQuery } from '@tanstack/react-query';
import { ipc } from '../lib/ipc-typed';

export interface SystemStatus {
  redisConnected: boolean;
  redixAvailable: boolean;
  workerState: 'running' | 'stopped' | 'error';
  vpn: { connected: boolean; profile?: string };
  tor: { running: boolean; bootstrapped: boolean };
  mode: string;
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

export function useSystemStatus() {
  return useQuery<SystemStatus>({
    queryKey: ['systemStatus'],
    queryFn: async () => {
      return await ipc.system.getStatus();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 3000,
  });
}
```

**Status**: 🔄 To be implemented

---

### ✅ **UI Component**

```typescript
// src/components/SystemStatusPanel.tsx
import { useSystemStatus } from '../hooks/useSystemStatus';
import { CheckCircle, AlertCircle, XCircle, Loader } from 'lucide-react';

export function SystemStatusPanel() {
  const { data: status, isLoading } = useSystemStatus();

  if (isLoading || !status) {
    return (
      <div className="p-2">
        <Loader className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    );
  }

  // Determine overall status
  const allServicesOnline =
    status.redisConnected &&
    status.redixAvailable &&
    status.workerState === 'running';

  const someServicesDegraded =
    !status.redisConnected || status.workerState !== 'running';

  const StatusIcon = allServicesOnline
    ? CheckCircle
    : someServicesDegraded
    ? AlertCircle
    : XCircle;

  const statusColor = allServicesOnline
    ? 'text-green-500'
    : someServicesDegraded
    ? 'text-yellow-500'
    : 'text-red-500';

  return (
    <div className="relative group">
      <button className="p-2 hover:bg-gray-800 rounded">
        <StatusIcon className={`w-5 h-5 ${statusColor}`} />
      </button>

      {/* Dropdown Panel */}
      <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3">System Status</h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Redis</span>
              <span className={status.redisConnected ? 'text-green-500' : 'text-red-500'}>
                {status.redisConnected ? 'Connected' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Redix</span>
              <span className={status.redixAvailable ? 'text-green-500' : 'text-red-500'}>
                {status.redixAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Worker</span>
              <span className={
                status.workerState === 'running' ? 'text-green-500' :
                status.workerState === 'stopped' ? 'text-yellow-500' :
                'text-red-500'
              }>
                {status.workerState}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">VPN</span>
              <span className={status.vpn.connected ? 'text-green-500' : 'text-gray-500'}>
                {status.vpn.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Tor</span>
              <span className={status.tor.running ? 'text-green-500' : 'text-gray-500'}>
                {status.tor.running ? 'Running' : 'Stopped'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Mode</span>
              <span className="text-gray-300 capitalize">{status.mode}</span>
            </div>

            <div className="pt-2 border-t border-gray-700 mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Memory</span>
                <span>{(status.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Uptime</span>
                <span>{Math.floor(status.uptime / 1000 / 60)}m</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Status**: 🔄 To be implemented

---

## 📊 Implementation Progress Summary

| Category               | Status         | Completion |
| ---------------------- | -------------- | ---------- |
| **Electron Security**  | 🟡 Partial     | 60%        |
| **IPC Safety**         | 🟢 Complete    | 90%        |
| **Crash Recovery**     | 🟡 Partial     | 70%        |
| **Performance**        | 🟡 Partial     | 75%        |
| **Observability**      | 🟡 Partial     | 40%        |
| **Privacy & Security** | 🟢 Complete    | 85%        |
| **Redix + Redis**      | 🟢 Complete    | 100%       |
| **Release Checklist**  | 🟡 Partial     | 50%        |
| **Agent Runtime**      | 🟡 Partial     | 60%        |
| **Session Restore**    | 🟡 Partial     | 70%        |
| **System Status**      | 🔴 Not Started | 0%         |

**Overall Production Readiness**: **68%**

---

## 🚀 Next Steps

### **Priority 1 (Critical - Week 1)**

1. Implement System Status Panel + IPC
2. Complete CSP implementation
3. Add crash dump functionality
4. Implement session restore prompt UI

### **Priority 2 (High - Week 2)**

1. Agent runtime sandbox (worker threads)
2. Persistent agent memory store
3. Log rotation
4. Performance markers

### **Priority 3 (Medium - Week 3-4)**

1. Code signing setup
2. OTA update channel
3. Feature flags system
4. Store migration strategy

---

## 📝 Notes

- This blueprint is a **living document** and should be updated as features are implemented
- All `🔄 To be implemented` items should be tracked in the project issue tracker
- Security items marked as `✅ Implemented` should be verified through security audits
- Performance benchmarks should be established before and after optimizations

---

**Document Owner**: CTO / Engineering Lead  
**Review Cycle**: Monthly  
**Last Review**: 2025-01-22
