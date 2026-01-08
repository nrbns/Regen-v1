# Regen Realtime System

## What It Does

The realtime system connects the web renderer to a Socket.IO server for **live job progress, streaming output, and resume-after-crash**.

- Tracks AI agent execution with per-token streaming
- Maintains connection state across network hiccups
- Persists progress through page reloads and reconnects
- Single event schema: `EVENTS` (shared across desktop + web)

## Architecture

### Web Client (`src/services/realtime/socketClient.ts`)

- **Socket.IO client** with auto-reconnect (exponential backoff)
- **Job subscription API**: `subscribeToJob(jobId, onProgress, onComplete, onError)`
- **Event emitters** for connection state (`socket:connected`, `socket:reconnecting`, `socket:disconnected`)
- **Status queries**: `isReady()`, `getStatus()`

### Hook (`src/hooks/useJobProgress.ts`)

- React hook that subscribes to a job and exposes:
  - `state` — job status (idle/running/completed/failed)
  - `isStreaming` — boolean (true during token emission)
  - `streamingText` — accumulated output
  - `connection` — socket status + retry count
  - `lastSequence` — checkpoint for resume
  - `cancel()` — send cancel signal to server

### Main Entry (`src/main.tsx`)

- Initializes `SocketClient` on app start
- Auth token pulled from `localStorage.getItem('auth:token')`
- Silently fails if no server (realtime is optional)

## Quick Start (Local Dev)

### 1. Start Redis

```powershell
# From project root
docker compose -f docker-compose.yml up -d redis
```

### 2. Start Realtime Server

```powershell
npm run dev:realtime
```

Expects `VITE_SOCKET_URL` env (defaults to `http://localhost:3000`).

### 3. Start Web App

```powershell
npm run dev:web
```

### 4. Test Connection

In browser console:

```javascript
const client = await import('./src/services/realtime/socketClient').then(m => m.getSocketClient());
console.log(client.getStatus());
// { connected: true, reconnectCount: 0, subscriptions: 0 }
```

## Integration Points

### Using Job Progress in a Component

```tsx
import { useJobProgress } from '@/hooks/useJobProgress';

export function MyAgent({ jobId }) {
  const { state, streamingText, connection, isStreaming, cancel } = useJobProgress(jobId);

  return (
    <div>
      <p>Status: {state.status}</p>
      <p>Output: {streamingText}</p>
      <p>Connection: {connection.socketStatus}</p>
      {isStreaming && <Spinner />}
      <button onClick={cancel}>Cancel</button>
    </div>
  );
}
```

### Using Realtime Status Indicator

```tsx
import { GlobalAIStatusBar } from '@/components/realtime/GlobalAIStatusBar';

<GlobalAIStatusBar />; // Always-visible status bar (top of screen)
```

### Using Job Timeline

```tsx
import { JobTimelinePanel } from '@/components/realtime/JobTimelinePanel';

<JobTimelinePanel />; // Shows running/completed jobs (bottom-right corner)
```

The Job Timeline Panel automatically:

- **Expands** when a new job starts
- **Collapses** after 5s on completion
- **Shows** job ID, status, progress %, streaming output, elapsed time
- **Stores** recent job history (last 5 jobs)
- **Persists** state in sessionStorage across page reloads
- **Displays** resume banner for paused/failed jobs

### Using Session Restore

```tsx
import { useSessionRestore, SessionRestoreBanner } from '@/hooks/useSessionRestore';

export function App() {
  const restore = useSessionRestore({
    autoSubscribe: true, // Auto-reconnect to jobs on recovery
    onRestore: session => console.log('Recovered job:', session.jobId),
  });

  return (
    <div>
      {/* Shows "Reconnecting to job (45%)..." banner during recovery */}
      <SessionRestoreBanner
        message={restore.resumeBannerText}
        onDismiss={restore.dismissBanner}
        isRestoring={restore.isRestoring}
      />
    </div>
  );
}
```

Session Restore automatically:

- **Saves** active job state (jobId, lastSequence, progress) every 2 seconds
- **Detects** saved sessions on app startup
- **Recovers** job streaming from lastSequence checkpoint
- **Shows** "Resuming from X%" banner during reconnect
- **Clears** session on job completion
- **Expires** stale sessions after 1 hour

## Event Schema (Shared)

All realtime events use the EVENTS constant from `packages/shared/events.ts`:

- `job:progress` — incremental progress
- `job:completed` — job finished
- `job:failed` — job errored
- `job:chunk` / `model:chunk:v1` — token-by-token output

## Production Build

- Web client bundled into `dist-web/`
- Desktop client at `apps/desktop/src/services/socket.ts` (separate)
- Both clients mirror the same API (for consistency)

## Next Steps

1. ✅ **Realtime Status Bar** (global connection indicator)
2. ✅ **Job Timeline Panel** (shows running/completed jobs + resume)
3. ✅ **Session Restore** (recover ongoing jobs across page reloads)
4. **Streaming Standardization** (all AI output uses `MODEL_CHUNK` events)
5. **Step-based Progress** (Thinking → Searching → Writing states)
