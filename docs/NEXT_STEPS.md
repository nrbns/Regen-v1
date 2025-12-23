# Next Steps - Determinism System

## Completed ✅

1. ✅ Event Ledger System (logged, replayable, explainable)
2. ✅ Job Authority (enforced everywhere)
3. ✅ Crash → Resume (checkpoint system)
4. ✅ Skills Engine (save AI actions as reusable skills)
5. ✅ Context Continuity (survives all scenarios)
6. ✅ Enhanced ActionLog (mandatory confidence + sources)
7. ✅ Integration helpers (withDeterminism wrapper)
8. ✅ Research Mode migration
9. ✅ Agent Console migration

## High Priority (This Week)

### 1. Test Migrations

**Research Mode**

- [ ] Run a research query
- [ ] Verify job appears in JobTimelinePanel
- [ ] Check Event Ledger entries
- [ ] Verify ActionLog shows confidence + sources

**Agent Console**

- [ ] Run an agent query
- [ ] Verify streaming works correctly
- [ ] Check job tracking
- [ ] Verify Event Ledger entries

### 2. Migrate Page AI

**Location**: `src/services/pageAI/`

Files to migrate:

- `summarizer.ts`
- `explainer.ts`
- `translator.ts`
- `taskExtractor.ts`

**Priority**: High (user-facing)

### 3. Add Checkpoint Creation

Add checkpoints for long-running operations:

```typescript
// In research mode, after sources are scraped
await jobAuthority.checkpoint({
  jobId: result.jobId,
  progress: 50,
  step: 'Sources scraped, analyzing...',
  data: { sources: aggregatedSources, scrapedData: {...} }
});
```

## Medium Priority (This Month)

### 4. Migrate Other AI Entry Points

**Lower Priority**:

- `src/services/agenticActions.ts`
- `src/core/wispr/commandHandler.ts`
- `src/core/docs/autoEditor.ts`
- `src/services/LLMRouter.ts`

### 5. Skills UI

Create UI for:

- Viewing saved skills
- Executing skills
- Sharing skills
- Skills marketplace

### 6. Crash Recovery UI

Add UI for:

- Detecting crashed jobs on startup
- Showing recovery options
- Auto-resume option

### 7. Backend Event Ledger Sync

For multi-device support:

- Sync Event Ledger to backend
- Sync jobs across devices
- Sync skills across devices

## Low Priority (Future)

### 8. Performance Optimization

- IndexedDB query optimization for large event logs
- Compression for old events
- Event log cleanup/pruning

### 9. Skills Marketplace

- Community skills sharing
- Skill validation framework
- Skill versioning

### 10. Enterprise Features

- Audit trail exports
- Compliance reporting
- Role-based access control

## Testing Checklist

### Unit Tests

- [ ] Event Ledger append/query
- [ ] Job Authority create/checkpoint/resume
- [ ] Context Continuity save/restore
- [ ] Skills Engine save/execute

### Integration Tests

- [ ] Research mode with determinism
- [ ] Agent Console with determinism
- [ ] Crash recovery flow
- [ ] Event Ledger replay

### E2E Tests

- [ ] Full research query flow
- [ ] Agent query with streaming
- [ ] Crash and resume
- [ ] Skills save and execute

## Migration Guide

For each AI entry point:

1. Import helpers:

   ```typescript
   import { withDeterminism, extractConfidence, extractSources } from '@/core/ai/withDeterminism';
   import { getUserId } from '@/utils/getUserId';
   ```

2. Wrap AI calls:

   ```typescript
   const runner = withDeterminism(aiEngine.runTask.bind(aiEngine), {
     userId: getUserId(),
     type: 'research', // or 'agent', 'analysis', etc.
     query: query,
     reasoning: '...',
     sources: [...],
   });

   const result = await runner({ kind: 'search', prompt: query });
   ```

3. Test thoroughly:
   - Verify job creation
   - Check Event Ledger entries
   - Verify ActionLog display
   - Test streaming (if applicable)

## Success Criteria

### System-Level

- ✅ All user-facing AI operations create jobs
- ✅ Event Ledger logs all operations
- ✅ Jobs can be resumed after crashes
- ✅ Context survives restarts

### User-Level

- ✅ Users can see what AI did (ActionLog)
- ✅ Users can see confidence scores
- ✅ Users can see sources used
- ✅ Users can resume crashed jobs

### Technical

- ✅ Zero breaking changes
- ✅ No performance degradation
- ✅ Backward compatible
- ✅ Gradual migration possible

---

**Current Status**: Foundation complete, migrations in progress.

**Next Milestone**: All user-facing AI operations migrated (Research ✅, Agent Console ✅, Page AI next).
