"""Security middleware: CSP nonces, rate limiting hooks."""

from __future__ import annotations

import secrets
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from core.config import get_settings


class NoCacheStaticMiddleware(BaseHTTPMiddleware):
    """Prevent browsers from serving stale JS after updates."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        path = request.url.path
        if path == "/" or path.endswith(".html") or path.endswith(".js") or path.startswith("/static/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        return response


class CSPNonceMiddleware(BaseHTTPMiddleware):
    """Attach a per-request CSP nonce for inline scripts in HTML pages."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        nonce = secrets.token_urlsafe(16)
        request.state.csp_nonce = nonce
        response = await call_next(request)
        if request.url.path in ("/", "/login") or request.url.path.endswith(".html"):
            settings = get_settings()
            csp = (
                f"default-src 'self'; "
                f"script-src 'self' 'nonce-{nonce}' https://cdn.jsdelivr.net; "
                f"style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                f"img-src 'self' data: blob:; "
                f"connect-src 'self'; "
                f"font-src 'self' https://cdn.jsdelivr.net; "
                f"frame-ancestors 'none';"
            )
            response.headers["Content-Security-Policy"] = csp
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
        return response
