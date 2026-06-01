"""
local chud — self-hosted, local-first AI workspace.
MIT License. FastAPI monolith serving vanilla-JS frontend.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from core.auth import (
    SESSION_COOKIE,
    auto_login_enabled,
    get_user_id_from_token,
    login_admin_user,
    set_session_cookie,
)
from core.config import get_settings
from core.db import get_db, init_db
from core.middleware import CSPNonceMiddleware, NoCacheStaticMiddleware

ASSETS_V = "22"
from routes import (
    auth,
    chat,
    compare,
    cookbook,
    documents,
    integrations,
    memory,
    research,
    sessions,
    settings,
    tasks,
)
from services.user_service import ensure_admin_user

logger = logging.getLogger("localchud")
logging.basicConfig(level=logging.INFO)

STATIC = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    (settings.data_dir / "uploads").mkdir(exist_ok=True)
    (settings.data_dir / "memory").mkdir(exist_ok=True)
    init_db()

    from sqlalchemy.orm import Session

    from services.settings_service import NATIVE_OLLAMA_URL, get_llm_settings, save_llm_settings

    db_gen = get_db()
    db: Session = next(db_gen)
    try:
        cfg = get_llm_settings(db)
        if "host.docker.internal" in str(cfg.get("base_url", "")):
            save_llm_settings(
                db,
                {"base_url": NATIVE_OLLAMA_URL, "model": cfg.get("model") or "llama3.2:latest"},
            )
            logger.info("Fixed Ollama URL for native run: %s", NATIVE_OLLAMA_URL)
        temp = ensure_admin_user(db)
        if temp:
            print("\n" + "=" * 60)
            print("local chud — first boot — admin created")
            print(f"   Username: admin")
            print(f"   Temp password: {temp}")
            print("   Change this after logging in!")
            print("=" * 60 + "\n")
    finally:
        db.close()
        try:
            next(db_gen)
        except StopIteration:
            pass

    yield


limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

app = FastAPI(
    title="local chud",
    description="Privacy-first homelab AI workspace",
    version="0.1.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(CSPNonceMiddleware)
app.add_middleware(NoCacheStaticMiddleware)

app.include_router(auth.router)
app.include_router(settings.router)
app.include_router(sessions.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(memory.router)
app.include_router(tasks.router)
app.include_router(research.router)
app.include_router(compare.router)
app.include_router(cookbook.router)
app.include_router(integrations.router)

if STATIC.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")


@app.get("/health")
def health():
    return {"status": "ok", "app": "local chud"}


def _maybe_auto_login(request: Request, db: Session, redirect_to: str = "/") -> RedirectResponse | None:
    if not auto_login_enabled(request):
        return None
    token = request.cookies.get(SESSION_COOKIE)
    if get_user_id_from_token(token):
        return None
    admin_token = login_admin_user(db)
    if not admin_token:
        return None
    resp = RedirectResponse(url=redirect_to, status_code=302)
    set_session_cookie(resp, admin_token)
    return resp


@app.get("/login")
async def login_page(request: Request, db: Session = Depends(get_db)):
    auto = _maybe_auto_login(request, db, redirect_to="/")
    if auto:
        return auto
    path = STATIC / "login.html"
    if not path.exists():
        return HTMLResponse("<h1>Login</h1><p>login.html missing</p>")
    html = path.read_text()
    nonce = getattr(request.state, "csp_nonce", "")
    html = html.replace("{{CSP_NONCE}}", nonce)
    html = html.replace("{{ASSETS_V}}", ASSETS_V)
    return HTMLResponse(html)


@app.get("/")
async def index_page(request: Request, db: Session = Depends(get_db)):
    cfg = get_settings()
    if cfg.auth_enabled:
        token = request.cookies.get(SESSION_COOKIE)
        if not get_user_id_from_token(token):
            auto = _maybe_auto_login(request, db, redirect_to="/")
            if auto:
                return auto
            return RedirectResponse(url="/login", status_code=302)

    path = STATIC / "index.html"
    if not path.exists():
        return HTMLResponse("<h1>local chud</h1><p>index.html missing</p>")
    html = path.read_text()
    nonce = getattr(request.state, "csp_nonce", "")
    html = html.replace("{{CSP_NONCE}}", nonce)
    html = html.replace("{{ASSETS_V}}", ASSETS_V)
    return HTMLResponse(html)


@app.get("/manifest.json")
def manifest():
    p = STATIC / "manifest.json"
    if p.exists():
        return FileResponse(p, media_type="application/json")
    return {"name": "local chud"}


@app.get("/sw.js")
def service_worker():
    p = STATIC / "sw.js"
    if p.exists():
        return FileResponse(p, media_type="application/javascript")
    return HTMLResponse("// no sw", media_type="application/javascript")
