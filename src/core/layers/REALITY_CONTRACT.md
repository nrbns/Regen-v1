# Reality Contract - Implementation Guarantees

This document defines the **non-negotiable rules** that ensure the tiered architecture is real-world ready, not theoretical.

---

## 🎯 THE 5 RULES

### 1. Everything Must Be Process-Isolated

**What this means:**

- Each layer runs as a separate OS process
- No shared memory between layers
- Process boundaries are real, not simulated

**How we guarantee this:**

```typescript
// L0: Tauri process (Rust + WebView)
// L2: Node.js process (spawned via spawnAgentService)
// L3: SQLite/Redis (separate persistence)

// Proof: agentService.ts spawns real process
const result = (await invoke('spawn_process', {
  command: 'node',
  args: [AGENT_SERVICE_PATH],
})) as { pid: number };

// Real PID = real process isolation
```

**If you break this:** Everything becomes in-process simulation (fake).

---

### 2. Nothing Critical Depends on UI

**What this means:**

- Job state exists independent of UI
- Jobs continue if UI crashes
- Recovery works without UI

**How we guarantee this:**

```typescript
// Jobs stored in repository (SQLite/Redis)
// UI only READS, never controls execution
const job = await jobRepository.getJob(jobId);
// Job exists whether UI is open or not

// Checkpoints saved independently
await checkpointManager.saveCheckpoint(checkpoint);
// Recovery works without UI
```

**If you break this:** System becomes fragile (fake robustness).

---

### 3. Nothing Heavy Is Always-On

**What this means:**

- L0 = minimal (browsing only)
- L2 = spawned on-demand (Research/Trade modes)
- L3 = dormant unless jobs exist

**How we guarantee this:**

```typescript
// L0 startup: NO heavy services
// main.tsx: Removed Socket.IO, agents, LangChain

// L2 activation: Explicit spawn
await layerManager.switchToMode('Research');
// → spawnAgentService() called
// → Real process spawned

// L2 deactivation: Explicit kill
await layerManager.exitMode('Research');
// → killAgentService() called
// → Process terminated
```

**If you break this:** System is always heavy (fake performance).

---

### 4. Every Long Action Is Resumable

**What this means:**

- Jobs can be paused and resumed
- Checkpoints save progress
- Crash recovery works

**How we guarantee this:**

```typescript
// Checkpoints saved periodically
await checkpointManager.saveCheckpoint({
  jobId,
  step: 'processing',
  progress: 45,
  partialOutput: '...',
});

// Resume from checkpoint
const recovery = await jobRecoveryHandler.resumeJob(jobId);
// → Restores from last checkpoint
// → Continues from where it stopped
```

**If you break this:** Long actions can't recover (fake reliability).

---

### 5. Failure Is a First-Class State

**What this means:**

- `failed` is a real job state
- Errors are stored, not lost
- Failed jobs can restart

**How we guarantee this:**

```typescript
// Explicit failure state
type JobState = 'created' | 'running' | 'paused' | 'completed' | 'failed';

// Error stored in job record
job.error = error.message;
await jobRepository.setState(jobId, 'failed');

// Restart from failure
await jobRecoveryHandler.restartJob(jobId);
// → Clears error
// → Starts fresh
```

**If you break this:** Failures become hidden (fake correctness).

---

## ✅ VALIDATION CHECKLIST

Before shipping, verify:

- [ ] Agent service spawns real process (check PID)
- [ ] Jobs persist to SQLite/Redis (check DB)
- [ ] Checkpoints save independently (check Redis)
- [ ] L0 starts without heavy services (check memory)
- [ ] L2 spawns only on mode switch (check process list)
- [ ] Failed jobs have error state (check job.state)
- [ ] Recovery works without UI (test with UI closed)
- [ ] Socket.IO connects only in L2 (check connection timing)

---

## 🚫 ANTI-PATTERNS (Never Do These)

1. ❌ **Fake Progress Bars**
   - Progress must come from real job state
   - Not simulated, not estimated

2. ❌ **Simulated Reasoning**
   - Reasoning logs must contain real LLM calls
   - Not made-up steps, not fake confidence scores

3. ❌ **UI-Only Jobs**
   - Jobs must exist in repository
   - Not just React state, not localStorage-only

4. ❌ **Hidden Background Services**
   - All services must have clear activation triggers
   - Not always-on, not invisible

5. ❌ **"AI Always On"**
   - AI features load on-demand
   - Not initialized at startup, not always connected

---

## 🎯 THE TEST

**If you can answer "YES" to all of these, you're compliant:**

1. Can I kill the UI process and jobs still continue? **YES** (jobs in separate process)
2. Can I restart the app and resume a paused job? **YES** (checkpoints in DB)
3. Does Browse mode use < 50 MB RAM? **YES** (L0 is minimal)
4. Are failed jobs recoverable? **YES** (failure is a state)
5. Are reasoning steps real, not simulated? **YES** (logs from real LLM calls)

---

## 📝 IMPLEMENTATION REMINDER

**Every feature must map to:**

> A real process, a real state, a real log

**Nothing exists only in UI.**
**Nothing is simulated.**
**Everything is resumable.**
**Failure is explicit.**

This is how professional systems are built.
