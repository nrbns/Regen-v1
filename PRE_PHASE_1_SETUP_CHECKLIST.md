# ⚠️ CRITICAL BLOCKERS: Answer These Before PHASE 1

## 1️⃣ DATABASE

**Question:** What's your job storage right now?

```bash
# Check what's in server/
ls -la server/db/
ls -la server/migrations/
```

**You need:**
- [ ] PostgreSQL (or SQLite for dev)
- [ ] Schema for `jobs` table
- [ ] Migrations setup

**If you don't have it:**
```bash
# Option A: Use existing setup
cat server/db/schema.sql

# Option B: Create from scratch
npm run db:init
```

**Decision point:** PostgreSQL or SQLite?
- **SQLite:** Faster to start, good for dev/single-machine
- **PostgreSQL:** Required for production/horizontal scaling

---

## 2️⃣ REDIS

**Question:** Is Redis available?

```bash
redis-cli ping
# Expected: PONG

redis-cli KEYS "*"
# Should show nothing (fresh Redis)
```

**You need:**
- [ ] Redis running locally (dev) or cloud (prod)
- [ ] Redis client initialized in `server/realtime.ts`

**If you don't have it:**
```bash
# macOS
brew install redis
brew services start redis

# Docker
docker run -d -p 6379:6379 redis:latest

# Or use cloud: Redis Cloud (free tier)
```

**Decision point:** Local or cloud Redis?
- **Local:** Good for dev, Regen can work standalone
- **Cloud:** Required if you want workers on separate machines

---

## 3️⃣ WORKER ARCHITECTURE

**Question:** How are workers deployed right now?

```bash
# Where are workers running?
ps aux | grep worker
ps aux | grep "npm"

# What does a worker look like?
ls -la workers/
```

**You need to answer:**
- [ ] Are workers in same process as server? (monolithic)
- [ ] Are workers separate processes? (Bullmq/RabbitMQ?)
- [ ] Are workers managed by supervisor (PM2, systemd)?

**If monolithic (workers in same process):**
- Add worker pool manager
- Each job spawns a worker thread
- Heartbeat to supervisor

**If distributed (workers separate):**
- Use Redis queue already (perfect)
- Add supervisor to detect dead workers
- Implement recovery logic

**Decision point:** Stay monolithic or go distributed?
- **Monolithic:** Simpler, good for single-machine, Regen desktop version
- **Distributed:** Needed for production server, multi-user

---

## 4️⃣ JOB CHECKPOINTING

**Question:** Can jobs currently resume from checkpoint?

```bash
# Check current job structure
grep -r "checkpoint" server/jobs/

# If nothing found: you need to add it
```

**You need:**
- [ ] Database schema includes `checkpoint_data` column
- [ ] Worker saves state before pausing
- [ ] Resume handler loads from checkpoint

**Example checkpoint data:**
```json
{
  "type": "research",
  "query": "quantum computing",
  "progress": 45,
  "currentStep": 3,
  "sources": [
    { "title": "...", "url": "...", "summary": "..." }
  ],
  "generatedContent": "...",
  "timestamp": 1703000000
}
```

**Decision point:** Checkpoint to database or file?
- **Database:** Durable, queryable, cloud-ready
- **File:** Simple, but harder to query

---

## 5️⃣ REALTIME INFRASTRUCTURE

**Question:** How does server tell UI about job progress right now?

```bash
# Check current implementation
grep -r "JOB_PROGRESS" server/
grep -r "socket.emit" server/

# Expected: Socket.IO events
# Gap: No Redis pub/sub
```

**You need:**
- [ ] Redis pub/sub for inter-process communication
- [ ] Socket.IO subscriptions per job
- [ ] Fallback if Redis unavailable

**Current state (likely):**
```
Worker → Socket.IO → UI
```

**After PHASE 1:**
```
Worker → Redis → Socket.IO → UI
              ↓
         Database (backup)
```

**Decision point:** Keep simple or add Redis?
- **Simple:** Works for single-machine, easier to debug
- **Redis:** Needed for reliability, scaling, multi-worker

---

## 📋 CHECKLIST: Can You Start PHASE 1?

Answer each:

- [ ] **Database:** PostgreSQL or SQLite available?
- [ ] **Redis:** Running and accessible?
- [ ] **Workers:** Understand current architecture (monolithic/distributed)?
- [ ] **Schema:** Can you run migrations?
- [ ] **API:** Do jobs table exist?

### If you answered YES to all 5:
→ **START PHASE 1A TODAY** (System Core)

### If you answered NO to any:
→ **FIRST:** Setup that dependency, then start

---

## 🔧 FASTEST PATH: Quick Setup

If you want to start TODAY without setting up infrastructure:

```bash
# 1. SQLite (built-in, no setup)
# 2. In-memory job store (development)
# 3. Single worker thread (no supervisor yet)

# This lets you build PHASE 1 logic without infrastructure
# Then add real DB/Redis once core logic is solid
```

**This trades durability for speed initially. Fine for Days 1-3.**

---

## ❓ WHAT TO DO NOW

1. **Copy-paste this checklist**
2. **Answer each question in your context**
3. **Run the verification commands** (top of each section)
4. **Report blockers** (if any are red flags)

**Then → I'll give you exact implementation steps for PHASE 1A**

---

**Send back:**
```
DATABASE: [PostgreSQL / SQLite / None]
REDIS: [Running / Cloud / None]
WORKERS: [Monolithic / Distributed / Unknown]
CHECKPOINTING: [Exists / Partial / None]
REALTIME: [Socket.IO only / With Redis / Unknown]

Blockers: [None / List any]
```

**Then we build PHASE 1 together.**
