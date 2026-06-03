"""Research / web search API."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from core.auth import get_current_user
from core.db import User
from services.research_service import DEFAULT_SEARCH_LIMIT, web_search

router = APIRouter(prefix="/api/research", tags=["research"])


class SearchRequest(BaseModel):
    query: str
    limit: int = Field(default=DEFAULT_SEARCH_LIMIT, ge=1, le=50)
    page: int = Field(default=1, ge=1)


@router.post("/search")
async def search(
    body: SearchRequest,
    user: Annotated[User, Depends(get_current_user)],
):
    return await web_search(body.query, body.limit, body.page)


@router.get("")
async def research_info(user: Annotated[User, Depends(get_current_user)]):
    return {
        "status": "ready",
        "message": "POST /api/research/search with {query}. Full deep-research pipeline (plan→synthesize) coming next.",
    }
