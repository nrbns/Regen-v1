# Mail Agent MVP

**Production-ready email automation agent** — reads Gmail, summarizes with AI, drafts replies, and executes with user approval.

## 🎯 Features

✅ **Real Gmail Integration** — OAuth 2.0, thread fetching, rate limiting  
✅ **AI Summarization** — LLM-based email summaries with fallback to NLP  
✅ **Draft Reply Generation** — Multiple tone options (professional, casual, appreciative)  
✅ **Agent Planner** — Converts natural language → task DAG  
✅ **Executor** — Runs tasks with approval gates for high-risk actions  
✅ **Audit Logging** — Immutable append-only log for compliance  
✅ **Action Card UI** — React component for approval workflow  
✅ **End-to-End Tests** — Integration tests with real APIs  

## 📁 Structure

```
services/mailAgent/
├── types.ts                    # Type definitions
├── gmailConnector.ts           # Gmail API + OAuth
├── mailSummarizer.ts           # LLM-based summarization
├── draftReplyGenerator.ts      # Reply composition
├── agentPlanner.ts             # Intent → Task DAG
├── executor.ts                 # Task orchestration + approval
├── auditLog.ts                 # Immutable action log
├── examples.ts                 # Integration examples
└── __tests__/
    └── mailAgent.e2e.test.ts   # E2E tests

src/components/MailAgent/
├── ActionCard.tsx              # Approval UI component
└── MailAgentDashboard.tsx      # Main dashboard
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install googleapis @anthropic-ai/sdk
```

### 2. Configure Environment

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4.5

# Gmail OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
```

### 3. Run Examples

```bash
npx ts-node services/mailAgent/examples.ts
```

### 4. Run Tests

```bash
npm test services/mailAgent
```

## 💡 Usage Examples

### Example 1: Read & Summarize

```typescript
import { AgentPlanner } from './agentPlanner';
import { AgentExecutor } from './executor';

const planner = new AgentPlanner();
const executor = new AgentExecutor();

// Create plan from natural language
const plan = planner.createPlan('user@example.com', 'summarize my unread emails');

// Execute with auto-approval
const context = await executor.execute('user@example.com', plan, async () => true);

console.log(`Read ${context.threads.length} threads`);
console.log(`Created ${context.summaries.length} summaries`);
```

### Example 2: Draft Reply with Approval

```typescript
const plan = planner.createPlan('user@example.com', 'draft reply to latest email');

// Custom approval handler
const approvalHandler = async (req) => {
  console.log(`Approval needed for: ${req.taskType}`);
  console.log(req.preview);
  
  // Show UI modal, wait for user action
  return await getUserApproval(req);
};

const context = await executor.execute('user@example.com', plan, approvalHandler);

console.log(`Drafted ${context.drafts.length} replies`);
```

### Example 3: React UI Integration

```tsx
import { MailAgentDashboard } from './components/MailAgent/MailAgentDashboard';

function App() {
  return (
    <div className="app">
      <MailAgentDashboard />
    </div>
  );
}
```

## 🔧 API Reference

### AgentPlanner

**`createPlan(userId: string, intent: string): AgentPlan`**

Converts natural language intent into an execution plan.

```typescript
const plan = planner.createPlan('user@example.com', 'summarize emails');
// Returns: { id, intent, tasks: [...], estimatedRiskLevel, requiresApproval }
```

### AgentExecutor

**`execute(userId: string, plan: AgentPlan, approvalHandler: ApprovalHandler): Promise<ExecutionContext>`**

Executes a plan with approval gates.

```typescript
const context = await executor.execute(userId, plan, async (req) => {
  // Show approval UI
  return userApproved;
});
```

### AuditLogger

**`log(entry: AuditLogEntry): Promise<AuditLogEntry>`**

Logs an action (immutable, append-only).

```typescript
await auditLogger.log({
  planId: 'plan-123',
  userId: 'user@example.com',
  action: 'read_emails',
  status: 'completed',
  timestamp: new Date(),
});
```

**`getFullTrail(planId: string): Promise<AuditLogEntry[]>`**

Retrieves complete audit trail for a plan.

```typescript
const trail = await auditLogger.getFullTrail('plan-123');
// Returns: [{ timestamp, action, status, ... }]
```

## 🎨 UI Components

### ActionCard

Shows a single agent action with approve/reject buttons.

```tsx
<ActionCard
  plan={plan}
  onApprove={(planId) => handleApprove(planId)}
  onReject={(planId) => handleReject(planId)}
  isExecuting={false}
/>
```

### ActionCardList

Displays multiple action cards.

```tsx
<ActionCardList
  plans={pendingPlans}
  onApprove={handleApprove}
  onReject={handleReject}
  executingPlanId={currentlyExecutingId}
/>
```

## 🔐 Security

- **OAuth 2.0** for Gmail access
- **Approval gates** for high-risk actions (sending emails)
- **Audit logging** for compliance
- **Rate limiting** to prevent quota exhaustion
- **Token refresh** automatic handling

## 📊 Risk Levels

| Level | Description | Requires Approval |
|-------|-------------|-------------------|
| **Low** | Read-only operations (read, summarize) | ❌ Auto-execute |
| **Medium** | Draft creation | ✅ Optional |
| **High** | Sending emails, archiving, deleting | ✅ Required (2FA recommended) |

## 🧪 Testing

### Unit Tests

```bash
npm test services/mailAgent
```

### E2E Tests (requires credentials)

```bash
# Set test credentials
export GMAIL_TEST_TOKEN=...
export ANTHROPIC_API_KEY=...

npm test services/mailAgent/__tests__/mailAgent.e2e.test.ts
```

### Test Coverage

- Intent classification ✅
- Plan creation ✅
- Approval flow ✅
- Execution context ✅
- Audit logging ✅
- Error handling ✅
- Performance benchmarks ✅

## 🚦 Performance

- **Plan creation**: < 100ms
- **Single email summary**: ~2-3s (with LLM)
- **Draft generation**: ~2-4s (with LLM)
- **Audit log query**: < 10ms (in-memory)

## 📈 Next Steps

1. **Token Vault** — Secure storage for OAuth tokens (HashiCorp Vault)
2. **Vector DB** — RAG for email context (Milvus/Weaviate)
3. **2FA** — Multi-factor auth for high-risk actions
4. **Webhooks** — Real-time email notifications via Gmail push
5. **Analytics** — User behavior tracking & usage metrics
6. **Multi-provider** — Support Outlook, IMAP

## 📝 License

MIT

---

**Built for Regen Browser** — The agentic execution OS
