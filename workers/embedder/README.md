# Embedder Worker

Consumes chunk messages and produces vector embeddings + index writes for real-time retrieval.

## Responsibilities

- Batch `chunks.ready` payloads and run them through an embedding provider (mock or OpenAI).
- Publish `embeddings.ready` messages with vector + model metadata.
- Optionally upsert vectors into Qdrant via the REST API (default is `noop` writer).

## Configuration

Environment variables (see `.env.example` pattern):

```
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=regen-embedder
CHUNKS_TOPIC=chunks.ready
EMBEDDINGS_TOPIC=embeddings.ready
BATCH_SIZE=32
FLUSH_INTERVAL_MS=2000
EMBEDDING_PROVIDER=mock            # or openai
OPENAI_API_KEY=sk-...
OPENAI_EMBED_MODEL=text-embedding-3-small
INDEX_WRITER=noop                  # or qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=YOUR_KEY
QDRANT_COLLECTION=regen_chunks
```

## Development

```
cd workers/embedder
npm install
npm run dev
```

With `EMBEDDING_PROVIDER=mock` everything runs locally without external calls. Switch to `openai` + `INDEX_WRITER=qdrant` for full pipeline integration.

