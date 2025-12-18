# PHASE A Integration Checklist

## Pre-Integration Verification

- [x] Event types defined (`packages/shared/events.ts`)
- [x] Redis adapter created (`server/pubsub/redis.ts`)
- [x] Socket server verified (`server/realtime.ts`)
- [x] Socket client built (`apps/desktop/src/services/socket.ts`)
- [x] Job routes scaffolded (`server/routes/jobRoutes.ts`)
- [x] React hooks created (`apps/desktop/src/hooks/useJobProgress.ts`)
- [x] Worker integration module (`workers/jobPublisher.ts`)
- [x] UI components built (`StatusBar.tsx`, `TaskActivityPanel.tsx`)

## Backend Integration Steps

### Step 1: Wire Socket Server into Express

**File**: `server/index.ts` (or main entry point)

```typescript
// 1. Import realtime module
import { initRealtimeServer } from './realtime';

// 2. Before listen(), initialize:
const io = await initRealtimeServer(httpServer, {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  cors: {
    origin: process.env.VITE_SOCKET_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Export for use in routes/workers
export { io };
```

**Checklist:**

- [ ] Import statement added
- [ ] `initRealtimeServer()` called before `listen()`
- [ ] Environment variables configured
- [ ] io exported for other modules
- [ ] No TypeScript errors

---

### Step 2: Attach Job Routes to Express

**File**: `server/index.ts` or new `server/routes/index.ts`

```typescript
import { createJobRoutes } from './routes/jobRoutes';

// Add to middleware stack (after auth):
app.use('/api', createJobRoutes());
```

**Checklist:**

- [ ] Job routes imported
- [ ] Routes attached to `/api` prefix
- [ ] Auth middleware applied first
- [ ] Test endpoints with curl
- [ ] No auth errors

---

### Step 3: Configure Environment Variables

**File**: `.env` or `.env.local`

```env
# Socket.IO
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-dev-secret
SOCKET_PORT=3000

# Frontend
VITE_SOCKET_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000/api
```

**Checklist:**

- [ ] Redis connection string valid
- [ ] JWT secret set (dev or prod)
- [ ] Socket URL matches frontend configuration
- [ ] API URL matches backend

---

### Step 4: Update Worker Code to Use jobPublisher

**File**: `workers/agent.ts` (or any worker)

Replace direct process.emit or logs with:

```typescript
import Redis from 'ioredis';
import {
  publishJobProgress,
  publishJobChunk,
  publishJobComplete,
  publishJobError,
} from './jobPublisher';

const redis = new Redis(process.env.REDIS_URL);

async function runJob(jobId, userId, query) {
  try {
    // Update progress
    await publishJobProgress(redis, jobId, userId, 'running', 'Analyzing query', 10);

    // Do work...
    for await (const chunk of performSearch(query)) {
      // Stream chunks
      await publishJobChunk(redis, jobId, userId, chunk);

      // Update progress
      await publishJobProgress(redis, jobId, userId, 'running', 'Searching', 50);
    }

    // Mark complete
    await publishJobComplete(redis, jobId, userId, result, Date.now() - start);
  } catch (error) {
    await publishJobError(redis, jobId, userId, error.message, true);
  }
}
```

**Checklist:**

- [ ] jobPublisher imported
- [ ] All progress updates use `publishJobProgress()`
- [ ] Streaming text uses `publishJobChunk()`
- [ ] Completion uses `publishJobComplete()`
- [ ] Errors use `publishJobError()`
- [ ] Worker has REDIS_URL env var

---

### Step 5: Test Backend Realtime Flow

**File**: Create `tests/realtime.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import Redis from 'ioredis';
import { io } from '../server';

describe('Realtime Flow', () => {
  it('should publish job progress to Redis', async () => {
    const redis = new Redis(process.env.REDIS_URL);
    const events = [];

    redis.subscribe('job:event:test-job', (err, count) => {
      if (!err) console.log('Subscribed to job events');
    });

    redis.on('message', (channel, message) => {
      events.push(JSON.parse(message));
    });

    // Simulate worker publishing
    await redis.publish(
      'job:event:test-job',
      JSON.stringify({
        jobId: 'test-job',
        userId: 'user-1',
        state: 'running',
        step: 'Searching',
        progress: 50,
        sequence: 1,
      })
    );

    // Wait for message
    await new Promise(r => setTimeout(r, 100));

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].progress).toBe(50);
  });
});
```

**Checklist:**

- [ ] Test file created
- [ ] Test passes with backend running
- [ ] Redis connection works
- [ ] Event publishing works

---

## Frontend Integration Steps

### Step 6: Initialize Socket Client on App Startup

**File**: `apps/desktop/src/main.tsx` or `_app.tsx`

```typescript
import { initSocketClient } from './services/socket';
import { useAuthStore } from './stores/auth'; // Your auth store

// In your app initialization or onMount:
useEffect(() => {
  const setupSocket = async () => {
    const token = useAuthStore.getState().token;

    if (token) {
      try {
        await initSocketClient({
          url: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
          token,
          deviceId: `desktop-${navigator.userAgent.slice(0, 20)}`,
          onConnect: () => console.log('Socket connected'),
          onDisconnect: () => console.log('Socket disconnected'),
        });
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    }
  };

  setupSocket();
}, []);
```

**Checklist:**

- [ ] useEffect added to app root
- [ ] Token retrieved from auth store
- [ ] Socket client initialized
- [ ] Environment variable VITE_SOCKET_URL set
- [ ] Handles connection/disconnection

---

### Step 7: Add StatusBar to Root Layout

**File**: `apps/desktop/src/layouts/MainLayout.tsx`

```typescript
import StatusBar from '../components/StatusBar';

export function MainLayout({ children }) {
  return (
    <div className="flex flex-col h-screen">
      <StatusBar /> {/* Add at top */}

      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Optional: Right panel for TaskActivityPanel */}
      <aside className="w-80 border-l">
        {/* Task activity goes here */}
      </aside>
    </div>
  );
}
```

**Checklist:**

- [ ] StatusBar imported
- [ ] Added to layout
- [ ] Positioned at top
- [ ] CSS applied (flex layout)
- [ ] No layout shift

---

### Step 8: Add TaskActivityPanel to Right Sidebar

**File**: `apps/desktop/src/layouts/MainLayout.tsx` (continued)

```typescript
import TaskActivityPanel from '../components/TaskActivityPanel';
import { useJobProgressStore } from '../stores/jobProgress'; // Create this

export function MainLayout({ children }) {
  const currentJobId = useJobProgressStore((s) => s.currentJobId);

  return (
    <div className="flex flex-col h-screen">
      <StatusBar />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1">
          {children}
        </main>

        {/* Show panel only if job is running */}
        {currentJobId && (
          <aside className="w-80 border-l bg-white dark:bg-slate-900">
            <TaskActivityPanel jobId={currentJobId} />
          </aside>
        )}
      </div>
    </div>
  );
}
```

**Checklist:**

- [ ] TaskActivityPanel imported
- [ ] Conditional rendering based on currentJobId
- [ ] Right sidebar styled
- [ ] Border and background applied
- [ ] Panel shows on job start

---

### Step 9: Test Socket Connection in Frontend

**File**: Create test in `apps/desktop/src/services/socket.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { initSocketClient, getSocketClient } from './socket';

describe('Socket Client', () => {
  it('should connect successfully', async () => {
    const client = await initSocketClient({
      url: 'http://localhost:3000',
      token: 'test-token',
      deviceId: 'test-device',
    });

    expect(client).toBeDefined();
    expect(client.isReady()).toBe(true);
  });

  it('should subscribe to job progress', async () => {
    const client = getSocketClient();
    const progressUpdates = [];

    const unsubscribe = client.subscribeToJob('test-job', event => {
      progressUpdates.push(event);
    });

    // Simulate server sending event
    // (Use manual test or integration test)

    expect(progressUpdates.length).toBeGreaterThan(0);

    unsubscribe();
  });
});
```

**Checklist:**

- [ ] Test file created
- [ ] Connection test passes
- [ ] Subscription test passes
- [ ] No console errors

---

### Step 10: Create Job Progress Store (Zustand)

**File**: `apps/desktop/src/stores/jobProgress.ts`

```typescript
import { create } from 'zustand';

export interface JobProgressState {
  jobId: string | null;
  state: 'created' | 'running' | 'completed' | 'failed' | 'cancelled';
  step: string;
  progress: number;
  streamingText: string;
  elapsed: number;
  error?: string;
}

export const useJobProgressStore = create<{
  currentJobId: string | null;
  progress: Map<string, JobProgressState>;
  setCurrentJob: (jobId: string | null) => void;
  updateProgress: (jobId: string, update: Partial<JobProgressState>) => void;
}>(set => ({
  currentJobId: null,
  progress: new Map(),

  setCurrentJob: jobId => set({ currentJobId: jobId }),

  updateProgress: (jobId, update) =>
    set(state => {
      const newProgress = new Map(state.progress);
      newProgress.set(jobId, {
        ...(newProgress.get(jobId) || {}),
        jobId,
        ...update,
      });
      return { progress: newProgress };
    }),
}));
```

**Checklist:**

- [ ] Store created with Zustand
- [ ] Job progress state shape defined
- [ ] Actions implemented
- [ ] Used by StatusBar and TaskActivityPanel

---

## Integration Testing Steps

### Step 11: End-to-End Test

**Manual Test Flow:**

1. **Start Services** (3 terminals):

   ```bash
   # Terminal 1: Redis
   redis-server

   # Terminal 2: Server
   npm run dev:server

   # Terminal 3: Worker
   npm run dev:worker
   ```

2. **Start Frontend** (Terminal 4):

   ```bash
   npm run dev:desktop
   ```

3. **Test Flow**:
   - [ ] Frontend loads, StatusBar shows connected (🟢)
   - [ ] Create new job via UI
   - [ ] StatusBar updates with job name + progress
   - [ ] TaskActivityPanel shows step-by-step progress
   - [ ] Streaming text appears in real-time
   - [ ] Progress bar animates
   - [ ] Job completes or fails
   - [ ] StatusBar returns to idle
   - [ ] TaskActivityPanel closes

4. **Test Reconnection**:
   - [ ] Stop backend server
   - [ ] StatusBar shows offline (🔴)
   - [ ] Frontend queues events
   - [ ] Restart backend
   - [ ] StatusBar reconnects (🟢)
   - [ ] Queued events process

5. **Test Multiple Jobs**:
   - [ ] Create 3 jobs simultaneously
   - [ ] useJobProgressMultiple tracks all
   - [ ] UI can switch between them
   - [ ] Each has separate progress

---

### Step 12: Performance Testing

**File**: Create `tests/realtime.perf.ts`

```typescript
import { performance } from 'perf_hooks';
import Redis from 'ioredis';

async function measureThroughput() {
  const redis = new Redis();
  const start = performance.now();
  const jobId = 'perf-test';
  const userId = 'user-1';

  for (let i = 0; i < 1000; i++) {
    await redis.publish(
      `job:event:${jobId}`,
      JSON.stringify({
        jobId,
        userId,
        state: 'running',
        step: `Step ${i}`,
        progress: i,
        sequence: i,
      })
    );
  }

  const elapsed = performance.now() - start;
  console.log(`1000 events in ${elapsed}ms (${(1000 / (elapsed / 1000)).toFixed(0)} events/sec)`);
}

measureThroughput();
```

**Checklist:**

- [ ] Can process 100+ job events/sec through Redis
- [ ] Socket.IO broadcasts without lag
- [ ] Client receives all events
- [ ] No memory leaks over time

---

## Verification Checklist

### Backend

- [ ] Server starts without errors
- [ ] Redis adapter connects
- [ ] Job routes respond to requests
- [ ] Worker publishes events correctly
- [ ] Socket.IO accepts connections

### Frontend

- [ ] App initializes socket client
- [ ] StatusBar displays connection status
- [ ] TaskActivityPanel shows progress
- [ ] useJobProgress hook works
- [ ] No console errors

### Integration

- [ ] End-to-end job flow works
- [ ] Reconnection handled correctly
- [ ] Multiple concurrent jobs supported
- [ ] Performance acceptable (< 200ms latency)
- [ ] No data loss on disconnect

---

## Troubleshooting

| Issue                       | Cause                   | Fix                                       |
| --------------------------- | ----------------------- | ----------------------------------------- |
| "Cannot find module"        | File not created        | Create file from docs/PHASE_A_REALTIME.md |
| "Redis connection failed"   | Redis not running       | `redis-server` or check REDIS_URL env     |
| "Socket not connected"      | Wrong URL or CORS       | Check VITE_SOCKET_URL matches server      |
| "Job updates not appearing" | Worker not publishing   | Check jobPublisher import and calls       |
| "StatusBar not showing"     | Not in layout           | Add `<StatusBar />` to MainLayout         |
| "Duplicate events"          | Sequence dedup failed   | Check socket client backlog logic         |
| "High latency"              | Redis/Socket bottleneck | Monitor Redis memory, consider clustering |

---

## Next Phase: PHASE B (Job Lifecycle)

Once integration is verified:

1. Create database schema for jobs
2. Implement state machine (created → running → completed/failed)
3. Add checkpoint/resume logic
4. Create orphan job cleanup scheduler
5. Add job history/logging

See [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) for detailed PHASE B tasks.
