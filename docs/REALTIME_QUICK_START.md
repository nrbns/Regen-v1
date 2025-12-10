# Real-Time Layer Quick Start

## 🚀 5-Minute Setup

### 1. Install Dependencies

```bash
npm install socket.io socket.io-client @socket.io/redis-adapter
```

### 2. Start Redis

```bash
docker run -d --name regen-redis -p 6379:6379 redis:7-alpine
```

### 3. Add to Server

```javascript
// server/index.js or server/app.js
const express = require('express');
const { initSocketIOServer } = require('./realtime');
const jobsRouter = require('./api/jobs');

const app = express();
const { server, io } = initSocketIOServer(app);

// Mount job API
app.use('/api/job', jobsRouter);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Socket.IO: ws://localhost:${PORT}`);
});
```

### 4. Use in Client

```typescript
// src/components/SomeComponent.tsx
import { socketService } from '../services/realtime/socketService';
import { EVENTS } from '../../../packages/shared/events';
import { useEffect, useState } from 'react';

export function MyComponent() {
  const [results, setResults] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Listen to connection status
    const unsubStatus = socketService.onConnectionStatusChange(setConnected);

    // Listen to search results
    const unsub = socketService.on(EVENTS.SEARCH_RESULT, (data) => {
      setResults(prev => [...prev, data.result]);
    });

    return () => {
      unsub();
      unsubStatus();
    };
  }, []);

  const handleSearch = () => {
    socketService.startSearch('my query');
  };

  return (
    <div>
      <div>Status: {connected ? '🟢' : '🔴'}</div>
      <button onClick={handleSearch}>Search</button>
    </div>
  );
}
```

### 5. Update Worker

```javascript
// server/services/queue/myWorker.js
const { publishModelChunk } = require('../../pubsub/redis-pubsub');

async function processJob(job) {
  const { jobId, userId } = job.data;

  // Stream chunks
  for (const chunk of chunks) {
    await publishModelChunk(jobId, userId, chunk, index, total);
  }
}
```

## ✅ Done!

Your real-time layer is now active. Events flow:
**Worker → Redis → Socket.IO → Client**

## 🧪 Test It

```bash
# Load test
node scripts/load-test-socket.js 50 30

# Integration test
npm run test:realtime
```

## 📚 Next Steps

- Replace polling endpoints
- Add connection status UI
- Wire analytics
- Add job resume

See `docs/REALTIME_LAYER_INTEGRATION.md` for details.
