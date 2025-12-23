# Checkpoint Implementation - Crash Recovery

## What Was Done

Added checkpoint creation to Research mode to enable crash recovery for long-running operations.

## Implementation Details

### Checkpoint Locations

Checkpoints are created at three key points in the Research pipeline:

1. **After Sources Aggregated** (Progress: 30%)
   - When sources are found and ready for analysis
   - Saves: source list, source count, query

2. **After AI Analysis** (Progress: 70%)
   - When AI analysis completes
   - Saves: answer preview, source count, provider/model info

3. **Before Final Result** (Progress: 95%)
   - Right before setting the final result
   - Saves: final answer, source count, query

### Code Changes

**File**: `src/modes/research/index.tsx`

1. **Capture jobId from deterministicRunner result**

   ```typescript
   const aiResultWithJob = await deterministicRunner(...);
   currentJobId = 'jobId' in aiResultWithJob ? aiResultWithJob.jobId : currentJobId;
   ```

2. **Create checkpoints at key points**
   ```typescript
   if (currentJobId) {
     await jobAuthority.checkpoint({
       jobId: currentJobId,
       progress: 30,
       step: `Found ${aggregatedSources.length} sources, analyzing...`,
       data: { sources: [...], sourceCount: ..., query: ... },
     });
   }
   ```

## How It Works

### Checkpoint Creation

1. Job is created when `deterministicRunner` is called
2. JobId is captured from the result
3. Checkpoints are created at key milestones
4. Checkpoints persist to localStorage for crash recovery

### Crash Recovery

When the app restarts:

1. `jobAuthority.checkCrashedJobs()` detects stale jobs
2. User sees recovery options in UI (to be implemented)
3. Job can be resumed from last checkpoint
4. Context is restored from checkpoint data

## Usage

### Manual Resume

```typescript
import { jobAuthority } from '@/core/jobAuthority';

// Get checkpoint
const checkpoint = await jobAuthority.resume('job-123');

if (checkpoint) {
  console.log('Resume from:', checkpoint.progress, '%');
  console.log('Last step:', checkpoint.step);
  console.log('Data:', checkpoint.data);

  // Restore state from checkpoint.data
  // Continue from checkpoint.step
}
```

### Auto-Resume (Future)

```typescript
// On startup
const crashedJobs = await jobAuthority.checkCrashedJobs();

for (const jobId of crashedJobs) {
  const checkpoint = await jobAuthority.resume(jobId);
  if (checkpoint) {
    // Show recovery UI
    // Auto-resume option
  }
}
```

## Benefits

1. **Crash Recovery**: Jobs can resume after crashes
2. **Progress Preservation**: User doesn't lose work
3. **State Restoration**: Full context saved in checkpoints
4. **Transparency**: Users can see progress milestones

## Future Enhancements

1. **Auto-Resume UI**: Automatically offer to resume crashed jobs
2. **Checkpoint Visualization**: Show progress milestones in UI
3. **Selective Resume**: Let users choose which checkpoint to resume from
4. **Checkpoint Cleanup**: Remove old checkpoints after job completion

## Testing

To test checkpoint creation:

1. **Start a research query**

   ```typescript
   // Run a research query
   // Check localStorage for checkpoint data
   ```

2. **Simulate crash**

   ```typescript
   // Kill browser/tab during research
   // Restart app
   ```

3. **Resume job**
   ```typescript
   import { jobAuthority } from '@/core/jobAuthority';
   const checkpoint = await jobAuthority.resume(jobId);
   console.log('Checkpoint:', checkpoint);
   ```

## Status

- ✅ Checkpoint creation implemented
- ✅ Checkpoints saved to localStorage
- ⏳ Crash recovery UI (pending)
- ⏳ Auto-resume feature (pending)

---

**Next Step**: Implement crash recovery UI to show recovery options to users.
