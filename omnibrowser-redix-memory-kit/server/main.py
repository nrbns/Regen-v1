from datetime import datetime, timezone
import os
from typing import Annotated, Any
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, validator

from db import insert_memory, vector_search  # type: ignore
from embed import embed_text  # type: ignore
from memory_queue import enqueue_memory  # type: ignore


app = FastAPI(
    title="Redix Memory API",
    description="FastAPI service for OmniBrowser memory ingestion and recall.",
    version="0.1.0",
)


JWT_SECRET = os.getenv("JWT_SECRET", "dev-super-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
ASYNC_EMBED = os.getenv("ASYNC_EMBED", "false").lower() in {"1", "true", "yes"}


class AuthContext(BaseModel):
    tenant_id: str = "dev"
    user_id: str = "u42"


def fake_auth(
    x_tenant: Annotated[str | None, Header(alias="x-tenant", default=None)] = None,
    x_user: Annotated[str | None, Header(alias="x-user", default=None)] = None,
) -> AuthContext:
    """
    Lightweight header-based auth shim for local development.
    Production should swap this with JWT-backed verification.
    """
    return AuthContext(
        tenant_id=x_tenant or "dev",
        user_id=x_user or "u42",
    )


class MemoryWriteRequest(BaseModel):
    project: str = Field(..., description="Project or namespace for the memory.")
    type: str = Field(default="tab", description="Memory item type (tab, note, chat, etc).")
    title: str | None = Field(default=None)
    text: str = Field(..., description="Primary text body used for embeddings.")
    mode: str | None = Field(default=None, description="Operational mode (research/trade/threat/etc).")
    tags: list[str] = Field(default_factory=list)
    origin: dict[str, Any] | None = None
    rich: dict[str, Any] | None = None
    acl: dict[str, Any] | None = None
    pii: dict[str, Any] | None = None

    @validator("text")
    def ensure_text_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text field cannot be empty")
        return value


class MemorySearchRequest(BaseModel):
    query: str
    top_k: int | None = Field(default=10, ge=1, le=50)
    filters: dict[str, Any] | None = Field(default_factory=dict)
    with_sources: bool | None = False


@app.post("/v1/memory.write")
def memory_write(
    payload: MemoryWriteRequest,
    auth: AuthContext = Depends(fake_auth),
):
    """
    Ingest a memory item, embed it, and fan out to Postgres + Qdrant.
    """
    memory_id = str(uuid4())
    created_at = datetime.now(timezone.utc)

    memory_data = dict(
        id=memory_id,
        tenant_id=auth.tenant_id,
        user_id=auth.user_id,
        project=payload.project,
        type=payload.type,
        title=payload.title,
        text=payload.text,
        tags=payload.tags,
        mode=payload.mode,
        origin=payload.origin,
        rich=payload.rich,
        acl=payload.acl,
        pii=payload.pii,
        created_at=created_at,
    )

    if ASYNC_EMBED:
        enqueue_memory(memory_data)
        return {"id": memory_id, "queued": True}

    embedding = embed_text(payload.text)

    insert_memory(**memory_data, embedding=embedding)

    return {"id": memory_id}


@app.post("/v1/memory.search")
def memory_search(
    payload: MemorySearchRequest,
    auth: AuthContext = Depends(fake_auth),
):
    """
    Perform a hybrid vector search scoped by tenant/user filters.
    """
    filters = payload.filters or {}
    filters.setdefault("tenant_id", auth.tenant_id)

    results = vector_search(
        query=payload.query,
        top_k=payload.top_k or 10,
        filters=filters,
        with_sources=payload.with_sources or False,
    )

    return {"results": results}


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}

