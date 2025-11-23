"""Request ID middleware to ensure every request is traceable."""

from __future__ import annotations

import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from apps.api import logging_config


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Sets/propagates the X-Request-Id header and exposes it to log records."""

    header_name = "X-Request-Id"

    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:
        request_id = request.headers.get(self.header_name) or str(uuid.uuid4())
        request.state.request_id = request_id
        logging_config.set_request_id(request_id)

        response: Response | None = None
        try:
            response = await call_next(request)
        finally:
            logging_config.clear_request_id()

        if response is None:
            response = Response()
        response.headers[self.header_name] = request_id
        return response


