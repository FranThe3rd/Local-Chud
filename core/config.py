"""Application configuration from environment."""

from __future__ import annotations

import os
import secrets
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATA = ROOT / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "local chud"
    secret_key: str = ""
    data_dir: Path = DEFAULT_DATA
    database_url: str = ""

    auth_enabled: bool = True
    auto_login: bool = False  # local dev: skip login form when request is from localhost
    session_max_age: int = 604800
    rate_limit_per_minute: int = 120

    ollama_base_url: str = "http://127.0.0.1:11434"
    chroma_url: str = "http://127.0.0.1:8000"
    searxng_url: str = "http://127.0.0.1:8080"
    ntfy_url: str = "http://127.0.0.1:8090"

    default_model: str = "llama3.2:latest"
    default_provider: str = "ollama"

    def resolved_secret_key(self) -> str:
        if self.secret_key:
            return self.secret_key
        key_file = self.data_dir / ".secret_key"
        if key_file.exists():
            return key_file.read_text().strip()
        key = secrets.token_hex(32)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        key_file.write_text(key)
        return key

    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        db_path = self.data_dir / "app.db"
        return f"sqlite:///{db_path}"


@lru_cache
def get_settings() -> Settings:
    data_env = (
        os.getenv("LOCALCHUD_DATA_DIR")
        or os.getenv("KEELHOUSE_DATA_DIR")
        or os.getenv("BETTERCHATBOTS_DATA_DIR")
    )
    s = Settings()
    if data_env:
        s.data_dir = Path(data_env)
    return s
