"""Email & calendar — structured placeholders (IMAP/CalDAV planned)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from core.auth import get_current_user, require_admin
from core.db import User

router = APIRouter(tags=["integrations"])


@router.get("/api/email/accounts")
def email_accounts(user: Annotated[User, Depends(get_current_user)]):
    return {
        "status": "planned",
        "accounts": [],
        "message": "IMAP/SMTP multi-account sync — configure in a future release. Use Research + Chat for now.",
    }


@router.get("/api/calendar/events")
def calendar_events(user: Annotated[User, Depends(get_current_user)]):
    return {
        "status": "planned",
        "events": [],
        "message": "CalDAV sync + .ics import — coming soon. Docker includes Radicale-friendly docs in README.",
    }


@router.get("/api/admin/health")
def admin_health(user: Annotated[User, Depends(require_admin)]):
    return {"status": "ok", "app": "LocalLLM", "admin": True}
