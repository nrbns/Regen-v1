"""Centralized logging configuration for the API service."""

from __future__ import annotations

import logging
from logging.config import dictConfig
from typing import Any, Dict
from contextvars import ContextVar

_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    """Injects the current request ID into log records."""

    def filter(self, record: logging.LogRecord) -> bool:  # type: ignore[override]
        record.request_id = _request_id_ctx.get("-")
        return True


def set_request_id(request_id: str) -> None:
    _request_id_ctx.set(request_id)


def clear_request_id() -> None:
    _request_id_ctx.set("-")


def configure_logging(level: str | None = None) -> None:
    """Configure structured logging with request correlation."""

    log_level = level or "INFO"
    config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "request_id": {
                "()": RequestIdFilter,
            }
        },
        "formatters": {
            "default": {
                "format": "%(levelname)s [%(name)s] [request-id=%(request_id)s] %(message)s",
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
                "filters": ["request_id"],
            }
        },
        "loggers": {
            "uvicorn": {"handlers": ["console"], "level": log_level, "propagate": False},
            "uvicorn.error": {"handlers": ["console"], "level": log_level, "propagate": False},
            "uvicorn.access": {"handlers": ["console"], "level": log_level, "propagate": False},
            "apps": {"handlers": ["console"], "level": log_level, "propagate": False},
        },
        "root": {
            "handlers": ["console"],
            "level": log_level,
        },
    }

    dictConfig(config)


