# Battle Plan Status - Regen Browser Investor Readiness

**Last Updated**: 2024-12-11  
**Goal**: Make Regen the offline-first Agentic Browser for India with real-time multi-step agents, encrypted sync, and India-first skills marketplace.

---

## ✅ Completed (Already in Repo)

### PR1: Shared Events + Constants ✅

- **File**: `packages/shared/events.js` ✅
- **Status**: Complete with all event types (MODEL_CHUNK, MODEL_COMPLETE, SEARCH_RESULT, etc.)
- **Test**: Unit test recommended but not blocking

### PR2: Realtime Server ✅

- **File**: `server/realtime.js` ✅
- **Status**: Complete with Socket.IO, Redis adapter, JWT auth, event forwarding
- **Features**: Multi-instance support, Redis pub/sub, user rooms, session management
- **Action**: Needs Redis pub/sub subscription to `job:*` pattern (psubscribe)

### PR4: Client Socket Service ✅

- **File**: `src/services/realtime/socketService.ts` ✅
- **Status**: Complete with auto-reconnect, offline queue, event listeners
- **Action**: Verify all UI components use socket instead of polling

### PR5: Job Persistence (Partial) ⚠️

- **File**: `server/jobs/persistence.js` ✅
- **File**: `server/api/jobs.js` ✅
- **Status**: API exists but DB migrations missing
- **Action**: Create SQLite/Postgres migration for jobs table

### PR3: Worker Streaming (Partial) ⚠️

- **Files**: `server/services/queue/llmWorker.js`, `researchWorker.js` ✅
- **Status**: Workers publish events but need standardized Redis channel format
- **Action**: Standardize `redis.publish('job:<jobId>', {...})` format

---

## 🚧 Needs Work

### PR3: Worker Redis Pub/Sub Enhancement

**Priority**: HIGH  
**Status**: Workers publish but format needs standardization

**Current State**:

- `llmWorker.js` calls `publishModelChunk()` - need to verify it publishes to `job:<jobId>`
- `researchWorker.js` calls `publishEvent()` - need to standardize channel format

**Required Changes**:

1. Standardize all worker publishes to: `redis.publish('job:<jobId>', JSON.stringify({ event, data }))`
2. Ensure events match `packages/shared/events.js` constants
3. Add checkpoint persistence every N chunks

### PR5: DB Migrations for Job Persistence

**Priority**: HIGH  
**Status**: Missing

**Required File**: `server/db/migrations/001_create_jobs_table.sql`

```sql
CREATE TABLE IF NOT EXISTS jobs (
  job_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  last_sequence INTEGER DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
```

### PR6: Playwright E2E Tests

**Priority**: HIGH  
**Status**: Missing

**Required File**: `tests/e2e/stream-reconnect.spec.ts`

### PR7: k6 Load Test + CI

**Priority**: MEDIUM  
**Status**: Missing

**Required Files**:

- `tests/load/k6-streaming.js`
- `.github/workflows/k6-smoke.yml`

### PR8: PWA Manifest & Mesh Sync

**Priority**: MEDIUM  
**Status**: Partial (PWA manifest exists, mesh sync stub needed)

**Current**: `public/manifest.json` exists ✅  
**Missing**: `server/sync/mesh.js` stub for encrypted diffs

### PR9: Skills SDK + Sample

**Priority**: MEDIUM  
**Status**: Skills engine exists but SDK package missing

**Current**: `src/services/skills/` exists ✅  
**Missing**: `packages/skills-sdk/` package for external developers

### PR10: Demo Script

**Priority**: LOW  
**Status**: Missing

**Required File**: `scripts/run-demo.sh` or `scripts/run-demo.js`

---

## 🎯 Immediate Actions (This Session)

1. ✅ Generate DB migration for jobs table
2. ✅ Enhance workers to use standardized Redis pub/sub
3. ✅ Create Playwright E2E test for streaming + reconnect
4. ✅ Create k6 load test script
5. ✅ Create demo script

---

## 📊 Test Metrics Targets

After implementing PRs 1-7:

- **Socket latency**: p95 < 100ms for MODEL_CHUNK events
- **Job resume success**: 100% success rate in 10 reconnect tests
- **Load test**: 200 VUs, p95 < 500ms, memory < 75%
- **Cancel correctness**: Cancel → worker stops within 2s, state = 'cancelled'
- **Mobile PWA**: Install + background resume works

---

## 🔐 Security & Legal (Pre-Beta) ✅

- [x] `LEGAL.md` with LLM license list (Ollama, Qwen, OpenAI, etc.) ✅
- [ ] CSP fixes (allow required fonts, move inline styles) - Review needed
- [x] Rate limiting for START_SEARCH (5/min per JWT) ✅ `server/middleware/rateLimiter.ts`
- [ ] `npm audit` fix high/critical - Run: `npm audit`
- [ ] Opt-in Sentry/telemetry - Optional enhancement

---

## 📅 Timeline Estimate

With current state:

- **PR3 + PR5 enhancements**: 1-2 days
- **PR6 E2E tests**: 2-3 days
- **PR7 k6 + CI**: 1-2 days
- **PR8-10**: 3-5 days (can parallelize)

**Total**: 1-2 weeks to complete all PRs
