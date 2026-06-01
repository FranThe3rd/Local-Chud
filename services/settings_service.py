"""Persisted app settings (LLM providers, models, etc.)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from core.config import get_settings
from core.db import AppSettings

SETTINGS_KEY = "llm"

NATIVE_OLLAMA_URL = "http://127.0.0.1:11434"


def normalize_ollama_base_url(url: str) -> str:
    """Docker .env URLs don't work for native ./run.sh — use localhost."""
    u = (url or "").strip().rstrip("/")
    if not u:
        return NATIVE_OLLAMA_URL
    if "host.docker.internal" in u or u.startswith("http://chroma"):
        return NATIVE_OLLAMA_URL
    return u


def get_llm_settings(db: Session) -> dict[str, Any]:
    row = db.query(AppSettings).filter(AppSettings.key == SETTINGS_KEY).first()
    defaults = {
        "provider": get_settings().default_provider,
        "model": get_settings().default_model or "llama3.2:latest",
        "base_url": normalize_ollama_base_url(get_settings().ollama_base_url),
        "api_key": "",
        "openai_compatible": True,
    }
    if not row:
        return defaults
    data = row.as_dict()
    merged = {**defaults, **data}
    merged["base_url"] = normalize_ollama_base_url(str(merged.get("base_url", "")))
    return merged


def save_llm_settings(db: Session, data: dict[str, Any]) -> dict[str, Any]:
    row = db.query(AppSettings).filter(AppSettings.key == SETTINGS_KEY).first()
    if not row:
        row = AppSettings(key=SETTINGS_KEY, value="{}")
        db.add(row)
    current = row.as_dict()
    current.update({k: v for k, v in data.items() if k in ("provider", "model", "base_url", "api_key", "openai_compatible")})
    if "base_url" in current:
        current["base_url"] = normalize_ollama_base_url(str(current["base_url"]))
    row.value = json.dumps(current)
    db.commit()
    return current
