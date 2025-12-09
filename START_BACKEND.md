# How to Start the Backend Server

The backend server runs on port 4000 and provides API endpoints and WebSocket connections.

## Quick Start

### Option 1: Start everything (Recommended)

```bash
npm run dev
```

This starts:

- Frontend web server (Vite)
- Backend server (port 4000)
- Tauri app
- LLM worker

### Option 2: Start just the backend server

```bash
npm run dev:server
```

This starts only the backend server on port 4000.

### Option 3: Manual start

```bash
node server/redix-server.js
```

## Verify Backend is Running

### Check if port 4000 is open:

```powershell
Test-NetConnection -ComputerName localhost -Port 4000
```

### Test the API:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:4000/" -UseBasicParsing
```

Or open in browser: http://127.0.0.1:4000/

### Expected Response:

```json
{
  "status": "ok",
  "service": "Redix Server",
  "version": "..."
}
```

## Troubleshooting

### Port 4000 already in use:

```powershell
# Find process using port 4000
Get-NetTCPConnection -LocalPort 4000

# Kill the process
$processId = (Get-NetTCPConnection -LocalPort 4000).OwningProcess
Stop-Process -Id $processId -Force
```

### Dependencies not installed:

```bash
npm install
```

### Server crashes on startup:

Check the console output for errors. Common issues:

- Redis not running (optional, server can run without it)
- Missing environment variables
- Port conflicts

## Environment Variables

The server uses these environment variables (all optional):

- `REDIX_PORT` - Server port (default: 4000)
- `REDIS_URL` - Redis connection URL (default: redis://127.0.0.1:6379)
- `LOG_LEVEL` - Logging level (default: info)

## Note

The server suppresses Redis connection errors, so it can run without Redis (though some features may be limited).
