"""OpenTelemetry bootstrap for the API service."""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI

try:
    from opentelemetry import trace
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.logging import LoggingInstrumentor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
except Exception:  # pragma: no cover - optional dependency
    trace = None  # type: ignore[assignment]
    FastAPIInstrumentor = None  # type: ignore[misc]
    LoggingInstrumentor = None  # type: ignore[misc]
    Resource = None  # type: ignore[misc]
    TracerProvider = None  # type: ignore[misc]
    BatchSpanProcessor = None  # type: ignore[misc]
    ConsoleSpanExporter = None  # type: ignore[misc]

_logger = logging.getLogger(__name__)
_telemetry_started = False


def init_telemetry(app: FastAPI) -> None:
    """Initialize tracing if OpenTelemetry is available."""

    global _telemetry_started
    if _telemetry_started:
        return

    if not all([trace, FastAPIInstrumentor, LoggingInstrumentor, Resource, TracerProvider]):
        _logger.warning("OpenTelemetry packages not installed; skipping tracing setup")
        return

    service_name = os.getenv("OTEL_SERVICE_NAME", "omnibrowser-api")
    resource = Resource.create({"service.name": service_name, "service.version": app.version or "1.0.0"})
    provider = TracerProvider(resource=resource)
    exporter = ConsoleSpanExporter()
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app, tracer_provider=provider)
    LoggingInstrumentor().instrument(set_logging_format=True)

    _telemetry_started = True
    _logger.info("OpenTelemetry tracing initialized with service.name=%s", service_name)


