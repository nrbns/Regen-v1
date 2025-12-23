# Migration Guide: Adding Determinism to AI Operations

This guide shows how to migrate existing AI operations to use the determinism system.

## Quick Start

### Before (Non-Deterministic)

```typescript
import { aiEngine } from '@/core/ai/engine';

const result = await aiEngine.runTask({
  kind: 'research',
  prompt: 'What is AI?',
  mode: 'research',
});
```

### After (Deterministic)

```typescript
import { aiEngine } from '@/core/ai/engine';
import { withDeterminism, extractConfidence, extractSources } from '@/core/ai/withDeterminism';

const runner = withDeterminism(aiEngine.runTask.bind(aiEngine), {
  userId: getUserId(), // Get from session/store
  type: 'research',
  query: 'What is AI?',
  // Optional: extract from result
  confidence: extractConfidence(result),
  sources: extractSources(result),
  reasoning: 'User requested research query about AI',
});

const result = await runner({
  kind: 'research',
  prompt: 'What is AI?',
  mode: 'research',
});

// result.jobId is now available for tracking
console.log('Job ID:', result.jobId);
```

## Step-by-Step Migration

### 1. Identify AI Entry Points

Find all places using `aiEngine.runTask`:

```bash
grep -r "aiEngine.runTask" src/
```

### 2. Add Determinism Wrapper

For each usage:

1. Import the wrapper
2. Get userId from session/store
3. Determine type ('research', 'trade', 'analysis', 'agent', 'skill')
4. Wrap the call

### 3. Extract Confidence & Sources

After getting the result, extract confidence and sources:

```typescript
const result = await runner(...);

// Log with extracted confidence/sources
await logAIReasoning({
  jobId: result.jobId,
  userId: getUserId(),
  userInput: query,
  intent: extractIntent(result),
  confidence: extractConfidence(result),
  sources: extractSources(result),
  reasoning: 'Completed research query',
  mode: 'research'
});
```

## Integration Points

### Research Mode

**File**: `src/modes/research/index.tsx`

```typescript
// Before
const aiResult = await aiEngine.runTask({
  kind: 'search',
  prompt: query,
  mode: 'research',
});

// After
import { withDeterminism, extractConfidence, extractSources } from '@/core/ai/withDeterminism';
import { useSessionStore } from '@/state/sessionStore';

const session = useSessionStore();
const runner = withDeterminism(aiEngine.runTask.bind(aiEngine), {
  userId: session.userId || 'anonymous',
  type: 'research',
  query,
  reasoning: 'Research mode query',
});

const aiResult = await runner({
  kind: 'search',
  prompt: query,
  mode: 'research',
});
```

### Agent Console

**File**: `src/routes/AgentConsole.tsx`

```typescript
// Before
await aiEngine.runTask(
  {
    kind: 'agent',
    prompt: query,
    stream: true,
  },
  onStream
);

// After
const runner = withDeterminism(aiEngine.runTask.bind(aiEngine), {
  userId: session.userId || 'anonymous',
  type: 'agent',
  query,
  reasoning: 'Agent console query',
});

await runner(
  {
    kind: 'agent',
    prompt: query,
    stream: true,
  },
  onStream
);
```

### Page AI

**File**: `src/services/pageAI/summarizer.ts`

```typescript
// Before
const result = await aiEngine.runTask({
  kind: 'summary',
  prompt: text,
  context: { url: window.location.href },
});

// After
import { withDeterminism } from '@/core/ai/withDeterminism';

const runner = withDeterminism(aiEngine.runTask.bind(aiEngine), {
  userId: getUserId(),
  type: 'analysis',
  query: text.substring(0, 100),
  reasoning: 'Page summarization',
  sources: [window.location.href],
});

const result = await runner({
  kind: 'summary',
  prompt: text,
  context: { url: window.location.href },
});
```

## Testing

After migration, verify:

1. **Jobs are created**: Check `jobAuthority.getActiveJobs()`
2. **Events are logged**: Check `eventLedger.query({ jobId })`
3. **ActionLog shows data**: UI should display confidence + sources
4. **Resume works**: Kill process, restart, verify jobs resume

## Gradual Migration

You don't need to migrate everything at once. Priority:

1. **High Priority** (User-facing):
   - Research mode queries
   - Agent console
   - Page AI operations

2. **Medium Priority**:
   - Background tasks
   - Scheduled operations

3. **Low Priority**:
   - Internal utilities
   - Development tools

## Rollback

If you need to rollback, simply remove the `withDeterminism` wrapper:

```typescript
// Rollback: remove wrapper
const result = await aiEngine.runTask({ ... });
```

The determinism system is opt-in and won't break existing code.
