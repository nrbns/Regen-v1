# Realtime Infrastructure - Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install express socket.io @socket.io/redis-adapter redis jsonwebtoken
npm install -D @types/express @types/jsonwebtoken tsx
```

### 2. Start Redis

```bash
# Docker (recommended)
docker run -d -p 6379:6379 redis:alpine

# Or install locally
# Windows: https://github.com/microsoftarchive/redis/releases
# Mac: brew install redis && brew services start redis
# Linux: sudo apt-get install redis-server
```

### 3. Start Realtime Server

```bash
# Development mode
npm run dev:realtime

# Or manually
JWT_SECRET=your-secret-key tsx server/index.ts
```

Server will start on `http://localhost:3000`

### 4. Test Connection

```bash
# Run load test
npm run test:load:realtime

# Should see:
# ✅ Job Started Rate > 95%
# ✅ Job Completed Rate > 90%
# ✅ Chunk Latency < 500ms
# ✅ Reconnect Success > 95%
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                     │
│                                                              │
│  ┌──────────────┐    ┌───────────────┐   ┌──────────────┐ │
│  │ JobStatus    │◄───┤ useRealtimeJob│◄──┤ Socket       │ │
│  │ Panel (UI)   │    │ (Hook)        │   │ Service      │ │
│  └──────────────┘    └───────────────┘   └──────┬───────┘ │
└───────────────────────────────────────────────────┼─────────┘
                                                    │ WebSocket
                                                    │ (JWT Auth)
┌───────────────────────────────────────────────────┼─────────┐
│                      SERVER (Node.js)             │         │
│                                                    ▼         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Socket.IO Server                        │  │
│  │  - JWT Authentication                                 │  │
│  │  - Room Management (user:<id>, job:<id>)             │  │
│  │  - Event Broadcasting                                 │  │
│  └────────────┬──────────────────────┬──────────────────┘  │
│               │                      │                      │
│               ▼                      ▼                      │
│  ┌────────────────────┐   ┌─────────────────────┐         │
│  │  Job State         │   │  Streaming Worker   │         │
│  │  Manager           │   │  - Execute jobs     │         │
│  │  - State machine   │   │  - Stream chunks    │         │
│  │  - Checkpoints     │   │  - Save checkpoints │         │
│  │  - Persistence     │   │  - Handle cancel    │         │
│  └────────────────────┘   └──────────┬──────────┘         │
│                                       │                     │
│                                       ▼                     │
│                            ┌──────────────────┐            │
│                            │   Redis Pub/Sub  │            │
│                            │   - job:event:*  │            │
│                            │   - job:cancel:* │            │
│                            └──────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Usage Examples

### Client-Side (React)

```tsx
import { useRealtimeJob } from '@/hooks/useRealtimeJob';
import { JobStatusPanel } from '@/components/jobs/JobStatusPanel';

function MyComponent() {
  const job = useRealtimeJob({
    autoConnect: true,
    serverUrl: 'ws://localhost:3000',
    token: 'your-jwt-token',
  });

  const handleStartJob = async () => {
    await job.startJob({
      type: 'llm-completion',
      input: { 
        prompt: 'Explain quantum computing',
        duration: 10,
        chunks: 50,
      },
    });
  };

  return (
    <div>
      <button onClick={handleStartJob} disabled={job.isRunning}>
        Start AI Task
      </button>

      {job.jobId && (
        <JobStatusPanel
          jobId={job.jobId}
          onClose={() => job.reset()}
          onRetry={handleStartJob}
        />
      )}
    </div>
  );
}
```

### Server-Side (Node.js)

```typescript
import { startRealtimeServer } from './server';

// Start server
startRealtimeServer().then(({ io, worker, jobManager }) => {
  console.log('Realtime server ready!');

  // Example: Clean up old jobs every hour
  setInterval(() => {
    jobManager.cleanupOldJobs(24 * 60 * 60 * 1000);
    jobManager.cleanupOrphanJobs(60 * 60 * 1000);
  }, 60 * 60 * 1000);
});
```

## Environment Variables

Create `.env` file:

```bash
# Server
PORT=3000
JWT_SECRET=your-super-secret-key-change-in-production
REDIS_URL=redis://localhost:6379

# Client
VITE_REALTIME_SERVER_URL=ws://localhost:3000
```

## Testing

### Load Test (k6)

```bash
# Install k6
# Windows: choco install k6
# Mac: brew install k6
# Linux: https://k6.io/docs/getting-started/installation/

# Run smoke test
npm run test:load:realtime

# With custom params
SERVER_URL=ws://localhost:3000 JWT_TOKEN=test-token k6 run tests/load/k6-realtime-smoke.js
```

### Manual Test

```bash
# Terminal 1: Start server
npm run dev:realtime

# Terminal 2: Run test
curl http://localhost:3000/health
# Should return: {"status":"ok","uptime":...,"redis":"connected"}
```

## Monitoring

### Job Statistics

```typescript
const stats = jobManager.getStatistics();
console.log('Jobs:', stats.total);
console.log('By state:', stats.byState);
console.log('Avg completion time:', stats.avgCompletionTime, 'ms');
```

### Connection Count

```typescript
const connectedClients = await getConnectedClients(io);
console.log('Connected clients:', connectedClients);
```

## Troubleshooting

### "Cannot connect to Redis"

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not, start Redis
docker run -d -p 6379:6379 redis:alpine
```

### "Authentication failed"

- Check JWT_SECRET matches between client and server
- Ensure token is not expired
- Verify token format: `{ userId: string, exp?: number }`

### "Jobs not streaming"

- Check Redis pub/sub is working: `redis-cli PSUBSCRIBE "job:event:*"`
- Verify worker is publishing to correct channel
- Check network connectivity

### "High latency"

- Reduce checkpoint interval for faster updates
- Enable Redis persistence for production
- Scale horizontally with Redis adapter

## Production Checklist

- [ ] Set strong JWT_SECRET
- [ ] Enable Redis persistence (AOF/RDB)
- [ ] Setup Redis cluster for HA
- [ ] Add rate limiting
- [ ] Enable compression
- [ ] Setup monitoring (Prometheus/Grafana)
- [ ] Add error tracking (Sentry)
- [ ] Configure CORS properly
- [ ] Use HTTPS/WSS
- [ ] Add health checks
- [ ] Setup graceful shutdown
- [ ] Test failover scenarios

## Next Steps

1. **Part 7**: Create one-click demo script
2. **Part 8**: Polish for YC demo
3. **Deploy**: Production deployment guide
4. **Scale**: Horizontal scaling with PM2/K8s
