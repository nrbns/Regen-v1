# PHASE 2: JOB LIFECYCLE UI/UX
## Building Trust Components (Days 6-10)

**Status:** PLANNING  
**Duration:** 5 days  
**Goal:** Users see job progress, can pause/resume, understand recovery

---

## 🎯 Overview

PHASE 1 built the **invisible** foundation (database layer, health monitoring).  
PHASE 2 builds the **visible** trust layer (UI components, recovery flows).

When a job runs, user needs to:
1. See real-time progress (% complete, current step)
2. Understand job status (running/paused/failed)
3. Control the job (pause, cancel, retry)
4. Know recovery options (resume from checkpoint, restart)

---

## 📋 PHASE 2 Breakdown

### Component 1: StatusBar Component
**File:** `apps/desktop/src/components/StatusBar.tsx`  
**Purpose:** Current job status in UI header

**Features:**
- Active job indicator (pill: "Research: 45%")
- Progress bar (visual %complete)
- Pause button (if running)
- Cancel button (red X)
- Stop button (disconnect from job)
- Timestamp (job created, elapsed time)

**Props:**
```typescript
interface StatusBarProps {
  jobId: string;
  job: JobRecord;
  onPause: () => void;
  onCancel: () => void;
  onStop: () => void;
}
```

**Behavior:**
- Updates via Socket.IO `job:progress` events
- Show "paused" state with resume button
- Show error state with red background
- Collapse when no active job

---

### Component 2: TaskTimeline Component
**File:** `apps/desktop/src/components/TaskTimeline.tsx`  
**Purpose:** Job history sidebar (research, trades completed today)

**Features:**
- Timeline of all jobs (user's jobs)
- Filter by: all, research, trade, analysis
- Status badges (running 🟢, completed ✅, failed ❌)
- Sort by: recent, oldest, by status
- Click to view details (opens JobDetails modal)
- Pin favorite jobs

**Props:**
```typescript
interface TaskTimelineProps {
  jobs: JobRecord[];
  selectedJobId?: string;
  onSelectJob: (jobId: string) => void;
  onResumeJob: (jobId: string) => void;
}
```

**Data Flow:**
1. On mount: `jobRepository.getUserJobs(userId, 100)`
2. Listen: Socket.IO events update list
3. Click job: show details or resume if paused

---

### Component 3: ErrorBanner Component
**File:** `apps/desktop/src/components/ErrorBanner.tsx`  
**Purpose:** Job error + recovery suggestions

**Features:**
- Displays error message
- Suggests recovery path:
  - If checkpoint available: "Resume from last step"
  - If no checkpoint: "Start over"
- Action buttons (Resume, Restart, Discard)
- Collapsible error details (stack trace)
- Auto-dismiss after 30s (or keep if critical)

**Props:**
```typescript
interface ErrorBannerProps {
  jobId: string;
  error: string;
  recoveryOptions: RecoveryOptions;
  onResume: () => void;
  onRestart: () => void;
  onDismiss: () => void;
}
```

**Behavior:**
- Show after job fails
- Call `jobRecoveryHandler.getRecoveryOptions(jobId)`
- Display based on recovery availability
- Track if user chose resume vs restart

---

### Component 4: RecoveryToast Component
**File:** `apps/desktop/src/components/RecoveryToast.tsx`  
**Purpose:** Job recovered/paused notification

**Features:**
- Toast notification (bottom-right)
- Message: "Job paused - click to resume"
- Progress so far (e.g., "45% complete")
- Quick action button (Resume)
- Time remaining estimate
- Auto-dismiss after 10s (clickable to keep)

**Props:**
```typescript
interface RecoveryToastProps {
  jobId: string;
  reason: 'worker_stalled' | 'user_paused' | 'network_error';
  progress: number;
  onResume: () => void;
  onDismiss: () => void;
}
```

**Trigger:** 
- `job:recovery` event from supervisor
- Or explicit pause action

---

### Component 5: JobDetails Modal
**File:** `apps/desktop/src/components/JobDetailsModal.tsx`  
**Purpose:** Full job inspection (debugging)

**Features:**
- Job metadata (ID, type, created, elapsed)
- Full progress history (step-by-step)
- Checkpoint details (if exists)
- Error message + stack trace (if failed)
- Raw job record (JSON viewer, collapsible)
- Actions (Resume, Restart, Delete)
- Copy buttons (for error reports)

**Sections:**
1. Overview (status, progress, timeline)
2. Progress Steps (list of all steps taken)
3. Checkpoint (keys, size, sample data)
4. Error (message, stack, context)
5. Raw Data (full job record JSON)

---

### Component 6: PauseButton Integration
**File:** `apps/desktop/src/components/JobControls.tsx`  
**Purpose:** Pause/Resume/Cancel UI

**Features:**
- Pause button (only if running)
  - Call `jobRepository.pause(jobId)`
  - Shows toast "Job paused"
  - Auto-save checkpoint
- Resume button (only if paused)
  - Call `jobRecoveryHandler.resumeJob(jobId)`
  - Show progress toast "Resuming..."
  - Auto-subscribe to updates
- Cancel button (if running or paused)
  - Call `jobRepository.cancel(jobId)`
  - Confirmation dialog

---

## 🔄 Integration Flow

### When Job Starts
```
User: "Research quantum computing"
  ↓
UI calls jobRepository.createResearchJob(query)
  ↓
StatusBar shows "Research: 0%" (created state)
  ↓
Socket.IO connects (subscribe:job event)
  ↓
StatusBar shows "Research: 5%" (running)
TaskTimeline adds job to list
```

### When Job Crashes
```
Worker crashes → no heartbeat for 30s
  ↓
Supervisor detects stalled job
  ↓
Supervisor calls jobRepository.pause(jobId) [if checkpoint]
  ↓
Realtime emits job:recovery event
  ↓
RecoveryToast shows "Job paused - click to resume"
  ↓
User clicks Resume
  ↓
jobRecoveryHandler.resumeJob(jobId) loads checkpoint
  ↓
StatusBar shows "Research: 45% (resumed)"
  ↓
Job continues from step it was on
```

### When User Pauses
```
User clicks Pause button
  ↓
UI calls jobRepository.pause(jobId)
  ↓
StatusBar shows "Research: 45% (paused)"
  ↓
TaskTimeline highlights job with pause icon
  ↓
RecoveryToast: "Job paused - click to resume"
  ↓
Checkpoint automatically saved by repository.pause()
  ↓
User can close app, come back later
  ↓
Job stays in taskTimeline with "resume" badge
```

---

## 📐 Data Flow Architecture

```
Socket.IO Events             Components
─────────────────            ──────────
job:progress        →        StatusBar (updates %)
job:recovery        →        RecoveryToast
job:failed          →        ErrorBanner
job:completed       →        TaskTimeline + confetti
user:notification   →        Generic Toast
sync:complete       →        (internal, for backlog replay)

Repository Methods           Components
──────────────────           ──────────
pause(jobId)         →       PauseButton
resume(jobId)        →       RecoveryToast
cancel(jobId)        →       JobControls
getUserJobs()        →       TaskTimeline (on mount)
getJob()             →       JobDetailsModal
```

---

## 🎨 UI Layout Suggestion

```
┌─────────────────────────────────────────────────┐
│ HEADER                          [StatusBar]      │
│                          Research: 45% ████░ ⏸ ✕│
├─────────────────────────────────────────────────┤
│                                                  │
│                   MAIN CONTENT                   │
│                                                  │
│                                                  │
├──────────────────────────────┬──────────────────┤
│ MAIN                         │ SIDEBAR          │
│ (Browser/Research/Trading)   │ TaskTimeline     │
│                              │                  │
│                              │ ✅ Completed     │
│                              │ 🟢 Running       │
│                              │ 🟡 Paused        │
│                              │ ❌ Failed        │
│                              │                  │
└──────────────────────────────┴──────────────────┘

Bottom-Right:
┌─────────────────────────────┐
│ 🔄 Job Resumed              │ ← RecoveryToast
│ Click to view              │
└─────────────────────────────┘

Top-Center (on error):
┌─────────────────────────────────────────────────┐
│ ❌ Job Failed: Worker timeout                   │
│ Checkpoint saved. [Resume] or [Start Over]      │ ← ErrorBanner
└─────────────────────────────────────────────────┘
```

---

## 📝 Implementation Order

### Day 6: Foundations
- [ ] Setup component scaffolding
- [ ] Create StatusBar (basic progress bar)
- [ ] Connect to Socket.IO job:progress events
- [ ] Test with manual job creation

### Day 7: Timeline & Controls
- [ ] Create TaskTimeline (list of jobs)
- [ ] Implement filtering/sorting
- [ ] Add Pause/Resume buttons
- [ ] Create JobControls component

### Day 8: Recovery
- [ ] Create RecoveryToast
- [ ] Create ErrorBanner
- [ ] Hook up supervisor events
- [ ] Test pause/resume flow

### Day 9: Details & Polish
- [ ] Create JobDetailsModal
- [ ] Checkpoint inspection UI
- [ ] Error stack traces
- [ ] Copy buttons, JSON viewer

### Day 10: Integration & Testing
- [ ] Full flow testing (create → pause → resume)
- [ ] Error scenarios
- [ ] Network disconnection
- [ ] Edge cases (rapid clicks, etc)

---

## 🧪 Testing Checklist

- [ ] Job starts → StatusBar shows progress
- [ ] Worker crashes → RecoveryToast appears
- [ ] User clicks Resume → jobRecoveryHandler.resumeJob called
- [ ] Job checkpoint loaded → continues from step
- [ ] User pauses → jobRepository.pause called
- [ ] Job stays paused after refresh (localStorage)
- [ ] Resume after app restart works
- [ ] Multiple jobs in timeline work independently
- [ ] Error messages clear and actionable
- [ ] Timestamps accurate (created, elapsed, etc)

---

## 🔐 Safety Considerations

### Checkpoint Integrity
- Validate checkpoint before resume
- Show warning if checkpoint suspicious
- Allow "discard checkpoint" option

### User Confirmations
- Confirm before cancel (destructive)
- Warn if job has unsaved progress
- Show time estimate for restart

### Error Transparency
- Don't hide errors behind generic messages
- Show full error if user requests details
- Allow error reporting/feedback

---

## 🚀 Success Criteria

1. **User can see job progress in real-time**
   - StatusBar updates within 1s of server event
   - Progress bar reflects % accurately

2. **User can pause and resume jobs**
   - Pause saves checkpoint
   - Resume loads checkpoint and continues
   - No data loss between sessions

3. **User understands what happened on error**
   - Clear error message displayed
   - Recovery options suggested
   - Can choose resume or restart

4. **Job history is visible and navigable**
   - TaskTimeline shows all user jobs
   - Can filter and sort
   - Can click to view details

5. **All components integrate without bugs**
   - No console errors
   - No race conditions
   - State stays consistent

---

## 📊 Metrics to Track

- **Progress Update Latency:** <1s (time from server emit to UI update)
- **Component Render Time:** <100ms (StatusBar, TaskTimeline)
- **Socket.IO Event Loss:** 0% (all events reach UI)
- **Checkpoint Save Time:** <500ms
- **Resume Startup Time:** <2s (load checkpoint, resume execution)
- **User Error Recovery:** 100% (all resume attempts succeed)

---

**Next Phase:** PHASE 3 (Browser Stability)  
**Estimated Timeline:** 5 days  
**Deliverable:** Regen works as stable daily-driver replacement for Chrome
