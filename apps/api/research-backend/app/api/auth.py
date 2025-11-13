"""
Authentication Middleware (placeholder)
"""

from fastapi import Request, HTTPException
from app.core.config import settings


async def verify_api_key(request: Request):
    """Verify API key from header"""
    api_key = request.headers.get(settings.API_KEY_HEADER)
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required")
    # TODO: Implement actual API key verification
    return True

