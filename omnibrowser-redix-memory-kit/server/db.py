import json
import os
from typing import Any

from sqlalchemy import JSON, Column, DateTime, Engine, Float, MetaData, String, Table, create_engine
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from sqlalchemy.engine import Connection
from sqlalchemy.exc import OperationalError

from qdrant_client import QdrantClient
from qdrant_client.http import models as rest

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://redix:redix@localhost:5432/redix")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")

engine: Engine = create_engine(DATABASE_URL, future=True)
metadata = MetaData()

memories = Table(
    "memories",
    metadata,
    Column("id", String, primary_key=True),
    Column("tenant_id", String, nullable=False, index=True),
    Column("user_id", String, nullable=False, index=True),
    Column("project", String, nullable=False, index=True),
    Column("type", String, nullable=False),
    Column("mode", String, index=True),
    Column("title", String),
    Column("text", String, nullable=False),
    Column("tags", PG_ARRAY(String), default=list),
    Column("origin", JSON),
    Column("rich", JSON),
    Column("acl", JSON),
    Column("pii", JSON),
    Column("embedding", PG_ARRAY(Float)),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

qdrant = QdrantClient(url=QDRANT_URL)


def _ensure_tables() -> None:
    with engine.begin() as conn:
        metadata.create_all(conn, checkfirst=True)


def _ensure_vector_collection() -> None:
    try:
        qdrant.get_collection("memories")
    except Exception:
        qdrant.recreate_collection(
            collection_name="memories",
            vectors_config=rest.VectorParams(size=384, distance=rest.Distance.COSINE),
        )


def init() -> None:
    _ensure_tables()
    _ensure_vector_collection()


def insert_memory(**data: Any) -> None:
    payload = data.copy()
    embedding = payload.pop("embedding")
    with engine.begin() as conn:
        conn.execute(memories.insert().values(**payload, embedding=embedding))

    qdrant.upsert(
        collection_name="memories",
        points=[
            rest.PointStruct(
                id=data["id"],
                vector=embedding,
                payload=_serialize_payload(payload),
            )
        ],
    )


def vector_search(
    query: str,
    top_k: int,
    filters: dict[str, Any],
    with_sources: bool,
) -> list[dict[str, Any]]:
    from embed import embed_text  # lazy import to avoid circular deps

    vector = embed_text(query)
    must_filters = []
    for key, value in filters.items():
        must_filters.append(
            rest.FieldCondition(key=key, match=rest.MatchValue(value=value))
        )

    result = qdrant.search(
        collection_name="memories",
        query_vector=vector,
        limit=top_k,
        with_payload=True,
        query_filter=rest.Filter(must=must_filters) if must_filters else None,
    )

    output: list[dict[str, Any]] = []
    for point in result:
        payload = point.payload or {}
        item = {
            "id": point.id,
            "score": point.score,
            "title": payload.get("title"),
            "text_snippet": (payload.get("text") or "")[:200],
            "tags": payload.get("tags", []),
        }
        if with_sources:
            item["payload"] = payload
        output.append(item)
    return output


def _serialize_payload(data: dict[str, Any]) -> dict[str, Any]:
    """
    Ensure payload is JSON-serializable for Qdrant.
    """
    serialized: dict[str, Any] = {}
    for key, value in data.items():
        if isinstance(value, (dict, list)):
            serialized[key] = value
        elif value is None:
            serialized[key] = value
        else:
            try:
                json.dumps(value)
                serialized[key] = value
            except TypeError:
                serialized[key] = str(value)
    return serialized


# Initialize storage on import for container startup
try:
    init()
except OperationalError:
    # Database may not be ready yet. Workers/API will retry on first use.
    pass

