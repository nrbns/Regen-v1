import json
import logging
import os
import time
from datetime import datetime, timezone

import redis

from embed import embed_text
from db import insert_memory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("embed-worker")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
STREAM_KEY = os.getenv("EMBED_STREAM", "memory:queue")
GROUP_NAME = os.getenv("EMBED_GROUP", "embed-workers")
CONSUMER_NAME = os.getenv("HOSTNAME", "consumer-1")

r = redis.Redis.from_url(REDIS_URL)


def ensure_group() -> None:
    try:
        r.xgroup_create(STREAM_KEY, GROUP_NAME, id="0-0", mkstream=True)
    except redis.ResponseError as err:
        if "BUSYGROUP" not in str(err):
            raise


def process_message(message_id: str, fields: dict[str, bytes]) -> None:
    def _decode(key: bytes, default: str = "") -> str:
        value = fields.get(key, b"")
        return value.decode("utf-8") if value else default

    text = _decode(b"text")
    if not text:
        logger.warning("Skipping message %s without text field", message_id)
        return

    embedding = embed_text(text)

    required_fields = {
        "id": _decode(b"id"),
        "tenant_id": _decode(b"tenant_id"),
        "user_id": _decode(b"user_id"),
        "project": _decode(b"project"),
    }
    if not all(required_fields.values()):
        logger.warning("Skipping message %s missing identifiers", message_id)
        return

    created_at_raw = _decode(b"created_at")
    try:
        created_at = (
            datetime.fromisoformat(created_at_raw)
            if created_at_raw
            else datetime.now(timezone.utc)
        )
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        else:
            created_at = created_at.astimezone(timezone.utc)
    except ValueError:
        created_at = datetime.now(timezone.utc)

    payload = {
        **required_fields,
        "type": _decode(b"type", "tab"),
        "title": _decode(b"title") or None,
        "mode": _decode(b"mode") or None,
        "text": text,
        "tags": json.loads(_decode(b"tags", "[]")),
        "origin": json.loads(_decode(b"origin", "null")),
        "rich": json.loads(_decode(b"rich", "null")),
        "acl": json.loads(_decode(b"acl", "null")),
        "pii": json.loads(_decode(b"pii", "null")),
        "embedding": embedding,
        "created_at": created_at,
    }

    insert_memory(**payload)
    logger.info("Processed memory %s", payload["id"])


def loop() -> None:
    ensure_group()
    logger.info("Embed worker listening on stream %s", STREAM_KEY)
    while True:
        try:
            resp = r.xreadgroup(
                GROUP_NAME,
                CONSUMER_NAME,
                {STREAM_KEY: ">"},
                count=10,
                block=5000,
            )
            if not resp:
                continue
            for _, messages in resp:
                for message_id, fields in messages:
                    try:
                        process_message(message_id, fields)
                        r.xack(STREAM_KEY, GROUP_NAME, message_id)
                    except Exception as exc:  # pragma: no cover
                        logger.exception("Failed to process %s: %s", message_id, exc)
        except redis.RedisError as exc:  # pragma: no cover
            logger.exception("Redis error: %s", exc)
            time.sleep(5)


if __name__ == "__main__":
    loop()

