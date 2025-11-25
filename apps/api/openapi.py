"""Custom OpenAPI configuration and export helper."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi


def configure_openapi(app: FastAPI) -> None:
    """Attach a custom OpenAPI generator with optional file export."""

    def custom_openapi() -> dict[str, Any]:
        if app.openapi_schema:
            return app.openapi_schema

        schema = get_openapi(
            title="Regen API",
            version=app.version or "1.0.0",
            description=app.description or "REST + WebSocket API for Regen",
            routes=app.routes,
        )
        schema.setdefault("info", {}).setdefault("x-service", "regen-api")

        export_path = os.getenv("OPENAPI_EXPORT_PATH")
        if export_path:
            target = Path(export_path)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps(schema, indent=2), encoding="utf-8")

        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi  # type: ignore[assignment]


