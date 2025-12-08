# Chunker Worker

Consumes cleaned documents (`clean.docs` topic) and emits chunk payloads suitable for embedding/indexing.

## Features

- Simple whitespace tokenizer with configurable chunk size (default 400 tokens) and overlap (40 tokens).
- Preserves provenance (snapshot_id, offsets, metadata) for each chunk.
- Publishes `chunks.ready` messages to Kafka using the schema from `docs/kafka-schemas.md`.

## Setup

`.env` fields:

```
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=regen-chunker
CLEAN_DOCS_TOPIC=clean.docs
CHUNKS_TOPIC=chunks.ready
MAX_TOKENS_PER_CHUNK=400
CHUNK_OVERLAP_TOKENS=40
```

Install & run:

```
cd workers/chunker
npm install
npm run dev
```

## Roadmap

- Improve tokenizer (sentence-aware, heading-based splits).
- Support dynamic chunk sizing per source_type.
- Emit chunk hashes for deduplication / change detection.






