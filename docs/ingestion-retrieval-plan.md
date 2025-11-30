## Real-Time Research Ingestion & Retrieval Blueprint

This document describes the service scaffolding required to support always-on ingestion, indexing, and low-latency RAG answers. It breaks the system into independent services connected via a message bus so we can scale each stage independently.

---

### 1. High-Level Topology

```
crawler scheduler ─┐
                   │
                   ▼
             [fetchers]  ─→  [raw-pages topic]
                   ▼
             [extractors / cleaners] ─→ [clean-docs topic]
                   ▼
             [chunker + metadata enricher] ─→ [chunks topic]
                   ├──→ [policy/moderation gate]
                   ▼
             [embedding workers] ─→ vector DB writes
                   ▼
             [sparse indexer] ─→ OpenSearch/BM25
                   ▼
            [provenance snapshot store (S3 + Postgres)]
```

Once indexed:

```
query API ─→ [retrieval orchestrator]
              ├──→ BM25
              ├──→ Vector ANN
              └──→ Reranker + LLM synthesizer
                          └──→ streaming / answer API
```

---

### 2. Services & Responsibilities

| Service                  | Responsibilities                                               | Stack                                      | Notes                                                |
| ------------------------ | -------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| `scheduler`              | Maintains frontier of URLs, priorities, backoff, robots rules  | Node/TS or Go service + Redis              | Stores metadata (last fetched, license)              |
| `fetcher-http`           | Fetch static pages, obeys politeness per domain                | Node worker (undici / got)                 | Outputs to `raw-pages` Kafka topic                   |
| `fetcher-headless`       | Playwright-based for JS-heavy sites                            | Node/TS w/ Playwright                      | Rate-limited, expensive; only for high-value sources |
| `rss-watcher`            | Subscribes to RSS feeds/news APIs                              | Node/TS cron or serverless                 | Emits to `raw-pages` topic                           |
| `extractor`              | Boilerplate removal, metadata extraction, license detection    | Node/TS + readability, Mercury, DOMPurify  | Enriches with language, source tags                  |
| `chunker`                | Splits doc into passages (200-600 tokens), retains offsets     | Node/TS + heuristics (heading aware)       | Emits to `chunks` topic                              |
| `policy-gate`            | Checks license/TOS flags, moderation (PII, NSFW)               | Node/TS + moderation services              | Drops or redacts disallowed content                  |
| `embedding-worker`       | Batch embeddings, writes vectors to DB                         | Python (FastAPI) or Node with provider SDK | Use Qdrant or Pinecone client                        |
| `sparse-indexer`         | Pushes chunks to OpenSearch/BM25 + TTL mgmt                    | Node/TS or Python                          | Includes time-decay scoring fields                   |
| `provenance-writer`      | Saves snapshot (HTML + screenshot) and metadata to S3/Postgres | Node/TS + AWS SDK                          | Provides retrieval by snapshot_id                    |
| `retrieval-orchestrator` | Query path: runs BM25 + ANN + reranker + LLM                   | Node/TS service or serverless              | Bounded concurrency with circuit breakers            |

---

### 3. Message Bus & Topics

Use Kafka (or Pulsar). Suggested topics:

1. `crawl.frontier` – scheduled URLs, priority.
2. `raw.pages` – raw HTML payloads.
3. `clean.docs` – sanitized doc JSON `{url, html, text, metadata}`.
4. `chunks.ready` – array of chunk objects ready for embedding.
5. `embeddings.ready` – chunk IDs with vector, ready for indexing.
6. `moderation.flags` – flagged content requiring review.

Each topic should include headers for traceability: `request_id`, `source_id`, `license`, `retry_count`.

---

### 4. Storage Layers

- **Object store (S3/MinIO)** – raw snapshots & parsed text.
- **Postgres** – metadata, provenance, crawling state, feedback, licensing policies.
- **Vector DB** – Qdrant/Pinecone/Milvus (start with Qdrant for self-hosted control). Use collections per source or per time-slice if we expect >100M vectors.
- **OpenSearch** – BM25 index with fields: `content`, `title`, `url`, `source_type`, `fetched_at`, `license`.

---

### 5. Retrieval Service Outline (server/services/research)

- `retrieval/controller.js`
  - Accepts query payload, orchestrates:
    1. Launch BM25 query (OpenSearch) respect filters/time range.
    2. Launch vector query (Qdrant) with same filters (metadata filter for source_type).
    3. Combine + dedupe + score normalization.
    4. Call `reranker` (cross-encoder) to produce final ranking.

- `retrieval/reranker.js`
  - Wraps cross-encoder (e.g., Cohere re-ranker or a local HF model).
  - Accepts candidate list, returns re-scored ranking.

- `retrieval/llm-synthesizer.js`
  - Accepts top-k content, builds prompt with citation tags.
  - Streams tokens if requested.

---

### 6. Ingestion Service Interfaces

Example interface definitions (TypeScript pseudo-interfaces):

```ts
type RawPage = {
  url: string;
  status: number;
  fetchedAt: string;
  html: string;
  headers: Record<string, string>;
  sourceType: string;
  metadata: {
    priority: number;
    crawlDepth: number;
    license?: string;
  };
};

type CleanDoc = {
  url: string;
  title: string;
  text: string;
  html: string;
  language: string;
  sourceType: string;
  fetchedAt: string;
  metadata: {
    author?: string;
    publishedAt?: string;
    license?: string;
  };
};

type Chunk = {
  id: string;
  url: string;
  text: string;
  offset: {
    start: number;
    end: number;
  };
  sourceType: string;
  fetchedAt: string;
  metadata: Record<string, any>;
};
```

---

### 7. Incremental Updates & Freshness

- Keep per-URL hash (content signature). On fetch, compare; only re-embed chunks that changed.
- Use TTL/compression to expire old vectors (e.g., >365 days) or move to cold storage.
- For news/reddit connectors, maintain last seen IDs and poll via API (if streaming not available).

---

### 8. Licensing & Policy Controls

- `source_policy` table with fields `{source_id, requires_license, status, fetch_interval, tos_url}`.
- Pipeline checks `source_policy` before passing docs downstream; if `requires_license` and we lack agreement, mark doc as blocked.
- Support `enterprise` namespace for customer-provided content with access control.

---

### 9. Ops & Monitoring Hooks

- Metrics per service:
  - `crawler.active_fetchers`, `crawler.errors`, `fetch.latency_ms`.
  - `embedding.queue_depth`, `embedding.throughput`.
  - `indexer.backlog`, `vector_db.upsert_latency`.
  - `retrieval.latency_p95`, `llm.latency`, `llm.error_rate`.
- Logs with `request_id` + `source_id`.
- Health endpoints per service (Fastify/Express `/healthz`).

---

### 10. Deployment & Scaling Notes

- Use Kubernetes with separate deployments per stage (fetcher, extractor, embedding, etc.).
- KEDA can autoscale workers based on Kafka lag.
- Ensure per-domain concurrency controls via Redis tokens to avoid getting blocked.
- For streaming answers, use Node Fastify + SSE or Socket.io with backpressure handling.

---

### 11. Next Implementation Steps

1. **Define Kafka topics & schemas** (Avro/JSON) for the pipeline.
2. **Build scheduler + HTTP fetcher prototype** with robots support.
3. **Implement chunker + embedding worker** writing to Qdrant.
4. **Set up OpenSearch + Qdrant instances** and basic retrieval orchestrator service.
5. **Hook /v1 endpoints** to real retrieval once pipeline produces data.
6. **Add monitoring + feedback ingestion** to support continuous improvement.

This document should serve as the scaffolding guide for the real-time ingestion & retrieval effort. Update it as the pipeline evolves (e.g., new connectors, policy changes, streaming format updates).

