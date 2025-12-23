# Determinism System - Quick Reference

This is the foundation that makes Regen unbeatable.

## Quick Start

```typescript
import {
  eventLedger,
  jobAuthority,
  contextContinuity,
  skillsEngine,
  withDeterminism
} from '@/core/determinism';

// 1. Create a job for AI operation
const job = await jobAuthority.createJob({
  userId: 'user-123',
  type: 'research',
  query: 'What is AI?'
});

// 2. Execute AI operation with determinism
const runner = withDeterminism(aiEngine.runTask.bind(aiEngine), {
  userId: 'user-123',
  type: 'research',
  query: 'What is AI?',
  confidence: 0.9,
  sources: ['source1', 'source2'],
  reasoning: 'User requested research query'
});

const result = await runner({ kind: 'search', prompt: 'What is AI?' });
// result.jobId is available for tracking

// 3. Save context
await contextContinuity.save({
  userId: 'user-123',
  mode: 'research',
  tabs: [...],
  activeJobs: [job.jobId],
  conversation: [...],
  memory: {...}
});

// 4. Save as skill (optional)
const skill = await skillsEngine.saveFromJob(result.jobId, {
  name: 'Research Topic',
  description: 'Research a topic and summarize'
});
```

## Core Concepts

### 1. Event Ledger

Every AI action is logged. Can replay entire sessions.

```typescript
// Log event
await eventLedger.log({
  type: 'ai:action:start',
  jobId: 'job-123',
  userId: 'user-123',
  data: { action: 'research', query: '...' },
  confidence: 0.95,
  sources: ['source1'],
  reasoning: 'User requested research',
});

// Replay events
const replay = await eventLedger.replay('job-123');
console.log('Final state:', replay.finalState);
```

### 2. Job Authority

All AI operations go through jobs. Jobs are resumable.

```typescript
// Create job
const job = await jobAuthority.createJob({ userId, type: 'research', query });

// Create checkpoint
await jobAuthority.checkpoint({
  jobId: job.jobId,
  progress: 50,
  step: 'Analyzing sources',
  data: { sources: [...], analysis: {...} }
});

// Resume from checkpoint
const checkpoint = await jobAuthority.resume(job.jobId);
```

### 3. Context Continuity

Context survives mode switches, reconnects, restarts.

```typescript
// Save context
await contextContinuity.save({ userId, mode: 'research', ... });

// Restore on startup
const context = await contextContinuity.restore(userId);

// Switch mode (preserves context)
await contextContinuity.switchMode('trade');
```

### 4. Skills Engine

Save AI actions as reusable skills.

```typescript
// Save skill from job
const skill = await skillsEngine.saveFromJob('job-123', {
  name: 'Research Skill',
  description: 'Research a topic',
});

// Execute skill
const result = await skillsEngine.execute('skill-123', {
  topic: 'AI',
});
```

## Migration Guide

See `src/core/ai/MIGRATION_GUIDE.md` for detailed migration steps.

Quick migration:

```typescript
// Before
const result = await aiEngine.runTask({ kind: 'search', prompt: query });

// After
import { withDeterminism } from '@/core/determinism';
import { getUserId } from '@/utils/getUserId';

const runner = withDeterminism(aiEngine.runTask.bind(aiEngine), {
  userId: getUserId(),
  type: 'research',
  query,
  reasoning: 'Research query',
});

const result = await runner({ kind: 'search', prompt: query });
```

## Testing

```typescript
// Test determinism
const result = await executeAIOperation(...);
const replay = await eventLedger.replay(result.jobId);
assert.deepEqual(replay.finalState, expectedState);

// Test context continuity
await contextContinuity.save(context);
const restored = await contextContinuity.restore(userId);
assert.deepEqual(restored, context);

// Test crash recovery
await jobAuthority.checkpoint({ jobId, progress: 50, ... });
const checkpoint = await jobAuthority.resume(jobId);
assert.equal(checkpoint.progress, 50);
```

## Architecture

```
User Action
    ↓
Job Authority (create job)
    ↓
AI Integration (executeAIOperation)
    ↓
Event Ledger (log everything)
    ↓
ActionLog UI (show confidence, sources, reasoning)
```

## Key Benefits

- ✅ **Determinism**: Every action logged, replayable, explainable
- ✅ **Resumability**: Jobs can resume after crashes
- ✅ **Transparency**: Full audit trail, confidence scores, sources
- ✅ **Reusability**: Skills turn actions into capabilities
- ✅ **Context Continuity**: Never lose context

---

**This is how you build something they structurally cannot copy.**
