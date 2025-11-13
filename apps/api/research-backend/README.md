# OmniBrowser Research Mode Backend

Production-ready backend for Research Mode with realtime streaming, vector search, and document ingestion.

## Architecture

- **API**: FastAPI with SSE streaming
- **Workers**: Celery + Redis for async tasks
- **Vector DB**: Qdrant (can switch to Pinecone/pgvector)
- **Database**: Postgres for metadata
- **Cache**: Redis for embeddings & query results
- **Storage**: S3-compatible (MinIO for dev, AWS S3 for prod)

## Quick Start

### Prerequisites

- Python 3.11+
- Docker & Docker Compose
- Redis (via Docker)
- Postgres (via Docker)
- Qdrant (via Docker)

### Development Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Start infrastructure (Redis, Postgres, Qdrant, MinIO)
docker-compose up -d

# Run migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --port 8000

# Start Celery worker (in separate terminal)
celery -A app.workers.celery_app worker --loglevel=info

# Start Celery beat for scheduled tasks (optional)
celery -A app.workers.celery_app beat --loglevel=info
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/research_db

# Redis
REDIS_URL=redis://localhost:6379/0

# Vector DB
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Storage
S3_ENDPOINT_URL=http://localhost:9000  # MinIO for dev
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=research-documents

# Embeddings
EMBEDDING_PROVIDER=openai  # or local
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small

# LLM
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4-turbo-preview

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret
```

## API Endpoints

### Upload & Ingestion

- `POST /api/v1/upload` - Upload file, returns presigned URL or job_id
- `POST /api/v1/ingest/start` - Start ingestion job
- `GET /api/v1/ingest/status/{ingest_id}` - Check ingestion status

### Query & Search

- `POST /api/v1/query` - Submit query, returns query_id and stream_url
- `GET /api/v1/stream?query_id={id}` - SSE stream for query results
- `POST /api/v1/query/cancel` - Cancel running query

### Documents & Sources

- `GET /api/v1/documents` - List documents in workspace
- `GET /api/v1/source/{doc_id}` - Get document source (presigned URL)
- `DELETE /api/v1/documents/{doc_id}` - Delete document

## Project Structure

```
app/
├── main.py                 # FastAPI app entry
├── api/
│   ├── v1/
│   │   ├── upload.py      # Upload endpoints
│   │   ├── ingest.py       # Ingestion endpoints
│   │   ├── query.py        # Query endpoints
│   │   └── stream.py       # SSE streaming
│   └── auth.py             # Auth middleware
├── core/
│   ├── config.py           # Settings
│   ├── db.py               # Database connection
│   └── security.py         # Auth & encryption
├── models/
│   ├── document.py         # Document models
│   ├── chunk.py             # Chunk models
│   └── query.py             # Query models
├── services/
│   ├── storage.py          # S3 operations
│   ├── embedding.py         # Embedding service
│   ├── vector_db.py         # Vector DB client
│   ├── retrieval.py         # RAG retrieval
│   └── llm.py               # LLM streaming
├── workers/
│   ├── celery_app.py       # Celery app
│   ├── ingestion.py        # Ingestion tasks
│   └── embedding.py        # Embedding tasks
└── utils/
    ├── parsers.py          # PDF/HTML parsers
    └── chunking.py         # Text chunking
```

## Development

### Running Tests

```bash
pytest tests/ -v
```

### Code Quality

```bash
black app/
isort app/
mypy app/
```

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

## Deployment

See `deploy/` directory for:
- Kubernetes manifests
- Terraform infrastructure
- Docker production configs

## Monitoring

- Prometheus metrics: `http://localhost:8000/metrics`
- Health check: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`

