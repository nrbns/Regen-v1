# PHASE A: Realtime Infrastructure (Complete)

## What Was Built

### ✅ Event Types (`packages/shared/events.ts`)

- `JOB_CREATED`, `JOB_RUNNING`, `JOB_PROGRESS`, `JOB_COMPLETED`, `JOB_FAILED`, `JOB_CANCELLED`
- TypeScript interfaces for job lifecycle events
- Streaming support for AI responses

### ✅ Socket.IO Server (`server/realtime.ts`)

- Production-ready realtime server with JWT authentication
- Redis adapter for horizontal scaling
- Per-job and per-user rooms
- Backlog replay on reconnection (prevents duplicate delivery)
- Auto-reconnect handling

### ✅ Redis Pub/Sub (`server/pubsub/redis.ts`)

- Bridge between workers and Socket.IO
- Pattern-based subscriptions
- Event routing to appropriate rooms

### ✅ Socket Client (`apps/desktop/src/services/socket.ts`)

- Connection management with exponential backoff
- Job progress subscriptions
- Automatic reconnection
- Event deduplication
- Backlog for offline support

### ✅ Job Routes (`server/routes/jobRoutes.ts`)

- REST API for job lifecycle
- `POST /api/jobs` - Create
- `GET /api/jobs/:jobId` - Status
- `PATCH /api/jobs/:jobId/cancel` - Cancel
- `POST /api/jobs/:jobId/resume` - Resume
- `GET /api/jobs` - List user jobs

### ✅ React Hooks

- `useJobProgress()` - Subscribe to single job
- `useJobProgressMultiple()` - Subscribe to multiple jobs
- Auto-cleanup, error handling

### ✅ UI Components

- `StatusBar.tsx` - Global connection + job status
- `TaskActivityPanel.tsx` - Detailed progress with steps

### ✅ Worker Integration (`workers/jobPublisher.ts`)

- `publishJobProgress()` - Update progress
- `publishJobChunk()` - Stream text
- `publishJobCheckpoint()` - Save state for resume
- `publishJobComplete()` - Mark done
- `publishJobError()` - Error reporting
- Example worker with realistic job flow

---

## How to Integrate

### 1. **Server Initialization**

In `server/index.ts` or similar:

```typescript
import { initRealtimeServer } from './realtime';
import { createJobRoutes } from './routes/jobRoutes';

const app = express();
const httpServer = createServer(app);

// Initialize realtime server
const io = await initRealtimeServer(httpServer, {
  jwtSecret: process.env.JWT_SECRET,
  redisUrl: process.env.REDIS_URL,
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

// Add job routes
app.use('/api', createJobRoutes());

httpServer.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 2. **Worker Integration**

In any worker (e.g., `workers/agent.ts`):

```typescript
import Redis from 'ioredis';
import {
  publishJobProgress,
  publishJobChunk,
  publishJobComplete,
  publishJobError,
} from './jobPublisher';

const redis = new Redis(process.env.REDIS_URL);

// During job execution:
await publishJobProgress(redis, jobId, userId, 'running', 'Step 1', 25);

// For streaming:
await publishJobChunk(redis, jobId, userId, 'Some response text');

// On completion:
await publishJobComplete(redis, jobId, userId, result, durationMs);

// On error:
await publishJobError(redis, jobId, userId, error.message, true);
```

### 3. **Frontend Initialization**

In `apps/desktop/src/main.tsx` or startup:

```typescript
import { initSocketClient } from './services/socket';

// When user logs in / gets auth token:
const token = getAuthToken();
await initSocketClient({
  url: process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000',
  token,
  deviceId: `desktop-${uuid()}`,
});
```

### 4. **Use in Components**

```typescript
import { useJobProgress } from '../hooks/useJobProgress';
import StatusBar from '../components/StatusBar';
import TaskActivityPanel from '../components/TaskActivityPanel';

function MyComponent() {
  const [jobId, setJobId] = useState<string | null>(null);

  const handleStartJob = async () => {
    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'agent', query: 'Find AI agents' }),
    });
    const { jobId } = await response.json();
    setJobId(jobId);
  };

  return (
    <>
      <StatusBar currentJobId={jobId} />

      <button onClick={handleStartJob}>
        Start Job
      </button>

      {jobId && <TaskActivityPanel jobId={jobId} />}
    </>
  );
}
```

---

## Testing the Full Flow

### 1. Start Backend

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start server
npm run dev:server

# Terminal 3: Start worker
npm run dev:worker
```

### 2. Start Frontend

```bash
# Terminal 4: Start desktop
npm run dev:desktop
```

### 3. Test Job Creation

```bash
# Create a job
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "agent", "query": "Test query"}'

# Returns: { jobId: "uuid", state: "created" }
```

### 4. Observe in UI

- Status bar shows connection status
- Task activity panel shows progress
- Streaming text updates in real-time

---

## Key Features

### ✅ Reconnection Safety

- Events tagged with sequence numbers
- Backlog stored per job
- Client replays missing events on reconnect
- Prevents duplicate message delivery

### ✅ Scaling

- Redis adapter enables multi-server deployment
- Socket.IO rooms distribute messages
- Workers publish to Redis, not directly to sockets

### ✅ Offline Support

- Client queues events while disconnected
- Automatic sync on reconnection
- Backlog prevents data loss

### ✅ Job Resume

- Checkpoint data stored during progress
- `/api/jobs/:jobId/resume` endpoint
- Worker can restore from checkpoint

### ✅ Cancellation

- Client emits `cancel:job` to socket
- Worker listens to `job:cancel:*` Redis channel
- Clean shutdown with proper cleanup

---

## Next: PHASE B (Job Lifecycle)

See [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) for database schema and state machine implementation.

Key files to create:

- `server/jobs/stateMachine.ts` - Job state transitions
- `server/db/migrations/001_jobs.sql` - Persistent storage
- `server/jobs/scheduler.ts` - Orphan cleanup

---

## Troubleshooting

### "Socket not connected" errors

- Verify Socket.IO server is running
- Check JWT token validity
- Ensure CORS origin matches client URL
- Check Redis connectivity

### "Job not updating"

- Verify Redis is running
- Check worker is publishing events correctly
- Look for `[Realtime]` logs in server output
- Confirm job room subscription with `socket.emit('subscribe:job', jobId)`

### "Missing events on reconnect"

- Backlog limit is 200 events per job (configurable)
- If job runs long, increase limit
- Check Redis memory usage

---

## Production Checklist

- [ ] Redis configured for persistence
- [ ] Socket.IO adapter scaled for load
- [ ] JWT token refresh implemented
- [ ] Error logging setup (Sentry/similar)
- [ ] Rate limiting on job creation
- [ ] Cleanup old job records regularly
- [ ] Monitor Redis memory usage
- [ ] Test reconnection scenarios
- [ ] Implement metrics (job success %, latency)
