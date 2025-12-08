# API Configuration from .env

## ✅ Configuration Status

The API endpoints are now properly configured to read from `.env` file.

## Frontend Configuration

The frontend reads API base URL from environment variables in this order:
1. `window.__API_BASE_URL` (runtime override)
2. `import.meta.env.VITE_API_BASE_URL` (from .env)
3. `import.meta.env.VITE_APP_API_URL` (from .env, fallback)
4. Default: `http://127.0.0.1:4000`

**Files updated:**
- `src/lib/api-client.ts` - Main API client
- `src/services/summarizeService.ts` - Summarize service

## Backend Configuration

The backend server reads configuration from environment variables:
- `REDIX_PORT` - Server port (default: 4000)
- `REDIS_URL` - Redis connection URL (default: redis://127.0.0.1:6379)

**File:** `server/redix-server.js`

## .env Configuration

Add these to your `.env` file:

```env
# Backend API Configuration
# API Base URL (for frontend to connect to backend server)
VITE_API_BASE_URL=http://127.0.0.1:4000
VITE_APP_API_URL=http://127.0.0.1:4000

# Backend Server Port (for server to listen on)
REDIX_PORT=4000

# Redis Configuration
REDIS_URL=redis://127.0.0.1:6379
```

## ⚠️ Important Notes

1. **Port Matching**: Make sure `VITE_API_BASE_URL` port matches `REDIX_PORT`
   - If `VITE_API_BASE_URL=http://127.0.0.1:4000`, then `REDIX_PORT=4000`
   - If `REDIX_PORT=8001`, then `VITE_API_BASE_URL=http://127.0.0.1:8001`

2. **Vite Environment Variables**: 
   - Variables must be prefixed with `VITE_` to be accessible in frontend
   - Vite automatically loads `.env` file on startup
   - Restart dev server after changing `.env` file

3. **Server Environment Variables**:
   - Server reads from `process.env` directly
   - No prefix needed (e.g., `REDIX_PORT`, not `VITE_REDIX_PORT`)

## Verification

Run the verification script:

```bash
node scripts/check-api-config.js
```

This will:
- Check if `.env` file exists
- Verify API configuration values
- Warn if ports don't match
- Show what URLs will be used

## Current Configuration

Based on your `.env` file:
- Frontend API: `http://localhost:4000` (from VITE_API_BASE_URL)
- Backend Port: `8001` (from REDIX_PORT)
- Redis: `redis://localhost:6379/0` (from REDIS_URL)

**⚠️ Warning**: Frontend port (4000) doesn't match backend port (8001). Update your `.env`:

```env
# Option 1: Use port 4000 for both
VITE_API_BASE_URL=http://127.0.0.1:4000
REDIX_PORT=4000

# Option 2: Use port 8001 for both
VITE_API_BASE_URL=http://127.0.0.1:8001
REDIX_PORT=8001
```

## Testing

1. Start the backend server:
   ```bash
   cd server
   REDIX_PORT=4000 node redix-server.js
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. The frontend will automatically connect to the backend using the configured URL from `.env`.




