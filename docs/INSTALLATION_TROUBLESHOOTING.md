# Installation Troubleshooting Guide

**Last Updated**: December 17, 2025

This guide helps resolve common installation and setup issues for Omnibrowser.

---

## Quick Diagnosis

Run the demo script to check all dependencies:

```bash
# Windows
npm run demo:ps1

# macOS/Linux
npm run demo:sh
```

---

## Common Issues

### 1. Redis Not Found

**Symptoms:**

- Error: `Redis not found`
- Demo script fails dependency check

**Solutions:**

**Windows:**

```powershell
# Option 1: Use Windows Subsystem for Linux (WSL)
wsl --install
wsl
sudo apt update
sudo apt install redis-server
redis-server

# Option 2: Use Docker
docker run -d -p 6379:6379 redis:7-alpine

# Option 3: Download from GitHub
# Visit: https://github.com/microsoftarchive/redis/releases
```

**macOS:**

```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**Verify:**

```bash
redis-cli ping
# Should return: PONG
```

---

### 2. Redis Running But Can't Connect

**Symptoms:**

- `redis-cli ping` returns `PONG`
- App shows "Redis connection failed"

**Solutions:**

1. Check Redis is listening on correct port:

```bash
redis-cli -h localhost -p 6379 ping
```

2. Check firewall isn't blocking port 6379:

```bash
# Windows
netsh advfirewall firewall add rule name="Redis" dir=in action=allow protocol=TCP localport=6379

# Linux
sudo ufw allow 6379/tcp
```

3. Check REDIS_URL environment variable:

```bash
# Should be: redis://localhost:6379
echo $REDIS_URL  # Unix
echo %REDIS_URL%  # Windows CMD
$env:REDIS_URL  # Windows PowerShell
```

4. Try connecting with full URL:

```bash
redis-cli -u redis://localhost:6379 ping
```

---

### 3. Node.js Version Mismatch

**Symptoms:**

- Error: `Node.js version X is too old (need v18+)`
- Build fails with syntax errors

**Solutions:**

**Option 1: Install latest Node.js**

- Visit: https://nodejs.org/
- Download LTS version (v18 or newer)

**Option 2: Use Node Version Manager (nvm)**

```bash
# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Windows (nvm-windows)
# Download from: https://github.com/coreybutler/nvm-windows/releases
nvm install 18
nvm use 18
```

**Verify:**

```bash
node --version
# Should show: v18.x.x or newer
```

---

### 4. Port Already in Use

**Symptoms:**

- Error: `EADDRINUSE: address already in use :::3000`
- Server won't start

**Solutions:**

**Find what's using the port:**

```bash
# Windows
netstat -ano | findstr :3000
# Note the PID, then:
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

**Change the port:**

```bash
# Set in .env file
PORT=3001

# Or run with custom port
PORT=3001 npm run dev:realtime
```

---

### 5. npm install Fails

**Symptoms:**

- Errors during `npm install`
- `ERESOLVE` dependency conflicts

**Solutions:**

1. Clear npm cache:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

2. Use legacy peer deps:

```bash
npm install --legacy-peer-deps
```

3. Check Node.js version (see #3 above)

4. Check disk space:

```bash
# Windows
dir C:\
# Unix
df -h
```

---

### 6. TypeScript Build Errors

**Symptoms:**

- `npm run build` fails with type errors
- Out of memory during typecheck

**Solutions:**

1. Increase Node.js heap:

```bash
# Already configured in package.json (6GB)
# If still failing, increase to 8GB:
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit
```

2. Skip type checking temporarily:

```bash
npm run build -- --mode production
```

3. Clean build cache:

```bash
rm -rf dist dist-web .vite
npm run build
```

---

### 7. Socket.IO Connection Issues

**Symptoms:**

- Frontend shows "Disconnected" status
- Console errors: `WebSocket connection failed`

**Solutions:**

1. Check server is running:

```bash
curl http://localhost:3000/health
```

2. Check Socket.IO port matches:

```bash
# In .env
VITE_SOCKET_URL=http://localhost:3000
```

3. Check CORS settings in server:

```typescript
// server/index.ts should have:
cors: {
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}
```

4. Try polling transport:

```typescript
// apps/desktop/src/services/socket.ts
transports: ['polling', 'websocket'];
```

---

### 8. First Run Tour Not Showing

**Symptoms:**

- Tour doesn't appear on first launch
- Want to see tour again

**Solutions:**

1. Clear tour completion flag:

```javascript
// In browser console:
localStorage.removeItem('omnibrowser:tour:completed');
// Refresh page
```

2. Force tour to show:

```typescript
// In main app file, add:
<FirstRunTour onComplete={() => {}} onSkip={() => {}} />
```

---

### 9. Job Logs Not Appearing

**Symptoms:**

- "View logs" shows empty modal
- No logs in Redis

**Solutions:**

1. Check Redis is running (see #1)

2. Verify worker is initializing publisher:

```typescript
// In worker file:
import { initJobPublisher } from './jobPublisher';
initJobPublisher(redis);
```

3. Check Redis keys:

```bash
redis-cli
> KEYS job:logs:*
> LRANGE job:logs:<jobId> 0 -1
```

---

### 10. Performance Issues

**Symptoms:**

- Slow UI rendering
- High CPU usage
- Memory leaks

**Solutions:**

1. Disable heavy services:

```bash
OB_DISABLE_HEAVY_SERVICES=1 npm run dev:web
```

2. Clear browser cache and localStorage

3. Check for stale jobs:

```bash
redis-cli
> KEYS job:*
# If too many, clear:
> FLUSHDB
```

4. Monitor memory:

```bash
# Windows
tasklist | findstr node

# Unix
ps aux | grep node
```

---

## Environment Variables

Create `.env` file in project root:

```env
# Server
PORT=3000
JWT_SECRET=your-secret-key-change-in-production

# Redis
REDIS_URL=redis://localhost:6379

# Frontend
VITE_SOCKET_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000/api
```

---

## Getting Help

If none of these solutions work:

1. **Check logs:**
   - Server: Look for errors in terminal running `npm run dev:realtime`
   - Frontend: Open browser DevTools (F12) → Console tab
   - Redis: `redis-cli MONITOR`

2. **Create GitHub issue:**
   - Visit: https://github.com/your-org/omnibrowser/issues
   - Include: OS, Node version, error messages, steps to reproduce

3. **Join Discord/Slack:**
   - Real-time help from community
   - Share screenshots and logs

---

## Clean Reinstall

Nuclear option if nothing else works:

```bash
# Stop all services
npm run kill:dev

# Remove everything
rm -rf node_modules package-lock.json dist dist-web .vite

# Clear Redis
redis-cli FLUSHALL

# Reinstall
npm install

# Rebuild
npm run build

# Start fresh
npm run demo:ps1  # or demo:sh
```

---

## System Requirements

**Minimum:**

- Node.js v18+
- Redis 5+
- 4GB RAM
- 2GB free disk space

**Recommended:**

- Node.js v20+
- Redis 7+
- 8GB RAM
- 10GB free disk space
- SSD (for faster builds)

---

**Still having issues?** See [docs/DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for advanced debugging.
