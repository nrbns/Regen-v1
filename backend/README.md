# OmniBrowser Backend

**Status**: Architecture complete, implementation pending

## Architecture

- **API**: Fastify + WebSocket (TypeScript)
- **Database**: PostgreSQL (Prisma)
- **Queue**: Redis (BullMQ) or NATS
- **Storage**: S3/MinIO
- **Auth**: JWT + PKCE + E2EE

## Services

### Core Services
- `apps/api/` - HTTP + WebSocket API
- `apps/worker/` - Background job processors
- `apps/updater/` - Electron auto-update CDN
- `apps/signer/` - Plugin/package signing

### Packages
- `packages/contracts/` - OpenAPI + Zod schemas
- `packages/db/` - Prisma schema
- `packages/auth/` - JWT utilities
- `packages/queue/` - Job queue types

## API Endpoints (v1)

### Auth
- `POST /v1/auth/register`
- `POST /v1/auth/device`
- `GET /v1/auth/session`

### Workspaces
- `GET /v1/workspaces`
- `POST /v1/workspaces`
- `GET /v1/workspaces/:id`
- `PUT /v1/workspaces/:id/manifest`
- `POST /v1/workspaces/:id/artifacts`

### Plugins
- `GET /v1/plugins`
- `GET /v1/plugins/:id`
- `POST /v1/plugins/verify`

### Jobs
- `POST /v1/jobs`
- `GET /v1/jobs/:id`
- `WS /v1/jobs/:id/stream`

### Consent Ledger
- `POST /v1/ledger` (batch append)
- `GET /v1/ledger?since=...`

### Threat Proxy
- `POST /v1/threats/lookup`

## Security

- Tenant isolation (userId scoping)
- OAuth 2.1 + PKCE
- JWT (short-lived) + Refresh tokens
- E2EE for workspace payloads
- mTLS (internal services)
- Rate limiting (Redis sliding window)

## Deployment

### Development
```bash
docker-compose up
```

### Production
- Kubernetes (Helm charts)
- HPA for workers
- Rolling updates
- Sealed secrets

## Next Steps

1. Initialize Fastify API structure
2. Setup Prisma schema
3. Implement auth endpoints
4. Create workspace sync endpoints
5. Setup Redis queue workers
6. Configure MinIO/S3 storage

