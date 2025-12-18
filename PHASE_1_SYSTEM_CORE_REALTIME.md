# 🎯 PHASE 1: SYSTEM CORE + REALTIME SPINE (Days 1-10)

## Status Check: What Exists vs What's Missing

| Layer | Current State | Gap | Priority |
|-------|---------------|-----|----------|
| **System Core** | Events defined, StateMachine exists | Store + unified schema | 🔴 CRITICAL |
| **Realtime Spine** | Socket.IO connected | No Redis, no worker sync | 🔴 CRITICAL |
| **Job Lifecycle** | Basic progress tracking | No checkpoint/resume | 🟠 HIGH |
| **Trust UI/UX** | ActionLog exists | StatusBar missing | 🟠 HIGH |
| **Browser Stability** | Tabs exist | No isolation/restore | 🟡 MEDIUM |
| **Research+Trading** | Routes exist | No persistence layer | 🟡 MEDIUM |
| **Beta+Proof** | Tests scattered | No e2e/load tests | 🟢 LOW |

---

## 🔴 PHASE 1A: SYSTEM CORE (Days 1-5)

### What's Missing
Your events are defined but **no single source of truth for job storage/query**.

### The Work

#### 1. Create `server/jobs/store.ts` (JobStore interface)

```typescript
interface JobStore {
  // Create
  create(userId: string, jobRecord: JobRecord): Promise<string>;
  
  // Read
  get(jobId: string): Promise<JobRecord | null>;
  list(userId: string): Promise<JobRecord[]>;
  
  // Update
  setState(jobId: string, state: JobState): Promise<void>;
  setProgress(jobId: string, progress: number, step: string): Promise<void>;
  checkpoint(jobId: string, data: any): Promise<void>;
  
  // Delete
  cancel(jobId: string): Promise<void>;
  
  // Query
  findByState(state: JobState): Promise<JobRecord[]>;
  findRunning(): Promise<JobRecord[]>;
}

// Implementation: PostgreSQL or SQLite
export class PGJobStore implements JobStore { ... }
```

**File path:** `server/jobs/store.ts`  
**Time:** 2 hours  
**Why:** Single source of truth for all job data

---

#### 2. Create `server/jobs/repository.ts` (Clean API)

```typescript
export class JobRepository {
  constructor(private store: JobStore) {}
  
  async createResearch(userId: string, query: string): Promise<string> {
    return this.store.create(userId, {
      type: 'research',
      query,
      state: 'created',
      // ...
    });
  }
  
  async createTrade(userId: string, symbol: string): Promise<string> { ... }
  
  async resume(jobId: string): Promise<JobRecord> {
    const job = await this.store.get(jobId);
    if (!job?.checkpointData) throw new Error('No checkpoint');
    return job;
  }
}
```

**File path:** `server/jobs/repository.ts`  
**Time:** 1 hour  
**Why:** Business logic layer above storage

---

#### 3. Define `packages/shared/job-schema.ts` (Versioned contract)

```typescript
export const JOB_SCHEMA_V1 = {
  version: 1,
  required: ['id', 'userId', 'type', 'state', 'createdAt'],
  
  example: {
    id: 'job-uuid',
    userId: 'user-uuid',
    type: 'research', // 'research' | 'trade' | 'analysis'
    state: 'running', // 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
    query: 'What is quantum computing?',
    progress: 45,
    step: 'Analyzing sources',
    createdAt: 1703000000,
    checkpointData: { /* resumable state */ },
  }
};

// Versioning: If you change schema, bump to V2
export const JOB_SCHEMA_V2 = { ... };
```

**File path:** `packages/shared/job-schema.ts`  
**Time:** 1 hour  
**Why:** Contract between frontend/backend/workers

---

### Checkpoint: After PHASE 1A

✅ All job data has **single source of truth**  
✅ Queries are **consistent**  
✅ Resume logic has **place to live**  

---

## 🔴 PHASE 1B: REALTIME SPINE (Days 6-10)

### Current Problem
Worker sends progress → but if Redis connection drops or server restarts → **UI doesn't know what worker is doing**.

### The Work

#### 1. Add Redis to `server/realtime.ts`

```typescript
import redis from 'redis';

const pubClient = redis.createClient(REDIS_URL);
const subClient = redis.createClient(REDIS_URL);

export class RealtimeServer {
  private socketServer: Server;
  private jobWorkers = new Map<string, JobWorker>();
  
  async publishJobEvent(jobId: string, event: JobEvent) {
    // Publish to Redis channel
    await pubClient.publish(`job:${jobId}`, JSON.stringify(event));
    
    // Also send to any connected Socket.IO clients
    this.socketServer.to(`job:${jobId}`).emit('job:update', event);
  }
}
```

**File path:** `server/realtime.ts` (modify existing)  
**Time:** 2 hours  
**Why:** Decouples Socket.IO from worker state

---

#### 2. Create `server/workers/supervisor.ts` (Heartbeat + Recovery)

```typescript
export class WorkerSupervisor {
  private heartbeats = new Map<string, number>();
  
  onWorkerHeartbeat(workerId: string, jobId: string) {
    this.heartbeats.set(jobId, Date.now());
    // Publish heartbeat to Redis
    pubClient.publish(`worker:${workerId}`, 'heartbeat');
  }
  
  async checkDeadWorkers() {
    // Every 30s: find jobs where worker hasn't pinged
    for (const [jobId, lastPing] of this.heartbeats) {
      if (Date.now() - lastPing > 35000) {
        // Worker is dead → checkpoint job → reassign
        await this.reassignJob(jobId);
      }
    }
  }
}
```

**File path:** `server/workers/supervisor.ts` (new)  
**Time:** 2 hours  
**Why:** Handles worker crashes without losing job state

---

#### 3. Harden Socket.IO client reconnect in `apps/desktop/src/services/socket.ts`

```typescript
export class SocketClient {
  private socket: Socket;
  
  constructor() {
    this.socket = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
    });
    
    this.socket.on('connect', () => this.onConnect());
    this.socket.on('disconnect', () => this.onDisconnect());
  }
  
  private async onConnect() {
    // After reconnect: fetch pending jobs
    const pending = await fetch(`/api/jobs/pending`);
    for (const job of pending) {
      this.subscribeToJob(job.id);
    }
  }
}
```

**File path:** `apps/desktop/src/services/socket.ts` (modify)  
**Time:** 1 hour  
**Why:** Sync UI state after reconnect

---

#### 4. Create checkpoint recovery in `server/jobs/recovery.ts`

```typescript
export class JobRecovery {
  async resumeJob(jobId: string) {
    const job = await store.get(jobId);
    if (!job.checkpointData) throw new Error('No checkpoint');
    
    // Restart worker from checkpoint
    const worker = await assignWorker(job.type);
    worker.resume(job.checkpointData);
  }
}
```

**File path:** `server/jobs/recovery.ts` (new)  
**Time:** 1 hour  
**Why:** Complete the job lifecycle

---

### Checkpoint: After PHASE 1B

✅ Worker crash → **job continues** (checkpoint recovery)  
✅ Network drop → **UI resync** (on reconnect)  
✅ Redis down → **fallback to Socket.IO** (graceful degradation)  
✅ Multi-worker jobs → **coordinated via Redis** (no lost updates)

---

## 📊 Timeline PHASE 1

| Area | Task | Time | Day |
|------|------|------|-----|
| **CORE** | Store interface | 2h | Day 1 |
| **CORE** | Repository | 1h | Day 1 |
| **CORE** | Schema versioning | 1h | Day 2 |
| **REALTIME** | Redis integration | 2h | Day 3 |
| **REALTIME** | Worker supervisor | 2h | Day 4 |
| **REALTIME** | Socket reconnect | 1h | Day 5 |
| **REALTIME** | Job recovery | 1h | Day 5 |
| **TESTING** | E2E checkpoint test | 2h | Day 6 |
| **BUFFER** | — | 2h | Days 7-10 |

**Total: 10 days, ~15 hours focused work**

---

## ✅ What PHASE 1 Unlocks

After this, you have:

1. ✅ **Single source of truth** (all jobs in DB)
2. ✅ **Realtime sync** (Redis + Socket.IO)
3. ✅ **Worker resilience** (heartbeat + recovery)
4. ✅ **Checkpoint/resume** (day-long jobs can pause/continue)
5. ✅ **Foundation for scaling** (everything else builds on this)

**This is the skeleton. Layers 3-7 hang on it.**

---

## 🚦 Next Steps

### Before you start PHASE 1:

1. **Verify database**: Is PostgreSQL running? Do you have migrations setup?
   ```bash
   cd server
   npm run db:migrate
   ```

2. **Verify Redis**: Is Redis available?
   ```bash
   redis-cli ping  # Should return PONG
   ```

3. **Verify workers**: Can you run a job to completion?
   ```bash
   npm run dev:worker
   ```

### To begin PHASE 1A TODAY:

1. Create `server/jobs/store.ts` with interface only (no implementation yet)
2. Create `server/jobs/repository.ts` with method signatures
3. Create `packages/shared/job-schema.ts` with current schema version
4. Run tests to ensure types align

**Then we lock in database + implementation.**

---

## 🧠 Why This Order Matters

❌ **Don't start** with UI/UX (layers 4-5)  
❌ **Don't start** with feature hardening (layer 6)  
✅ **Must start** with core + realtime (layers 1-2)

**Why:** If core is weak, features are hostage to failures.

---

**Status:** Ready for PHASE 1A | Next: Database + Store interface
