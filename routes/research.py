"""Research / web search API."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.auth import get_current_user
from core.db import User
from services.research_service import web_search

router = APIRouter(prefix="/api/research", tags=["research"])


class SearchRequest(BaseModel):
    query: str
    limit: int = 8


@router.post("/search")
async def search(
    body: SearchRequest,
    user: Annotated[User, Depends(get_current_user)],
):
    return await web_search(body.query, body.limit)


@router.get("")
async def research_info(user: Annotated[User, Depends(get_current_user)]):
    return {
        "status": "ready",
        "message": "POST /api/research/search with {query}. Full deep-research pipeline (plan→synthesize) coming next.",
    }
