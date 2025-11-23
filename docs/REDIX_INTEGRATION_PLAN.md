# Redix Integration Plan - File-by-File

## Overview

This document shows exactly how to integrate Redix (Redis) as Pillar 6 - the execution engine that makes OmniBrowser unbeatable.

---

## File Structure

```
server/
├── config/
│   └── redis.js                    # ✅ Existing - Redis connection
│
├── services/
│   └── redix/
│       ├── index.js                # ✅ NEW - Main entry point
│       ├── event-bus.js            # ✅ NEW - Pub/Sub events
│       ├── command-queue.js        # ✅ NEW - Streams for commands
│       ├── session-store.js        # ✅ NEW - Session/memory store
│       ├── workflow-orchestrator.js # ✅ NEW - BullMQ integration
│       ├── automation-triggers.js   # ✅ NEW - Real-time triggers
│       └── fail-safe.js            # ✅ NEW - Retry/recovery
│
└── redix-server.js                 # ✅ UPDATED - Added Redix endpoints
```

---

## Integration Steps

### Step 1: Update Existing Code to Use Redix

#### A. Update Regen Core to Use Event Bus

**File:** `electron/services/regen/core.ts`

```typescript
// Add at top
import { eventBus } from '../../../server/services/redix';

// In handleMessage, after generating response:
await eventBus.publishRegenStatus(msg.sessionId, {
  status: 'processing',
  message: 'Handling your request...',
});

// After response generated:
await eventBus.publishRegenStatus(msg.sessionId, {
  status: 'complete',
  message: response.text,
});
```

#### B. Update Browser Tools to Use Command Queue

**File:** `electron/services/regen/tools/browserTools.ts`

```typescript
// Add import
import { commandQueue } from '../../../server/services/redix/command-queue';

// In scrollTab, before executing:
if (sessionId) {
  await commandQueue.enqueueCommand(tabId, {
    action: 'SCROLL',
    params: { amount, direction: 'down' },
    id: `scroll-${Date.now()}`,
  });
}
```

#### C. Update Session Management to Use Redix

**File:** `electron/services/regen/session.ts`

```typescript
// Replace in-memory storage with Redix
import { sessionStore } from '../../../server/services/redix/session-store';

export function getSession(sessionId: string): RegenSession {
  // Use Redix instead of Map
  return (await sessionStore.getSession(sessionId)) || createDefaultSession(sessionId);
}

export function updateSessionLanguage(sessionId: string, lang: LanguageCode): void {
  await sessionStore.updateSessionField(sessionId, 'lastUserLanguage', lang);
}
```

---

### Step 2: Add Real-Time Event Listeners

#### A. Electron Main Process

**File:** `electron/main.ts`

```typescript
import { eventBus } from '../server/services/redix/event-bus';

// Subscribe to browser commands
eventBus.subscribe(`commands:${windowId}`, event => {
  if (event.type === 'browser_command') {
    // Execute command in browser
    executeBrowserCommand(event.command);
  }
});

// Subscribe to automation triggers
eventBus.subscribe(`automation:triggers:${userId}`, event => {
  // Show notification
  // Execute automation
});
```

#### B. Frontend WebSocket Client

**File:** `src/lib/redix-client.ts` (NEW)

```typescript
// WebSocket client that connects to Redix event bus
export class RedixClient {
  private ws: WebSocket | null = null;

  connect(sessionId: string) {
    this.ws = new WebSocket(`ws://localhost:4000/ws?sessionId=${sessionId}`);

    this.ws.onmessage = event => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'regen_status':
        // Update UI with status
        break;
      case 'browser_command':
        // Execute command
        break;
      case 'automation_trigger':
        // Show notification
        break;
    }
  }
}
```

---

### Step 3: Integrate Workflow Orchestrator

#### A. Update n8n Tools

**File:** `electron/services/regen/tools/n8nTools.ts`

```typescript
import { workflowOrchestrator } from '../../../server/services/redix/workflow-orchestrator';

export async function runWorkflow(workflowId: string, payload: any): Promise<N8NWorkflowResult> {
  // Enqueue workflow job
  const jobId = await workflowOrchestrator.enqueueWorkflow(
    'n8n-workflows',
    {
      workflowId,
      payload,
    },
    {
      priority: 1,
    }
  );

  // Wait for result (or return jobId for async)
  const status = await workflowOrchestrator.getJobStatus('n8n-workflows', jobId);

  return {
    success: status.state === 'completed',
    data: status.result,
    executionId: jobId,
  };
}
```

#### B. Create Workflow Worker

**File:** `server/workers/n8n-worker.js` (NEW)

```javascript
const { workflowOrchestrator } = require('../services/redix/workflow-orchestrator');
const { runWorkflow } = require('../api/regen-controller');

// Create worker
const worker = workflowOrchestrator.createWorkflowWorker('n8n-workflows', async jobData => {
  const { workflowId, payload } = jobData;

  // Call n8n
  const result = await runWorkflow(workflowId, payload);

  return result;
});
```

---

### Step 4: Add Automation Trigger Processor

**File:** `server/workers/automation-processor.js` (NEW)

```javascript
const { automationTriggers } = require('../services/redix/automation-triggers');
const { executeAutomation } = require('./automation-executor');

// Start processor
const processor = automationTriggers.startTriggerProcessor(async event => {
  // Execute automation based on trigger
  await executeAutomation(event.automationId, event.data);
});
```

---

### Step 5: Update API Endpoints

**File:** `server/redix-server.js` (UPDATED)

Already added:

- `/api/redix/health` - Health check
- `/api/redix/queue/:tabId/command` - Enqueue command
- `/api/redix/queue/:tabId` - Read commands
- `/api/redix/queue/:tabId/ack` - Acknowledge command

---

## Testing

### Test Event Bus

```bash
# Publish event
curl -X POST http://localhost:4000/api/redix/event \
  -H "Content-Type: application/json" \
  -d '{"channel": "test", "event": {"type": "test", "data": "hello"}}'
```

### Test Command Queue

```bash
# Enqueue command
curl -X POST http://localhost:4000/api/redix/queue/tab-123/command \
  -H "Content-Type: application/json" \
  -d '{"action": "SCROLL", "params": {"amount": 500}}'

# Read commands
curl http://localhost:4000/api/redix/queue/tab-123
```

### Test Session Store

```javascript
const { sessionStore } = require('./server/services/redix/session-store');

// Save session
await sessionStore.saveSession('session-123', {
  language: 'ta',
  mode: 'research',
});

// Get session
const session = await sessionStore.getSession('session-123');
```

---

## Benefits

### 1. Real-Time

- Zero-latency communication
- No polling
- Smooth streaming

### 2. Reliability

- Retry logic
- Crash recovery
- Dead-letter queues

### 3. Scalability

- 1000+ parallel automations
- No blocking
- Backpressure control

### 4. Uniqueness

- No browser has this
- Impossible to compete
- Secret weapon

---

**Redix integration makes OmniBrowser the world's first real-time execution browser! 🚀**
