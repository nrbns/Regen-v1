## Kafka Message Schemas

These Avro/JSON schemas formalize the payloads on the ingestion bus so services can interoperate safely. Each schema includes core provenance metadata (`request_id`, `source_id`, `license`, `fetched_at`) to support audit trails, takedowns, and incremental updates.

### 1. `RawPage` (topic: `raw.pages`)

```json
{
  "type": "record",
  "name": "RawPage",
  "namespace": "com.regen.research",
  "fields": [
    { "name": "request_id", "type": "string" },
    { "name": "url", "type": "string" },
    { "name": "status_code", "type": "int" },
    { "name": "headers", "type": { "type": "map", "values": "string" } },
    { "name": "html", "type": "string" },
    { "name": "source_type", "type": "string" },
    { "name": "fetched_at", "type": { "type": "long", "logicalType": "timestamp-millis" } },
    {
      "name": "metadata",
      "type": {
        "type": "record",
        "name": "RawMetadata",
        "fields": [
          { "name": "priority", "type": "float", "default": 1.0 },
          { "name": "crawl_depth", "type": "int", "default": 0 },
          { "name": "license", "type": ["null", "string"], "default": null },
          { "name": "etag", "type": ["null", "string"], "default": null },
          { "name": "fingerprint", "type": ["null", "string"], "default": null }
        ]
      }
    }
  ]
}
```

### 2. `CleanDoc` (topic: `clean.docs`)

```json
{
  "type": "record",
  "name": "CleanDoc",
  "namespace": "com.regen.research",
  "fields": [
    { "name": "request_id", "type": "string" },
    { "name": "url", "type": "string" },
    { "name": "title", "type": ["null", "string"], "default": null },
    { "name": "text", "type": "string" },
    { "name": "html", "type": "string" },
    { "name": "language", "type": "string" },
    { "name": "source_type", "type": "string" },
    { "name": "fetched_at", "type": { "type": "long", "logicalType": "timestamp-millis" } },
    {
      "name": "metadata",
      "type": {
        "type": "record",
        "name": "CleanMetadata",
        "fields": [
          { "name": "author", "type": ["null", "string"], "default": null },
          {
            "name": "published_at",
            "type": ["null", { "type": "long", "logicalType": "timestamp-millis" }],
            "default": null
          },
          { "name": "license", "type": ["null", "string"], "default": null },
          {
            "name": "topics",
            "type": {
              "type": "array",
              "items": "string"
            },
            "default": []
          },
          { "name": "summary", "type": ["null", "string"], "default": null }
        ]
      }
    }
  ]
}
```

### 3. `Chunk` (topic: `chunks.ready`)

```json
{
  "type": "record",
  "name": "Chunk",
  "namespace": "com.regen.research",
  "fields": [
    { "name": "chunk_id", "type": "string" },
    { "name": "request_id", "type": "string" },
    { "name": "url", "type": "string" },
    { "name": "text", "type": "string" },
    { "name": "offset_start", "type": "int" },
    { "name": "offset_end", "type": "int" },
    { "name": "source_type", "type": "string" },
    { "name": "fetched_at", "type": { "type": "long", "logicalType": "timestamp-millis" } },
    {
      "name": "metadata",
      "type": {
        "type": "record",
        "name": "ChunkMetadata",
        "fields": [
          { "name": "heading", "type": ["null", "string"], "default": null },
          { "name": "section", "type": ["null", "string"], "default": null },
          { "name": "license", "type": ["null", "string"], "default": null },
          {
            "name": "entities",
            "type": {
              "type": "array",
              "items": "string"
            },
            "default": []
          }
        ]
      }
    }
  ]
}
```

### 4. `EmbeddingRequest` (optional topic: `embeddings.pending`)

Used when batching chunks for embedding.

```json
{
  "type": "record",
  "name": "EmbeddingRequest",
  "namespace": "com.regen.research",
  "fields": [
    { "name": "chunk_id", "type": "string" },
    { "name": "text", "type": "string" },
    { "name": "model_hint", "type": ["null", "string"], "default": null },
    { "name": "source_type", "type": "string" }
  ]
}
```

### 5. `EmbeddingResult` (topic: `embeddings.ready`)

```json
{
  "type": "record",
  "name": "EmbeddingResult",
  "namespace": "com.regen.research",
  "fields": [
    { "name": "chunk_id", "type": "string" },
    {
      "name": "vector",
      "type": {
        "type": "array",
        "items": "float"
      }
    },
    { "name": "model", "type": "string" },
    { "name": "dim", "type": "int" },
    { "name": "created_at", "type": { "type": "long", "logicalType": "timestamp-millis" } }
  ]
}
```

### 6. `ModerationFlag` (topic: `moderation.flags`)

```json
{
  "type": "record",
  "name": "ModerationFlag",
  "namespace": "com.regen.research",
  "fields": [
    { "name": "request_id", "type": "string" },
    { "name": "url", "type": "string" },
    { "name": "reason", "type": "string" },
    { "name": "severity", "type": "string" },
    { "name": "created_at", "type": { "type": "long", "logicalType": "timestamp-millis" } }
  ]
}
```

### Notes

- All timestamps use Avro `timestamp-millis` logical type.
- For JSON-based pipelines (if Avro tooling unavailable), use the same field names/types in JSON Schema; avoid optional fields by using `null` defaults.
- Add headers to Kafka messages for quicker routing:
  - `source_id`, `license`, `crawl_batch`, `retry_count`, `hash`.
- Schema registry: Confluent Schema Registry or equivalent (Redpanda, Karapace).



