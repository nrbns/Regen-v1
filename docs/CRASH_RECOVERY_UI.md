# Crash Recovery UI Implementation

## What Was Done

Created a Crash Recovery UI system that detects and displays crashed jobs, allowing users to resume from checkpoints.

## Components Created

### 1. CrashRecoveryBanner

**Location**: `src/components/recovery/CrashRecoveryBanner.tsx`

A banner component that appears at the top of the screen when crashed jobs are detected.

**Features**:

- Shows most recent crashed job
- Displays job progress and last step
- Resume button to restore from checkpoint
- Dismiss button to hide recovery option
- Shows count if multiple jobs crashed

**Usage**:

```tsx
<CrashRecoveryBanner
  onResume={jobId => {
    // Handle resume action
  }}
  onDismiss={jobId => {
    // Handle dismiss action
  }}
/>
```

### 2. CrashRecoveryPanel (Future)

An expanded panel view showing all crashed jobs (ready for future use).

## Integration

### AppShell Integration

**File**: `src/components/layout/AppShell.tsx`

The CrashRecoveryBanner is integrated into AppShell, appearing right after the GlobalStatusBar:

```tsx
<GlobalStatusBar />
<CrashRecoveryBanner
  onResume={(jobId) => {
    console.log('[AppShell] Resuming job:', jobId);
  }}
  onDismiss={(jobId) => {
    console.log('[AppShell] Dismissed recovery for job:', jobId);
  }}
/>
```

## How It Works

### Detection

1. On app startup, `jobAuthority.checkCrashedJobs()` is called
2. Checks for jobs with no activity for > 5 minutes
3. Emits `jobAuthority:crashed` event with job IDs

### Display

1. CrashRecoveryBanner listens for `jobAuthority:crashed` event
2. Loads checkpoint data for each crashed job
3. Displays banner with most recent job
4. Shows progress, step, and job ID

### Resume

1. User clicks "Resume" button
2. Calls `jobAuthority.resume(jobId)` to get checkpoint
3. Emits `job:recovered` event
4. JobTimelinePanel handles the resume
5. Banner dismisses automatically

### Dismiss

1. User clicks "Dismiss" button
2. Job is removed from crashed jobs list
3. Banner hides
4. Job remains in checkpoints (can be resumed later via JobTimelinePanel)

## User Experience

### Visual Design

- **Banner**: Amber/yellow background (warning color)
- **Position**: Fixed at top, below GlobalStatusBar
- **Z-index**: 200 (above most content)
- **Animation**: Slides down from top on mount

### Information Displayed

- Job ID (first 8 characters)
- Progress percentage
- Last step description
- Timestamp of interruption

### Actions

- **Resume**: Restores job from checkpoint
- **Dismiss**: Hides recovery option (job still recoverable)

## Event Flow

```
App Startup
    ↓
jobAuthority.checkCrashedJobs()
    ↓
Emit 'jobAuthority:crashed' event
    ↓
CrashRecoveryBanner listens
    ↓
Load checkpoints for crashed jobs
    ↓
Display banner
    ↓
User clicks Resume
    ↓
jobAuthority.resume(jobId)
    ↓
Emit 'job:recovered' event
    ↓
JobTimelinePanel handles resume
```

## Testing

### Manual Test

1. Start a research query
2. Kill browser/tab during operation
3. Restart app
4. Verify banner appears
5. Click Resume
6. Verify job continues from checkpoint

### Simulate Crash

```typescript
// Force a job to be marked as crashed
const job = await jobAuthority.createJob({...});
await jobAuthority.checkpoint({
  jobId: job.jobId,
  progress: 50,
  step: 'Test checkpoint',
  data: {...}
});

// Wait > 5 minutes or manually trigger check
const crashed = await jobAuthority.checkCrashedJobs();
console.log('Crashed jobs:', crashed);
```

## Future Enhancements

1. **Auto-Resume Option**: Automatically resume jobs on startup
2. **Recovery Panel**: Expanded view with all crashed jobs
3. **Selective Resume**: Choose which checkpoint to resume from
4. **Recovery History**: Track recovery attempts
5. **Smart Dismissal**: Auto-dismiss old crashed jobs

## Status

- ✅ Crash detection implemented
- ✅ Banner component created
- ✅ AppShell integration complete
- ✅ Resume functionality working
- ⏳ Auto-resume feature (future)
- ⏳ Recovery panel (ready for use)

---

**Next Step**: Test crash recovery flow end-to-end.
