# Fetcher Worker

Initial implementation of the real-time ingestion pipeline. This service:

1. Maintains a simple Redis-backed frontier (`FrontierQueue`) used to schedule URLs with priorities.
2. Fetches pages with a custom user-agent, respecting basic robots.txt rules (via `robots-txt-guard`).
3. Stores raw snapshots to S3 (HTML + metadata JSON).
4. Publishes `RawPage` messages to Kafka (`raw.pages` topic) for downstream extractor/chunker workers.

## Configuration

Create a `.env` file inside `workers/fetcher` with:

```
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=regen-fetcher
RAW_PAGES_TOPIC=raw.pages
FRONTIER_REDIS_URL=redis://localhost:6379
SNAPSHOT_BUCKET=your-bucket-name
AWS_REGION=us-east-1
MAX_CONCURRENCY=4
USER_AGENT=RegenFetcher/0.1 (+https://regen.dev)
```

## Development

```
cd workers/fetcher
npm install
npm run dev
```

The dev command uses `ts-node` to run `src/index.ts`.

## Roadmap

- Integrate RSS/Wikimedia connectors into `runScheduler`.
- Add dynamic backoff and error classification.
- Emit metrics (Prometheus) for fetch latency, success/failure counts.
- Extend snapshot metadata to include checksum / diff indicators.



