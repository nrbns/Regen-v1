# Real-Time Layer Integration Guide

## Overview

This document describes the new unified real-time layer using Socket.IO with Redis adapter for horizontal scaling.

## Architecture

```
Client (Browser)
  ↓ Socket.IO
Server (Socket.IO + Redis Adapter)
  ↓ Redis Pub/Sub
Workers (Publish events)
  ↓
Socket.IO Server (Forwards to clients)
```

## Files Created

1. **`packages/shared/events.ts`** - Shared event type definitions
2. **`server/realtime-socketio.js`** - Socket.IO server with Redis adapter
3. **`src/services/realtime/socketService.ts`** - Client Socket.IO service
4. **`server/pubsub/redis-pubsub.js`** - Enhanced Redis pub/sub for workers

## Installation

```bash
npm install socket.io socket.io-client @socket.io/redis-adapter
```

## Server Setup

### 1. Integrate Socket.IO server into your Express/Fastify app

```javascript
// server/index.js or server/app.js
const express = require('express');
const { initSocketIOServer } = require('./realtime-socketio');

const app = express();
const { server, io } = initSocketIOServer(app);

// Your existing routes...
app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO available at ws://localhost:${PORT}`);
});
```

### 2. Update workers to publish events

```javascript
// server/services/queue/llmWorker.js
const { publishModelChunk, publishModelComplete } = require('../../pubsub/redis-pubsub');

async function processLLMJob(job) {
  const { jobId, userId, prompt } = job.data;

  // Process model (example with streaming)
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Publish chunk to Redis
    await publishModelChunk(jobId, userId, chunk, i, chunks.length);
  }

  // Publish completion
  await publishModelComplete(jobId, userId, fullText, tokens, duration);
}
```

## Client Setup

### 1. Use SocketService in React components

```typescript
// src/components/SomeComponent.tsx
import { socketService } from '../services/realtime/socketService';
import { EVENTS } from '../../../packages/shared/events';
import { useEffect, useState } from 'react';

export function SomeComponent() {
  const [results, setResults] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Listen to connection status
    const unsubscribeStatus = socketService.onConnectionStatusChange(setConnected);

    // Listen to search results
    const unsubscribe = socketService.on(EVENTS.SEARCH_RESULT, (data) => {
      setResults(prev => [...prev, data.result]);
    });

    return () => {
      unsubscribe();
      unsubscribeStatus();
    };
  }, []);

  const handleSearch = () => {
    const jobId = socketService.startSearch('query here');
    console.log('Search started:', jobId);
  };

  return (
    <div>
      <div>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      <button onClick={handleSearch}>Search</button>
      {/* Render results */}
    </div>
  );
}
```

### 2. Replace polling with Socket.IO events

**Before (polling):**

```typescript
// ❌ Old way - polling every 5s
useEffect(() => {
  const interval = setInterval(async () => {
    const status = await fetch('/api/search/status').then(r => r.json());
    if (status.complete) {
      setResults(status.results);
    }
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

**After (Socket.IO):**

```typescript
// ✅ New way - real-time events
useEffect(() => {
  const unsubscribe = socketService.on(EVENTS.SEARCH_COMPLETE, data => {
    setResults(data.results);
  });
  return unsubscribe;
}, []);
```

## Event Types

All events are defined in `packages/shared/events.ts`:

- `MODEL_CHUNK` - Model streaming chunk
- `MODEL_COMPLETE` - Model completion
- `SEARCH_RESULT` - Search result received
- `SEARCH_COMPLETE` - Search completed
- `START_SEARCH` - Start search request
- `TASK_PROGRESS` - Task progress update
- `CANCEL_TASK` - Cancel task request
- `DOWNLOAD_PROGRESS` - Download progress
- `TAB_UPDATE` - Tab state update
- `USER_PRESENCE` - User presence update

## Testing

### 1. Test Socket.IO connection

```bash
# Start server
npm run dev:server

# In browser console:
import { socketService } from './src/services/realtime/socketService';
socketService.connect({ token: 'test-token' });
socketService.on('connected', (data) => console.log('Connected!', data));
```

### 2. Test event flow

```javascript
// Client
socketService.startSearch('test query');

// Server should emit:
// - search:started
// - search:result:v1 (multiple)
// - search:complete:v1
```

### 3. Test reconnection

```javascript
// Disconnect network, then reconnect
// Should see:
// - disconnected event
// - reconnecting event
// - connected event
// - Offline queue flushed
```

## Migration Checklist

- [ ] Install Socket.IO dependencies
- [ ] Integrate `server/realtime-socketio.js` into main server
- [ ] Update workers to use `server/pubsub/redis-pubsub.js`
- [ ] Replace polling in client with Socket.IO events
- [ ] Add connection status UI
- [ ] Test reconnection scenarios
- [ ] Test multi-instance (if using Redis adapter)
- [ ] Add error handling and fallbacks
- [ ] Update CSP to allow Socket.IO connections

## Environment Variables

```env
# Socket.IO server URL (client)
VITE_SOCKET_URL=http://localhost:4000

# Redis URL (server)
REDIS_URL=redis://127.0.0.1:6379

# Frontend origin (CORS)
FRONTEND_ORIGIN=http://localhost:5173

# Disable Redis (for testing without Redis)
DISABLE_REDIS=0
```

## Security

1. **JWT Authentication**: Socket.IO server verifies JWT tokens on connection
2. **CORS**: Configured in Socket.IO server options
3. **Rate Limiting**: Add rate limiting for sensitive events (e.g., `START_SEARCH`)
4. **Input Validation**: Validate all event payloads server-side

## Performance

- **Connection Pooling**: Socket.IO handles connection pooling automatically
- **Redis Adapter**: Enables horizontal scaling across multiple server instances
- **Offline Queue**: Client queues actions when offline, flushes on reconnect
- **Event Deduplication**: Events include unique IDs for deduplication

## Troubleshooting

### Connection fails

- Check `VITE_SOCKET_URL` matches server URL
- Verify CORS settings
- Check JWT token is valid

### Events not received

- Verify Redis is running (if using Redis adapter)
- Check worker is publishing to correct channel
- Verify client is subscribed to correct events

### High memory usage

- Check for memory leaks in event listeners
- Ensure proper cleanup in `useEffect` hooks
- Monitor Redis memory usage

## Next Steps

1. Replace all polling endpoints with Socket.IO events
2. Add streaming UI for model responses
3. Implement task cancellation
4. Add analytics events
5. Set up monitoring and alerts
