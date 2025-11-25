# Regen × Redix Memory Kit

Zero-cloud, mode-aware memory infrastructure for Regen. This bundle includes:

- Dockerized FastAPI stack (Postgres + Qdrant + Redis) with ONNX embeddings
- Browser extension (Manifest V3) for tab/session ingestion and omnibar recall
- Redis-backed worker stubs for future async embedding and decay sweeps
- MCP tool descriptors and HTTP examples for quick RAG integration

## 1. Prerequisites

- Docker Desktop or compatible engine
- Node-free workflow (extension is vanilla JavaScript)
- Python 3.12 (only if running the server outside Docker)

## 2. Quickstart

```bash
cd regen-redix-memory-kit
docker compose up -d
```

1. Load the extension:
   - Chrome → `chrome://extensions` → **Load unpacked** → `extension/`
2. Seed settings in devtools console:
   ```js
   chrome.storage.local.set({
     MEMORY_BASE: 'http://localhost:8080',
     JWT: 'dev',
     SYNC_ENABLED: true,
     MODE: 'research',
     TENANT: 'dev',
     USER: 'u42',
   });
   ```
3. Browse any page, press `Ctrl+Shift+M` to cycle modes, `Alt + drag` to highlight and store notes.
4. Hit `Ctrl+Shift+K` to open the omnibar and query your memories.

## 3. API Surface

- `POST /v1/memory.write` — Ingests tab, note, and chat events.
- `POST /v1/memory.search` — Hybrid vector search with optional payload return.
- `GET /healthz` — Basic readiness check.

See `examples.http` for test requests.

### 3.1 PII Guardrail

The ingestion pipeline auto-flags emails, phone numbers, IPv4 addresses, SSNs, and credit-card-like strings. Detected values are stored under `pii.auto` in the memory record.  
Set `PII_REJECT_SEVERITY` to decide which matches block writes (`none`, `low`, `medium`, `high`).  
Default is `high`, so SSNs/credit cards return `422` unless you explicitly allow them.

### 3.2 Frame Embeds

Some data sources lock down `X-Frame-Options`. The desktop shell strips those headers for a small allow-list (TradingView, YouTube, Vimeo, Google Calendar, Spotify).  
Add more hosts with `IFRAME_ALLOWLIST=example.com,sub.domain.com` before launching Electron to relax framing for additional domains.

### 3.3 Local Queue Encryption

Queued memories in the extension are encrypted at rest using `crypto.subtle` (AES-GCM 256).  
The key lives in `chrome.storage.local` and rotates automatically if import fails. Legacy plaintext queues are migrated on first load.

## 4. Extension Overview

- `background.js` handles queueing, throttled flushes, and mode cycling.
- `content.js` captures tab snapshots and highlights, injecting the omnibar UI from `omnibar.js`.
- `api.js` abstracts auth + fetch with dev-friendly defaults.
- `idb.js` currently stores the queue in `chrome.storage.local`; swap with IndexedDB for higher throughput later.
- `mcp-tools.json` defines the MCP surface for Grok/DevBot integrations.

## 5. Workers

- `workers.embed` listens to a Redis stream (`memory:queue`) for async embedding (disabled until producer is wired).
- `workers.decay` prunes unpinned memories after `DECAY_HOURS` (default 720 hours / 30 days).

Set `ASYNC_EMBED=true` (default in `docker-compose.yml`) to route writes through Redis and let `workers.embed` handle vectorization. Disable the worker and toggle the flag off if you prefer inline embeddings.

## 6. Next Steps

- Add `/admin` React micro-frontend for smoke debugging and decay dashboards.
- Wire background.js to stream into Redis for async embedding (currently inline write).
- Layer WebCrypto queue encryption + consent-backed sync before turning on cloud replication.
- Extend omnibar results with pin controls and session timeline visualizations.

---

Ship questions? Ping the Grok sidebar: `memory.search("phishing playbooks")` and riff from there. 🚀
