# Extractor Worker

Consumes raw snapshots from Kafka (`raw.pages`), strips boilerplate/HTML noise, extracts text + metadata, and produces `clean.docs` messages ready for chunking/embedding.

## Responsibilities

1. Subscribe to the `raw.pages` topic.
2. Parse HTML via `JSDOM` + `@mozilla/readability`.
3. Emit `CleanDoc` payloads with `{title, text, html, language, metadata}`.
4. Preserve provenance (snapshot_id, request_id, source_type, license, fetched_at).

## Setup

1. Create `.env` in `workers/extractor`:

```
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=regen-extractor
RAW_PAGES_TOPIC=raw.pages
CLEAN_DOCS_TOPIC=clean.docs
```

2. Install deps and run:

``+
npm install
npm run dev

```

The worker writes logs via `pino`.

## Next Steps

- Add language detection fallback (CLD3/langdetect).
- Emit chunk-level messages directly (optional).
- Enforce per-source policy (license gating) before publishing.

```
