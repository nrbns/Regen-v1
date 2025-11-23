"""Operational readiness endpoints."""

from __future__ import annotations

import asyncio
import time
from typing import Dict, Tuple

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from apps.api.database import SessionLocal

router = APIRouter(tags=["health"])
_start_time = time.monotonic()


def _check_database() -> Tuple[bool, str | None]:
    try:
        with SessionLocal() as session:  # type: ignore[call-arg]
            session.execute(text("SELECT 1"))
        return True, None
    except Exception as exc:  # pragma: no cover - defensive
        return False, str(exc)


@router.get("/healthz")
async def liveness() -> Dict[str, float | str]:
    """Fast liveness probe used for container orchestration."""
    uptime = time.monotonic() - _start_time
    return {"status": "ok", "uptime_seconds": round(uptime, 2)}


@router.get("/readyz", responses={503: {"description": "Service not ready"}})
async def readiness(response: Response) -> Dict[str, object]:
    """Readiness probe that verifies dependent services."""
    loop = asyncio.get_running_loop()
    db_ok, db_error = await loop.run_in_executor(None, _check_database)

    checks = {
        "database": {
            "ok": db_ok,
            "error": db_error,
        }
    }
    all_ok = all(check["ok"] for check in checks.values())
    payload: Dict[str, object] = {
        "status": "ready" if all_ok else "degraded",
        "checks": checks,
        "uptime_seconds": round(time.monotonic() - _start_time, 2),
    }
    if not all_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return payload


