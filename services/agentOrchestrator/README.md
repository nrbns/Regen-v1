# Multi-Agent Orchestrator Service

Unified agent planning, execution, and coordination layer for Regen Browser.

## Architecture

```
User Intent (text/voice)
    ↓
Intent Router
    ↓
Agent Selector (Mail / PPT / Booking / Research / etc.)
    ↓
Agent Planner (task DAG creation)
    ↓
Approval Gate (user reviews plan)
    ↓
Agent Executor (task execution + error recovery)
    ↓
Audit Log (immutable record)
    ↓
User Result
```

## Core Components

### IntentRouter
Classifies user intent across all agents.

```typescript
interface IntentClassification {
  primaryAgent: AgentType; // 'mail' | 'ppt' | 'booking' | 'research' | 'trading'
  intent: string;
  confidence: number;
  alternativeAgents: AgentType[];
  parameters: Record<string, any>;
}

// Examples:
"Summarize my emails" → { primaryAgent: 'mail', intent: 'summarize', ... }
"Create a presentation about Q4" → { primaryAgent: 'ppt', intent: 'generate_outline', ... }
"Book me a flight" → { primaryAgent: 'booking', intent: 'search_and_book', ... }
```

### Multi-Agent Planner
Creates task DAG from intent.

```typescript
interface AgentPlan {
  planId: string;
  userId: string;
  agent: AgentType;
  intent: string;
  tasks: AgentTask[];
  estimatedRiskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  estimatedDuration: number; // seconds
  preview: Record<string, any>; // what will happen
}

// Example mail agent plan:
{
  planId: "plan_abc123",
  agent: "mail",
  intent: "summarize my emails and send drafts",
  tasks: [
    { id: "t1", type: "read_emails", params: { limit: 10 } },
    { id: "t2", type: "summarize", dependsOn: ["t1"] },
    { id: "t3", type: "draft_reply", dependsOn: ["t2"] },
    { id: "t4", type: "send_draft", dependsOn: ["t3"], requiresApproval: true }
  ],
  estimatedRiskLevel: "medium",
  requiresApproval: true,
  preview: {
    threadsToRead: 10,
    draftCount: 3,
    willSend: true
  }
}
```

### Generic Approval Handler
Standardized approval workflow for all agents.

```typescript
interface ApprovalRequest {
  planId: string;
  taskId: string;
  taskType: string; // 'send_draft', 'book_flight', 'submit_trade'
  riskLevel: 'low' | 'medium' | 'high';
  preview: Record<string, any>;
  requiresApproval: boolean;
  timeoutSeconds: number;
}

interface ApprovalResponse {
  approved: boolean;
  approvedAt: Date;
  approver: string;
  modifications?: Record<string, any>; // allow user to modify params
}
```

### Unified Executor
Orchestrates execution across all agents.

```typescript
// Execution context shared across all agents
interface ExecutionContext {
  planId: string;
  userId: string;
  agentType: AgentType;
  intermediateResults: Record<string, any>;
  errors: Record<string, Error>;
  auditTrail: AuditEntry[];
  startTime: Date;
  endTime?: Date;
}
```

## API Endpoints

### POST /api/orchestrate/intent

Parse user intent and return plan.

**Request:**
```json
{
  "userId": "alice@example.com",
  "intent": "Summarize my emails and create a presentation about Q4 sales",
  "context": {
    "currentUser": "alice@example.com",
    "timezone": "UTC"
  }
}
```

**Response:**
```json
{
  "planId": "plan_abc123",
  "agent": "mail",
  "intent": "summarize emails",
  "tasks": [...],
  "estimatedRiskLevel": "low",
  "requiresApproval": false,
  "estimatedDuration": 8,
  "preview": {...},
  "alternativeAgents": ["ppt"] // could also create slides
}
```

**Status Codes:**
- `200` — Plan created successfully
- `400` — Invalid intent format
- `401` — Unauthorized
- `429` — Rate limited

---

### POST /api/orchestrate/execute

Execute an approved plan.

**Request:**
```json
{
  "planId": "plan_abc123",
  "userId": "alice@example.com",
  "approvalToken": "eyJhbGc...",
  "modifications": {}
}
```

**Response:**
```json
{
  "executionId": "exec_xyz789",
  "planId": "plan_abc123",
  "status": "running",
  "progress": {
    "tasksCompleted": 2,
    "tasksTotal": 4,
    "currentTask": "draft_reply"
  },
  "results": {...}
}
```

---

### GET /api/orchestrate/status/{executionId}

Poll execution status.

**Response:**
```json
{
  "executionId": "exec_xyz789",
  "status": "completed",
  "progress": { "tasksCompleted": 4, "tasksTotal": 4 },
  "results": {
    "emailsRead": 10,
    "summariesCreated": 10,
    "draftsCreated": 3,
    "emailsSent": 3
  },
  "auditTrail": [...]
}
```

---

### GET /api/orchestrate/audit/{planId}

Retrieve full audit trail for a plan.

**Response:**
```json
{
  "planId": "plan_abc123",
  "audit": [
    {
      "timestamp": "2025-12-12T10:30:00Z",
      "action": "plan_created",
      "taskId": null,
      "status": "success"
    },
    {
      "timestamp": "2025-12-12T10:30:05Z",
      "action": "approval_requested",
      "taskId": "t4",
      "approved": true,
      "approvedBy": "alice@example.com"
    },
    {
      "timestamp": "2025-12-12T10:30:10Z",
      "action": "task_completed",
      "taskId": "t1",
      "result": "10 threads read"
    }
  ]
}
```

---

## Intent Template Library

20+ predefined intent templates to improve accuracy.

### Mail Agent Templates
```
"summarize my emails"
"read unread messages"
"send a reply to [person]"
"summarize emails about [topic]"
"find urgent emails"
"search for emails from [sender]"
"create a summary and send replies"
```

### PPT Agent Templates
```
"create a presentation about [topic]"
"generate slides for [meeting]"
"make a 10-slide deck about [subject]"
"create a presentation with [content]"
```

### Booking Agent Templates
```
"book me a flight to [city]"
"find hotels in [location]"
"search for car rentals"
"book a flight for [date range]"
```

### Research Agent Templates
```
"research [topic] and create a report"
"find information about [subject]"
"summarize papers about [topic]"
"build a knowledge base on [subject]"
```

### Trading Agent Templates
```
"show me quotes for [stocks]"
"what is the market sentiment on [topic]"
"analyze [company] stock"
```

---

## Error Handling & Recovery

```typescript
interface ErrorHandler {
  taskType: string;
  error: Error;
  recovered: boolean;
  retryCount: number;
  maxRetries: number;
  fallbackAction?: string; // "skip_task" | "use_default" | "ask_user"
}

// Example: if send_draft fails, fallback to "ask_user"
// → show approval UI asking if user wants to save as draft instead
```

---

## Rate Limiting & Quotas

```typescript
interface UserQuota {
  userId: string;
  plan_creations_per_hour: 100;
  executions_per_hour: 50;
  concurrent_executions: 3;
  api_calls_per_day: 10000;
  storage_gb: 5;
}
```

---

## Monitoring & Metrics

Expose Prometheus metrics:

```
regen_plan_created_total{agent_type="mail"} 150
regen_plan_execution_duration_seconds{agent_type="mail"} 3.2
regen_approval_required_total{agent_type="booking"} 45
regen_approval_approved_total{agent_type="booking"} 40
regen_task_error_total{task_type="send_draft"} 2
regen_user_quota_used{user_id="alice@example.com",quota_type="executions_per_hour"} 28
```

---

## Configuration

```yaml
# config/orchestrator.yaml
agents:
  mail:
    enabled: true
    planTimeout: 10
    maxTasks: 20
  ppt:
    enabled: true
    planTimeout: 15
    maxTasks: 30
  booking:
    enabled: true
    planTimeout: 20
    maxTasks: 25

approvals:
  timeout_seconds: 3600
  require_2fa_for: ["send_email", "execute_trade", "book_flight"]
  auto_approve_low_risk: true

quotas:
  default_plans_per_hour: 100
  default_executions_per_hour: 50
  default_concurrent_executions: 3
```

---

## Usage Example

```typescript
import { AgentOrchestrator } from './agentOrchestrator';

const orchestrator = new AgentOrchestrator();

// 1. Parse intent
const plan = await orchestrator.createPlan(userId, "Summarize my emails and send drafts");
// {
//   planId: "plan_abc",
//   agent: "mail",
//   tasks: [...],
//   requiresApproval: true,
//   preview: {...}
// }

// 2. User reviews plan in UI
// (ActionCard component shows preview)

// 3. User approves
const approvalToken = generateApprovalToken(userId, plan.planId);

// 4. Execute
const result = await orchestrator.execute(userId, plan.planId, approvalToken);
// {
//   status: "running",
//   progress: { tasksCompleted: 1, tasksTotal: 4 },
//   executionId: "exec_xyz"
// }

// 5. Poll for completion
const status = await orchestrator.getStatus(result.executionId);
// { status: "completed", results: {...} }

// 6. Audit trail
const audit = await orchestrator.getAuditTrail(plan.planId);
// Full history of plan → approval → execution
```

---

## Next Steps

1. Implement `IntentRouter` with 20+ templates
2. Build `AgentPlanner` for each agent type
3. Create generic `ApprovalHandler` UI
4. Implement `UnifiedExecutor`
5. Add rate limiting & quotas
6. Add comprehensive logging
7. Add Prometheus metrics
8. Add E2E tests

